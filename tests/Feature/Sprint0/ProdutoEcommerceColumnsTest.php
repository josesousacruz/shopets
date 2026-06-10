<?php

namespace Tests\Feature\Sprint0;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProdutoEcommerceColumnsTest extends TestCase
{
    use RefreshDatabase;

    public function test_produto_persists_new_ecommerce_columns(): void
    {
        $cat = Categoria::create(['nome' => 'C', 'ativo' => true]);

        $p = Produto::create([
            'nome'              => 'Capa X',
            'slug'              => 'capa-x',
            'descricao_curta'   => 'curta',
            'descricao_longa'   => 'longa',
            'preco_custo'       => 5,
            'preco_venda'       => 10,
            'preco_promocional' => 7.50,
            'unidade'           => 'un',
            'id_categoria'      => $cat->id_categoria,
            'peso_gramas'       => 80,
            'altura_cm'         => 16.5,
            'largura_cm'        => 8,
            'comprimento_cm'    => 1.2,
            'meta_title'        => 'Capa X SEO',
            'meta_description'  => 'Descrição SEO',
            'destaque'          => true,
            'novo'              => true,
            'em_promocao'       => true,
            'visivel_ecommerce' => true,
        ]);

        $p->refresh();

        $this->assertSame('capa-x', $p->slug);
        $this->assertTrue($p->visivel_ecommerce);
        $this->assertTrue($p->em_promocao);
        $this->assertEquals(7.50, (float) $p->preco_promocional);
        $this->assertSame(80, (int) $p->peso_gramas);
    }

    public function test_slug_is_unique(): void
    {
        $cat = Categoria::create(['nome' => 'C', 'ativo' => true]);

        Produto::create([
            'nome' => 'A', 'slug' => 'dup',
            'preco_custo' => 1, 'preco_venda' => 2,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        Produto::create([
            'nome' => 'B', 'slug' => 'dup',
            'preco_custo' => 1, 'preco_venda' => 2,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
        ]);
    }
}
