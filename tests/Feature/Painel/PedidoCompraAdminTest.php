<?php

namespace Tests\Feature\Painel;

use App\Models\Deposito;
use App\Models\EstoqueSaldo;
use App\Models\Fornecedor;
use App\Models\PontoVenda;
use App\Models\ProdutoVariacao;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PedidoCompraAdminTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected PontoVenda $pdv;
    protected Deposito $deposito;
    protected Fornecedor $fornecedor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);

        $this->pdv = PontoVenda::create(['nome_pdv' => 'Loja Central', 'ativo' => true]);
        $this->deposito = Deposito::create([
            'nome' => 'Depósito Central',
            'default' => true,
            'ativo' => true,
            'ponto_venda_id' => $this->pdv->id_pdv,
        ]);
        $this->fornecedor = Fornecedor::create(['nome' => 'ACME Distribuidora', 'ativo' => true]);
    }

    private function variacao(): ProdutoVariacao
    {
        return ProdutoVariacao::factory()->create();
    }

    private function criarPedido(ProdutoVariacao $v, int $qtd = 10, float $custo = 5.0, array $over = []): array
    {
        $payload = array_merge([
            'fornecedor_id' => $this->fornecedor->id_fornecedor,
            'deposito_id' => $this->deposito->id,
            'itens' => [
                ['produto_variacao_id' => $v->id_variacao, 'qtd' => $qtd, 'custo_unit' => $custo],
            ],
        ], $over);

        return $this->postJson('/api/v1/painel/compras', $payload)->json('data');
    }

    public function test_cria_pedido_rascunho_com_totais(): void
    {
        $v = $this->variacao();
        $r = $this->postJson('/api/v1/painel/compras', [
            'fornecedor_id' => $this->fornecedor->id_fornecedor,
            'deposito_id' => $this->deposito->id,
            'frete' => 20,
            'desconto' => 5,
            'itens' => [
                ['produto_variacao_id' => $v->id_variacao, 'qtd' => 10, 'custo_unit' => 5],
            ],
        ])->assertCreated();

        $this->assertSame('rascunho', $r->json('data.status'));
        $this->assertSame('50.00', $r->json('data.subtotal'));
        $this->assertSame('65.00', $r->json('data.total')); // 50 + 20 - 5
        $this->assertStringStartsWith('PC-', $r->json('data.numero'));
        $this->assertDatabaseCount('pedidos_compra_itens', 1);
    }

    public function test_lista_pedidos_com_filtro_status(): void
    {
        $this->criarPedido($this->variacao());
        $this->getJson('/api/v1/painel/compras?status=rascunho')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/painel/compras?status=recebido')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }

    public function test_show_traz_itens(): void
    {
        $po = $this->criarPedido($this->variacao());
        $this->getJson("/api/v1/painel/compras/{$po['id']}")
            ->assertOk()
            ->assertJsonCount(1, 'data.itens');
    }

    public function test_enviar_muda_status(): void
    {
        $po = $this->criarPedido($this->variacao());
        $this->postJson("/api/v1/painel/compras/{$po['id']}/enviar")
            ->assertOk()
            ->assertJsonPath('data.status', 'enviado');
    }

    public function test_nao_recebe_pedido_em_rascunho(): void
    {
        $po = $this->criarPedido($this->variacao());
        $itemId = $po['itens'][0]['id'];
        $this->postJson("/api/v1/painel/compras/{$po['id']}/receber", [
            'itens' => [['item_id' => $itemId, 'qtd_recebida' => 5]],
        ])->assertStatus(422);
    }

    public function test_recebimento_parcial_atualiza_estoque_custo_e_gera_ap(): void
    {
        $v = $this->variacao();
        $po = $this->criarPedido($v, 10, 5.0);
        $itemId = $po['itens'][0]['id'];
        $this->postJson("/api/v1/painel/compras/{$po['id']}/enviar")->assertOk();

        $r = $this->postJson("/api/v1/painel/compras/{$po['id']}/receber", [
            'nota_fiscal' => 'NF-123',
            'itens' => [['item_id' => $itemId, 'qtd_recebida' => 6]],
        ])->assertCreated();

        $this->assertSame('parcialmente_recebido', $r->json('pedido.status'));

        // estoque: saldo 6, custo médio 5.0000
        $saldo = EstoqueSaldo::where('produto_variacao_id', $v->id_variacao)
            ->where('deposito_id', $this->deposito->id)->first();
        $this->assertSame(6, $saldo->saldo);
        $this->assertSame('5.0000', $saldo->custo_medio);

        // movimentação de entrada
        $this->assertDatabaseHas('movimentacoes_estoque', [
            'id_produto_variacao' => $v->id_variacao,
            'tipo_movimentacao' => 'entrada',
            'origem_type' => 'pedido_compra',
            'quantidade' => 6,
        ]);

        // AP gerado proporcional ao recebido: 6 * 5 = 30
        $this->assertDatabaseHas('contas_pagar', [
            'id_fornecedor' => $this->fornecedor->id_fornecedor,
            'valor_original' => 30.00,
            'status' => 'pendente',
            'numero_documento' => 'NF-123',
        ]);

        // item.qtd_recebida atualizado
        $this->assertDatabaseHas('pedidos_compra_itens', ['id' => $itemId, 'qtd_recebida' => 6]);
    }

    public function test_custo_medio_ponderado_em_dois_recebimentos(): void
    {
        $v = $this->variacao();

        // PO 1: 10 @ 5
        $po1 = $this->criarPedido($v, 10, 5.0);
        $this->postJson("/api/v1/painel/compras/{$po1['id']}/enviar");
        $this->postJson("/api/v1/painel/compras/{$po1['id']}/receber", [
            'itens' => [['item_id' => $po1['itens'][0]['id'], 'qtd_recebida' => 10]],
        ])->assertCreated();

        // PO 2: 10 @ 7
        $po2 = $this->criarPedido($v, 10, 7.0);
        $this->postJson("/api/v1/painel/compras/{$po2['id']}/enviar");
        $this->postJson("/api/v1/painel/compras/{$po2['id']}/receber", [
            'itens' => [['item_id' => $po2['itens'][0]['id'], 'qtd_recebida' => 10]],
        ])->assertCreated();

        $saldo = EstoqueSaldo::where('produto_variacao_id', $v->id_variacao)
            ->where('deposito_id', $this->deposito->id)->first();
        $this->assertSame(20, $saldo->saldo);
        $this->assertSame('6.0000', $saldo->custo_medio); // (10*5 + 10*7)/20
    }

    public function test_recebimento_total_marca_recebido(): void
    {
        $v = $this->variacao();
        $po = $this->criarPedido($v, 4, 5.0);
        $this->postJson("/api/v1/painel/compras/{$po['id']}/enviar");
        $r = $this->postJson("/api/v1/painel/compras/{$po['id']}/receber", [
            'itens' => [['item_id' => $po['itens'][0]['id'], 'qtd_recebida' => 4]],
        ])->assertCreated();
        $this->assertSame('recebido', $r->json('pedido.status'));
    }

    public function test_receber_acima_do_pendente_falha(): void
    {
        $v = $this->variacao();
        $po = $this->criarPedido($v, 4, 5.0);
        $this->postJson("/api/v1/painel/compras/{$po['id']}/enviar");
        $this->postJson("/api/v1/painel/compras/{$po['id']}/receber", [
            'itens' => [['item_id' => $po['itens'][0]['id'], 'qtd_recebida' => 10]],
        ])->assertStatus(422);
    }

    public function test_condicao_pagamento_parcela_gera_multiplas_ap(): void
    {
        $v = $this->variacao();
        $po = $this->criarPedido($v, 10, 6.0, ['condicao_pagamento' => '30/60']);
        $this->postJson("/api/v1/painel/compras/{$po['id']}/enviar");
        $this->postJson("/api/v1/painel/compras/{$po['id']}/receber", [
            'itens' => [['item_id' => $po['itens'][0]['id'], 'qtd_recebida' => 10]],
        ])->assertCreated();

        // 60 total → 2 parcelas de 30
        $this->assertDatabaseHas('contas_pagar', ['total_parcelas' => 2, 'numero_parcela' => 1, 'valor_original' => 30.00]);
        $this->assertDatabaseHas('contas_pagar', ['total_parcelas' => 2, 'numero_parcela' => 2, 'valor_original' => 30.00]);
    }

    public function test_cancela_pedido(): void
    {
        $po = $this->criarPedido($this->variacao());
        $this->postJson("/api/v1/painel/compras/{$po['id']}/cancelar")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelado');
    }

    public function test_atualiza_rascunho(): void
    {
        $v = $this->variacao();
        $po = $this->criarPedido($v, 10, 5.0);
        $this->putJson("/api/v1/painel/compras/{$po['id']}", [
            'frete' => 10,
            'itens' => [['produto_variacao_id' => $v->id_variacao, 'qtd' => 2, 'custo_unit' => 8]],
        ])->assertOk()
            ->assertJsonPath('data.subtotal', '16.00')
            ->assertJsonPath('data.total', '26.00');
    }

    public function test_exige_autenticacao(): void
    {
        app('auth')->forgetGuards();
        $this->postJson('/api/v1/painel/compras', [])->assertUnauthorized();
    }
}
