<?php

namespace Tests\Feature\Painel;

use App\Models\Categoria;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategoriaAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
    }

    public function test_cria_categoria_com_slug_automatico(): void
    {
        $this->postJson('/api/v1/painel/categorias', [
            'nome' => 'Acessórios Pet',
            'descricao_seo' => 'Coleiras e mais',
            'ordem' => 2,
            'visivel_ecommerce' => true,
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.slug', 'acessorios-pet')
            ->assertJsonPath('data.ordem', 2);
    }

    public function test_lista_categorias(): void
    {
        Categoria::create(['nome' => 'A', 'slug' => 'a', 'ativo' => true]);
        Categoria::create(['nome' => 'B', 'slug' => 'b', 'ativo' => true]);

        $this->getJson('/api/v1/painel/categorias')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_atualiza_categoria(): void
    {
        $cat = Categoria::create(['nome' => 'Velho', 'slug' => 'velho', 'ativo' => true]);

        $this->putJson("/api/v1/painel/categorias/{$cat->id_categoria}", [
            'nome' => 'Novo Nome',
            'visivel_ecommerce' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.nome', 'Novo Nome')
            ->assertJsonPath('data.visivel_ecommerce', false);
    }

    public function test_remove_categoria(): void
    {
        $cat = Categoria::create(['nome' => 'Temp', 'slug' => 'temp', 'ativo' => true]);

        $this->deleteJson("/api/v1/painel/categorias/{$cat->id_categoria}")
            ->assertNoContent();

        $this->assertDatabaseMissing('categorias', ['id_categoria' => $cat->id_categoria]);
    }
}
