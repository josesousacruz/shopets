<?php

namespace Tests\Feature\Fiscal;

use App\Models\Cliente;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RevisaoFiscalAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
    }

    private function pedidoEmRevisao(): Pedido
    {
        $cliente = Cliente::factory()->create(['nome' => 'Fulano']);
        $pedido = Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => $cliente->id_cliente,
            'status' => 'aguardando_revisao_fiscal',
            'modalidade' => 'entrega',
            'subtotal' => 100,
            'frete' => 0,
            'desconto' => 0,
            'total' => 100,
        ]);
        $pedido->eventos()->create([
            'tipo' => 'revisao_fiscal',
            'descricao' => 'Emissão fiscal pendente de revisão: Configuração fiscal incompleta.',
            'criado_em' => now(),
        ]);

        return $pedido;
    }

    public function test_lista_pedidos_em_revisao_com_motivo(): void
    {
        $this->pedidoEmRevisao();
        Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => Cliente::factory()->create()->id_cliente,
            'status' => 'pago',
            'modalidade' => 'entrega',
            'subtotal' => 50,
            'frete' => 0,
            'desconto' => 0,
            'total' => 50,
        ]);

        $r = $this->getJson('/api/v1/painel/revisao-fiscal')->assertOk();

        $this->assertCount(1, $r->json('data'));
        $this->assertSame('Fulano', $r->json('data.0.cliente'));
        $this->assertStringContainsString('Configuração fiscal incompleta', $r->json('data.0.motivo'));
    }

    public function test_reemitir_sem_venda_associada_mantem_em_revisao(): void
    {
        $pedido = $this->pedidoEmRevisao();

        $r = $this->postJson("/api/v1/painel/revisao-fiscal/{$pedido->numero}/reemitir")->assertOk();

        // Sem id_venda, o job nem tenta emitir — pedido continua como estava.
        $this->assertFalse($r->json('data.resolvido'));
        $this->assertSame('aguardando_revisao_fiscal', $pedido->fresh()->status);
    }

    public function test_reemitir_pedido_que_nao_esta_em_revisao_da_404(): void
    {
        $pedido = Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => Cliente::factory()->create()->id_cliente,
            'status' => 'pago',
            'modalidade' => 'entrega',
            'subtotal' => 50,
            'frete' => 0,
            'desconto' => 0,
            'total' => 50,
        ]);

        $this->postJson("/api/v1/painel/revisao-fiscal/{$pedido->numero}/reemitir")->assertStatus(404);
    }
}
