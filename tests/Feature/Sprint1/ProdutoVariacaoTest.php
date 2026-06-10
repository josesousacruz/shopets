<?php

namespace Tests\Feature\Sprint1;

use App\Models\Categoria;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProdutoVariacaoTest extends TestCase
{
    use RefreshDatabase;

    public function test_produto_pode_ter_multiplas_variacoes(): void
    {
        $cat = Categoria::create(['nome' => 'Capas', 'ativo' => true]);
        $produto = Produto::create([
            'nome' => 'Capa Genérica', 'preco_custo' => 5, 'preco_venda' => 15,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
        ]);

        ProdutoVariacao::create([
            'id_produto' => $produto->id_produto, 'sku' => 'CAP-PRE',
            'nome_variacao' => 'Preta', 'atributos' => ['cor' => 'preta'],
            'preco_venda' => 15, 'estoque_atual' => 10,
        ]);
        ProdutoVariacao::create([
            'id_produto' => $produto->id_produto, 'sku' => 'CAP-AZU',
            'nome_variacao' => 'Azul', 'atributos' => ['cor' => 'azul'],
            'preco_venda' => 15, 'estoque_atual' => 5,
        ]);

        $this->assertCount(2, $produto->fresh()->variacoes);
        $this->assertTrue($produto->fresh()->temVariacoes());
    }

    public function test_sku_e_unico(): void
    {
        $cat = Categoria::create(['nome' => 'Capas', 'ativo' => true]);
        $produto = Produto::create([
            'nome' => 'X', 'preco_custo' => 1, 'preco_venda' => 2,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
        ]);

        ProdutoVariacao::create([
            'id_produto' => $produto->id_produto, 'sku' => 'DUP',
            'nome_variacao' => 'A', 'preco_venda' => 1,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        ProdutoVariacao::create([
            'id_produto' => $produto->id_produto, 'sku' => 'DUP',
            'nome_variacao' => 'B', 'preco_venda' => 1,
        ]);
    }

    public function test_preco_efetivo_usa_promocional_quando_existe(): void
    {
        $cat = Categoria::create(['nome' => 'C', 'ativo' => true]);
        $produto = Produto::create([
            'nome' => 'P', 'preco_custo' => 1, 'preco_venda' => 2,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
        ]);

        $v = ProdutoVariacao::create([
            'id_produto' => $produto->id_produto, 'sku' => 'P1',
            'nome_variacao' => 'V', 'preco_venda' => 30, 'preco_promocional' => 19.90,
        ]);

        $this->assertSame(19.90, $v->precoEfetivo());
    }
}
