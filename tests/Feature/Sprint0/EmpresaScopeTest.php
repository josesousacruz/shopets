<?php

namespace Tests\Feature\Sprint0;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EmpresaScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_produto_assigns_current_empresa_id(): void
    {
        $cat = Categoria::create(['nome' => 'X', 'ativo' => true]);

        $produto = Produto::create([
            'nome'          => 'Teste',
            'preco_custo'   => 10,
            'preco_venda'   => 20,
            'unidade'       => 'un',
            'id_categoria'  => $cat->id_categoria,
        ]);

        $this->assertSame(1, (int) $produto->id_empresa);
    }

    public function test_global_scope_filters_by_current_empresa(): void
    {
        $cat = Categoria::create(['nome' => 'Y', 'ativo' => true]);
        Produto::create([
            'nome' => 'A', 'preco_custo' => 1, 'preco_venda' => 2,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
        ]);

        DB::table('produtos')->insert([
            'nome' => 'B', 'preco_custo' => 1, 'preco_venda' => 2,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
            'id_empresa' => 999,
            'estoque_atual' => 0, 'estoque_minimo' => 0,
            'permite_fracao' => 0, 'ativo' => 1,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->assertSame(1, Produto::count());
        $this->assertSame(2, DB::table('produtos')->count());
    }
}
