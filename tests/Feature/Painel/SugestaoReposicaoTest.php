<?php

namespace Tests\Feature\Painel;

use App\Models\Deposito;
use App\Models\EstoqueSaldo;
use App\Models\Fornecedor;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SugestaoReposicaoTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);
    }

    public function test_sugere_skus_abaixo_do_minimo_agrupados_por_fornecedor(): void
    {
        $dep = Deposito::create(['nome' => 'D', 'default' => true, 'ativo' => true]);
        $forn = Fornecedor::create(['nome' => 'ACME', 'ativo' => true]);

        $produto = Produto::factory()->create();
        $produto->fornecedores()->attach($forn->id_fornecedor, ['fornecedor_principal' => true, 'ativo' => true]);
        $variacao = ProdutoVariacao::factory()->create(['id_produto' => $produto->id_produto]);

        // saldo 2, mínimo 10 → abaixo do mínimo
        EstoqueSaldo::create([
            'produto_variacao_id' => $variacao->id_variacao,
            'deposito_id' => $dep->id,
            'saldo' => 2, 'reservado' => 0, 'minimo' => 10, 'custo_medio' => 4,
        ]);

        $r = $this->getJson('/api/v1/painel/compras/sugestao-reposicao')->assertOk();

        $this->assertCount(1, $r->json('data'));
        $this->assertSame($forn->id_fornecedor, $r->json('data.0.fornecedor_id'));
        // qtd_sugerida = minimo*2 - saldo = 18
        $this->assertSame(18, $r->json('data.0.itens.0.qtd_sugerida'));
    }

    public function test_nao_sugere_quando_saldo_acima_do_minimo(): void
    {
        $dep = Deposito::create(['nome' => 'D', 'default' => true, 'ativo' => true]);
        $variacao = ProdutoVariacao::factory()->create();
        EstoqueSaldo::create([
            'produto_variacao_id' => $variacao->id_variacao,
            'deposito_id' => $dep->id,
            'saldo' => 20, 'reservado' => 0, 'minimo' => 10, 'custo_medio' => 4,
        ]);

        $this->getJson('/api/v1/painel/compras/sugestao-reposicao')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }
}
