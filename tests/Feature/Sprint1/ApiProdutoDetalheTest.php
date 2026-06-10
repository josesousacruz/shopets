<?php

namespace Tests\Feature\Sprint1;

use App\Models\Categoria;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiProdutoDetalheTest extends TestCase
{
    use RefreshDatabase;

    public function test_retorna_produto_com_variacoes_por_slug(): void
    {
        $cat = Categoria::create(['nome' => 'C', 'slug' => 'c', 'ativo' => true]);
        $produto = Produto::create([
            'nome' => 'Capa X', 'slug' => 'capa-x',
            'preco_custo' => 5, 'preco_venda' => 30,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
            'visivel_ecommerce' => true, 'ativo' => true,
        ]);
        ProdutoVariacao::create([
            'id_produto' => $produto->id_produto, 'sku' => 'X-PRE',
            'nome_variacao' => 'Preta', 'atributos' => ['cor' => 'Preta'],
            'preco_venda' => 30, 'estoque_atual' => 5, 'ativo' => true,
        ]);

        $response = $this->getJson('/api/v1/produtos/capa-x');

        $response->assertOk()
            ->assertJsonPath('data.slug', 'capa-x')
            ->assertJsonPath('data.categoria.slug', 'c')
            ->assertJsonCount(1, 'data.variacoes')
            ->assertJsonPath('data.variacoes.0.sku', 'X-PRE');
    }

    public function test_404_para_produto_oculto_no_ecommerce(): void
    {
        $cat = Categoria::create(['nome' => 'C', 'slug' => 'c', 'ativo' => true]);
        Produto::create([
            'nome' => 'Oculta', 'slug' => 'oculta',
            'preco_custo' => 5, 'preco_venda' => 30,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
            'visivel_ecommerce' => false, 'ativo' => true,
        ]);

        $this->getJson('/api/v1/produtos/oculta')->assertNotFound();
    }
}
