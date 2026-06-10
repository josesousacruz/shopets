<?php

namespace Tests\Feature\Painel;

use App\Models\Cliente;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PedidoAdminTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $user = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($user);

        return $user;
    }

    private function pedido(string $status): Pedido
    {
        $cliente = Cliente::factory()->create();

        return Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => $cliente->id_cliente,
            'status' => $status,
            'modalidade' => 'entrega',
            'subtotal' => 20,
            'frete' => 0,
            'desconto' => 0,
            'total' => 20,
        ]);
    }

    public function test_lista_todos_os_pedidos(): void
    {
        $this->admin();
        $this->pedido('pago');
        $this->pedido('aguardando_pagamento');

        $this->getJson('/api/v1/painel/pedidos')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['data', 'meta', 'status_options']);
    }

    public function test_transicao_valida_pago_para_separacao(): void
    {
        $this->admin();
        $pedido = $this->pedido('pago');

        $this->postJson("/api/v1/painel/pedidos/{$pedido->numero}/separacao")
            ->assertOk()
            ->assertJsonPath('data.status', 'em_separacao');

        $this->assertDatabaseHas('pedido_eventos', [
            'id_pedido' => $pedido->id_pedido,
            'tipo' => 'em_separacao',
        ]);
    }

    public function test_enviar_grava_codigo_rastreio(): void
    {
        $this->admin();
        $pedido = $this->pedido('em_separacao');

        $this->postJson("/api/v1/painel/pedidos/{$pedido->numero}/enviar", [
            'codigo_rastreio' => 'BR123',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'enviado')
            ->assertJsonPath('data.codigo_rastreio', 'BR123');
    }

    public function test_transicao_invalida_e_rejeitada(): void
    {
        $this->admin();
        $pedido = $this->pedido('aguardando_pagamento');

        // aguardando_pagamento não pode ir direto para enviado
        $this->postJson("/api/v1/painel/pedidos/{$pedido->numero}/entregar")
            ->assertStatus(422);

        $this->assertSame('aguardando_pagamento', $pedido->fresh()->status);
    }

    public function test_show_traz_detalhe(): void
    {
        $this->admin();
        $pedido = $this->pedido('pago');

        $this->getJson("/api/v1/painel/pedidos/{$pedido->numero}")
            ->assertOk()
            ->assertJsonPath('data.numero', $pedido->numero)
            ->assertJsonPath('data.status', 'pago');
    }
}
