<?php

namespace Tests\Feature\Painel;

use App\Mail\PedidoRastreioAtualizado;
use App\Models\Cliente;
use App\Models\ContaReceber;
use App\Models\PagamentoPedido;
use App\Models\Pedido;
use App\Models\PontoVenda;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PedidoRefinementsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);
        PontoVenda::create(['nome_pdv' => 'Loja', 'ativo' => true]);
    }

    private function pedido(string $status = 'aguardando_pagamento', float $total = 100): Pedido
    {
        $cliente = Cliente::factory()->create(['email' => 'cliente@x.com']);

        return Pedido::create([
            'numero' => 'PED-'.uniqid(),
            'id_cliente' => $cliente->id_cliente,
            'status' => $status,
            'modalidade' => 'entrega',
            'total' => $total,
        ]);
    }

    public function test_atualiza_rastreio_e_notifica(): void
    {
        Mail::fake();
        $pedido = $this->pedido();

        $this->putJson("/api/v1/painel/pedidos/{$pedido->numero}/rastreio", [
            'codigo_rastreio' => 'BR123456789SP',
        ])->assertOk()->assertJsonPath('data.codigo_rastreio', 'BR123456789SP');

        $this->assertSame('BR123456789SP', $pedido->fresh()->codigo_rastreio);
        $this->assertDatabaseHas('pedido_eventos', ['id_pedido' => $pedido->id_pedido, 'tipo' => 'rastreio_atualizado']);
        Mail::assertQueued(PedidoRastreioAtualizado::class);
    }

    public function test_chat_enviar_e_listar(): void
    {
        $pedido = $this->pedido();

        $this->postJson("/api/v1/painel/pedidos/{$pedido->numero}/mensagens", ['texto' => 'Pedido em preparação'])
            ->assertCreated();

        $this->getJson("/api/v1/painel/pedidos/{$pedido->numero}/mensagens")
            ->assertOk()
            ->assertJsonPath('data.0.texto', 'Pedido em preparação')
            ->assertJsonPath('data.0.autor_tipo', 'admin');
    }

    public function test_cancelar_pago_estorna_e_reverte_ar(): void
    {
        $pedido = $this->pedido();
        $pedido->update(['status' => 'pago', 'pago_em' => now()]); // observer cria ContaReceber

        PagamentoPedido::create([
            'id_pedido' => $pedido->id_pedido,
            'gateway' => 'fake',
            'gateway_id_externo' => 'FAKE-123',
            'metodo' => 'pix',
            'status' => 'aprovado',
            'valor' => 100,
        ]);

        $r = $this->postJson("/api/v1/painel/pedidos/{$pedido->numero}/cancelar", ['motivo' => 'Cliente desistiu'])
            ->assertOk();

        $this->assertSame('cancelado', $r->json('data.status'));
        $this->assertTrue($r->json('data.estorno.ok'));

        $this->assertDatabaseHas('pagamentos_pedido', ['gateway_id_externo' => 'FAKE-123', 'status' => 'estornado']);
        $this->assertDatabaseHas('contas_receber', ['observacoes' => 'Pedido #'.$pedido->id_pedido, 'status' => 'cancelado']);
        $this->assertDatabaseHas('pedido_eventos', ['id_pedido' => $pedido->id_pedido, 'tipo' => 'estorno']);
    }

    public function test_cancelar_exige_motivo(): void
    {
        $pedido = $this->pedido();
        $this->postJson("/api/v1/painel/pedidos/{$pedido->numero}/cancelar", [])
            ->assertStatus(422)->assertJsonValidationErrors('motivo');
    }

    public function test_gera_etiqueta_pdf(): void
    {
        Storage::fake('public');
        $pedido = $this->pedido();

        $r = $this->postJson("/api/v1/painel/pedidos/{$pedido->numero}/etiqueta")->assertOk();

        $this->assertStringContainsString('etiquetas/', $r->json('data.etiqueta_url'));
        Storage::disk('public')->assertExists("etiquetas/{$pedido->numero}.pdf");
        $this->assertDatabaseHas('pedido_eventos', ['id_pedido' => $pedido->id_pedido, 'tipo' => 'etiqueta_gerada']);
    }
}
