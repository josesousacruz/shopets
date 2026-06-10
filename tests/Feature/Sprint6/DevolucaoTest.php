<?php

namespace Tests\Feature\Sprint6;

use App\Mail\DevolucaoSolicitada;
use App\Models\Cliente;
use App\Models\PagamentoPedido;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DevolucaoTest extends TestCase
{
    use RefreshDatabase;

    private function pedidoEntregue(Cliente $cliente, string $entregueEm = '-2 days'): Pedido
    {
        $produto = Produto::factory()->create(['estoque_atual' => 10, 'preco_venda' => 40]);
        $pedido = Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => $cliente->id_cliente,
            'status' => 'entregue',
            'modalidade' => 'entrega',
            'subtotal' => 80, 'frete' => 0, 'desconto' => 0, 'total' => 80,
            'entregue_em' => now()->parse($entregueEm),
        ]);
        $pedido->itens()->create([
            'id_produto' => $produto->id_produto, 'id_variacao' => null,
            'nome' => $produto->nome, 'sku' => $produto->codigo_interno,
            'preco_unit' => 40, 'quantidade' => 2, 'subtotal' => 80,
        ]);

        return $pedido->fresh();
    }

    public function test_cliente_solicita_devolucao_dentro_do_prazo(): void
    {
        Mail::fake();
        $cliente = Cliente::factory()->create();
        $pedido = $this->pedidoEntregue($cliente, '-2 days');
        $item = $pedido->itens()->first();

        Sanctum::actingAs($cliente);

        $this->postJson("/api/v1/pedidos/{$pedido->numero}/devolucao", [
            'motivo' => 'Não gostei do produto.',
            'itens' => [['id_pedido_item' => $item->id_pedido_item, 'quantidade' => 1]],
        ])->assertCreated()->assertJsonPath('data.status', 'solicitada');

        $this->assertDatabaseHas('devolucoes_pedido', [
            'id_pedido' => $pedido->id_pedido,
            'id_cliente' => $cliente->id_cliente,
            'status' => 'solicitada',
        ]);
        Mail::assertQueued(DevolucaoSolicitada::class);
    }

    public function test_devolucao_fora_do_prazo_rejeitada(): void
    {
        $cliente = Cliente::factory()->create();
        $pedido = $this->pedidoEntregue($cliente, '-30 days');
        $item = $pedido->itens()->first();

        Sanctum::actingAs($cliente);

        $this->postJson("/api/v1/pedidos/{$pedido->numero}/devolucao", [
            'motivo' => 'tarde',
            'itens' => [['id_pedido_item' => $item->id_pedido_item, 'quantidade' => 1]],
        ])->assertStatus(422);
    }

    public function test_nao_solicita_devolucao_de_pedido_de_outro_cliente(): void
    {
        $dono = Cliente::factory()->create();
        $outro = Cliente::factory()->create();
        $pedido = $this->pedidoEntregue($dono, '-1 days');
        $item = $pedido->itens()->first();

        Sanctum::actingAs($outro);

        $this->postJson("/api/v1/pedidos/{$pedido->numero}/devolucao", [
            'motivo' => 'x',
            'itens' => [['id_pedido_item' => $item->id_pedido_item, 'quantidade' => 1]],
        ])->assertStatus(404);
    }

    public function test_admin_lista_e_transiciona_devolucao(): void
    {
        $cliente = Cliente::factory()->create();
        $pedido = $this->pedidoEntregue($cliente, '-1 days');
        $item = $pedido->itens()->first();

        $dev = \App\Models\DevolucaoPedido::create([
            'id_pedido' => $pedido->id_pedido,
            'id_cliente' => $cliente->id_cliente,
            'motivo' => 'teste',
            'status' => 'solicitada',
        ]);
        $dev->itens()->create(['id_pedido_item' => $item->id_pedido_item, 'quantidade' => 1]);

        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));

        $this->getJson('/api/v1/painel/devolucoes')
            ->assertOk()
            ->assertJsonFragment(['status' => 'solicitada']);

        $this->putJson("/api/v1/painel/devolucoes/{$dev->id_devolucao}/aprovar")
            ->assertOk()->assertJsonPath('data.status', 'aprovada');
        $this->putJson("/api/v1/painel/devolucoes/{$dev->id_devolucao}/receber")
            ->assertOk()->assertJsonPath('data.status', 'recebida');
    }

    public function test_reembolsar_chama_estorno_e_marca_reembolsada(): void
    {
        $cliente = Cliente::factory()->create();
        $produto = Produto::factory()->create(['estoque_atual' => 5, 'preco_venda' => 40]);
        $pedido = Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => $cliente->id_cliente,
            'status' => 'entregue', 'modalidade' => 'entrega',
            'subtotal' => 80, 'frete' => 0, 'desconto' => 0, 'total' => 80,
            'entregue_em' => now()->subDay(),
        ]);
        $item = $pedido->itens()->create([
            'id_produto' => $produto->id_produto, 'id_variacao' => null,
            'nome' => $produto->nome, 'sku' => $produto->codigo_interno,
            'preco_unit' => 40, 'quantidade' => 2, 'subtotal' => 80,
        ]);
        PagamentoPedido::create([
            'id_pedido' => $pedido->id_pedido, 'gateway' => 'fake',
            'gateway_id_externo' => 'fake_pay_1', 'metodo' => 'pix',
            'status' => 'aprovado', 'valor' => 80,
        ]);

        $dev = \App\Models\DevolucaoPedido::create([
            'id_pedido' => $pedido->id_pedido, 'id_cliente' => $cliente->id_cliente,
            'motivo' => 'teste', 'status' => 'recebida',
        ]);
        $dev->itens()->create(['id_pedido_item' => $item->id_pedido_item, 'quantidade' => 2]);

        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));

        $this->putJson("/api/v1/painel/devolucoes/{$dev->id_devolucao}/reembolsar")
            ->assertOk()->assertJsonPath('data.status', 'reembolsada');

        $this->assertSame('reembolsada', $dev->fresh()->status);
        $this->assertEquals(80.0, (float) $dev->fresh()->valor_reembolso);
        // FakePaymentGateway::estornar marca o pagamento como estornado.
        $this->assertDatabaseHas('pagamentos_pedido', [
            'id_pedido' => $pedido->id_pedido,
            'status' => 'estornado',
        ]);
    }
}
