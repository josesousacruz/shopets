<?php

namespace Tests\Feature\Sprint0;

use App\Models\Categoria;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoriaEcommerceColumnsTest extends TestCase
{
    use RefreshDatabase;

    public function test_categoria_persists_new_columns(): void
    {
        $cat = Categoria::create([
            'nome' => 'Capas', 'slug' => 'capas',
            'descricao_seo' => 'capas SEO', 'ordem' => 5,
            'visivel_ecommerce' => true, 'ativo' => true,
        ]);
        $cat->refresh();

        $this->assertSame('capas', $cat->slug);
        $this->assertSame(5, (int) $cat->ordem);
        $this->assertTrue($cat->visivel_ecommerce);
    }

    public function test_self_referencing_parent_works(): void
    {
        $pai = Categoria::create(['nome' => 'Acessórios', 'slug' => 'acessorios', 'ativo' => true]);
        $filha = Categoria::create([
            'nome' => 'Carregadores', 'slug' => 'carregadores',
            'ativo' => true, 'id_categoria_pai' => $pai->id_categoria,
        ]);

        $this->assertSame($pai->id_categoria, $filha->pai->id_categoria);
        $this->assertCount(1, $pai->filhas);
    }
}
