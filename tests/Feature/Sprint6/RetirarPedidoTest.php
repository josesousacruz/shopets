<?php

namespace Tests\Feature\Sprint6;

use App\Models\Cliente;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\ReservaEstoque;
use App\Models\User;
use Database\Seeders\EcommerceInfraSeeder;
use Database\Seeders\FormasPagamentoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RetirarPedidoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FormasPagamentoSeeder::class);
        $this->seed(EcommerceInfraSeeder::class);
    }

    private function pedidoNaRetirada(int $estoque = 10, int $qtd = 2, float $preco = 30): array
    {
        $cliente = Cliente::factory()->create();
        $produto = Produto::factory()->create(['estoque_atual' => $estoque, 'preco_venda' => $preco]);

        $pedido = Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => $cliente->id_cliente,
            'status' => 'aguardando_retirada',
            'modalidade' => 'retirada',
            'pagamento_modo' => 'na_retirada',
            'subtotal' => $preco * $qtd,
            'frete' => 0,
            'desconto' => 0,
            'total' => $preco * $qtd,
        ]);

        $pedido->itens()->create([
            'id_produto' => $produto->id_produto,
            'id_variacao' => null,
            'nome' => $produto->nome,
            'sku' => $produto->codigo_interno,
            'preco_unit' => $preco,
            'quantidade' => $qtd,
            'subtotal' => $preco * $qtd,
        ]);

        ReservaEstoque::create([
            'id_pedido' => $pedido->id_pedido,
            'id_produto' => $produto->id_produto,
            'id_variacao' => null,
            'quantidade' => $qtd,
            'expira_em' => now()->addMinutes(15),
        ]);

        return [$pedido->fresh(), $produto];
    }

    public function test_retirar_na_retirada_cria_venda_baixa_estoque_e_entrega(): void
    {
        [$pedido, $produto] = $this->pedidoNaRetirada(estoque: 10, qtd: 2);

        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));

        $this->postJson("/api/v1/painel/pedidos/{$pedido->numero}/retirar", [
            'forma_pagamento' => 'dinheiro',
        ])->assertOk()->assertJsonPath('data.status', 'entregue');

        $pedido->refresh();
        $this->assertSame('entregue', $pedido->status);
        $this->assertNotNull($pedido->id_venda);
        $this->assertEquals(8, $produto->fresh()->estoque_atual);
        $this->assertDatabaseHas('pagamentos_pedido', [
            'id_pedido' => $pedido->id_pedido,
            'gateway' => 'retirada_loja',
            'metodo' => 'dinheiro',
            'status' => 'aprovado',
        ]);
    }

    public function test_retirar_pedido_ja_pago_online_apenas_finaliza(): void
    {
        // Pedido pago online: já tem venda + estoque baixado; retirar só confirma.
        $cliente = Cliente::factory()->create();
        $produto = Produto::factory()->create(['estoque_atual' => 10, 'preco_venda' => 30]);

        $pedido = Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => $cliente->id_cliente,
            'status' => 'pago',
            'modalidade' => 'retirada',
            'pagamento_modo' => 'online',
            'subtotal' => 60, 'frete' => 0, 'desconto' => 0, 'total' => 60,
        ]);
        $pedido->itens()->create([
            'id_produto' => $produto->id_produto, 'id_variacao' => null,
            'nome' => $produto->nome, 'sku' => $produto->codigo_interno,
            'preco_unit' => 30, 'quantidade' => 2, 'subtotal' => 60,
        ]);
        \App\Models\PagamentoPedido::create([
            'id_pedido' => $pedido->id_pedido, 'gateway' => 'fake',
            'gateway_id_externo' => 'fake_x', 'metodo' => 'pix',
            'status' => 'aprovado', 'valor' => 60,
        ]);

        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));

        $this->postJson("/api/v1/painel/pedidos/{$pedido->numero}/retirar")
            ->assertOk()->assertJsonPath('data.status', 'entregue');

        $this->assertSame('entregue', $pedido->fresh()->status);
    }

    public function test_retirar_idempotente_quando_ja_entregue(): void
    {
        [$pedido] = $this->pedidoNaRetirada();
        $pedido->update(['status' => 'entregue']);

        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));

        $this->postJson("/api/v1/painel/pedidos/{$pedido->numero}/retirar", ['forma_pagamento' => 'dinheiro'])
            ->assertOk()->assertJsonPath('data.status', 'entregue');

        $this->assertSame(0, \App\Models\PagamentoPedido::where('id_pedido', $pedido->id_pedido)->count());
    }
}
