<?php

namespace Tests\Feature\Painel;

use App\Models\Categoria;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProdutoAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $user = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($user);
    }

    private function categoria(): Categoria
    {
        return Categoria::create([
            'nome' => 'Brinquedos', 'slug' => 'brinquedos',
            'ativo' => true, 'visivel_ecommerce' => true,
        ]);
    }

    public function test_cria_produto_visivel_aparece_na_api_publica(): void
    {
        $cat = $this->categoria();

        $resp = $this->postJson('/api/v1/painel/produtos', [
            'nome' => 'Bolinha Mágica',
            'preco_venda' => 19.90,
            'id_categoria' => $cat->id_categoria,
            'visivel_ecommerce' => true,
            'unidade' => 'un',
            'estoque_atual' => 5,
        ])->assertStatus(201);

        $slug = $resp->json('data.slug');
        $this->assertSame('bolinha-magica', $slug);

        // aparece na vitrine pública
        $this->getJson('/api/v1/produtos')
            ->assertOk()
            ->assertJsonFragment(['slug' => 'bolinha-magica']);
    }

    public function test_toggle_visibilidade_remove_da_vitrine(): void
    {
        $cat = $this->categoria();
        $produto = Produto::create([
            'nome' => 'Pelúcia', 'slug' => 'pelucia',
            'preco_custo' => 5, 'preco_venda' => 40, 'unidade' => 'un',
            'id_categoria' => $cat->id_categoria,
            'visivel_ecommerce' => true, 'ativo' => true, 'estoque_atual' => 3,
        ]);

        $this->putJson("/api/v1/painel/produtos/{$produto->id_produto}", [
            'nome' => 'Pelúcia',
            'preco_venda' => 40,
            'visivel_ecommerce' => false,
        ])->assertOk()->assertJsonPath('data.visivel_ecommerce', false);

        $this->getJson('/api/v1/produtos')
            ->assertOk()
            ->assertJsonMissing(['slug' => 'pelucia']);
    }

    public function test_slug_e_unico(): void
    {
        $cat = $this->categoria();

        $a = $this->postJson('/api/v1/painel/produtos', [
            'nome' => 'Carrinho', 'preco_venda' => 10, 'id_categoria' => $cat->id_categoria, 'unidade' => 'un',
        ])->json('data.slug');

        $b = $this->postJson('/api/v1/painel/produtos', [
            'nome' => 'Carrinho', 'preco_venda' => 12, 'id_categoria' => $cat->id_categoria, 'unidade' => 'un',
        ])->json('data.slug');

        $this->assertSame('carrinho', $a);
        $this->assertSame('carrinho-2', $b);
    }

    public function test_adiciona_variacao(): void
    {
        $cat = $this->categoria();
        $produto = Produto::create([
            'nome' => 'Camiseta', 'slug' => 'camiseta',
            'preco_custo' => 5, 'preco_venda' => 50, 'unidade' => 'un',
            'id_categoria' => $cat->id_categoria, 'ativo' => true, 'visivel_ecommerce' => true,
        ]);

        $this->postJson("/api/v1/painel/produtos/{$produto->id_produto}/variacoes", [
            'sku' => 'CAM-M-AZ',
            'nome_variacao' => 'M Azul',
            'atributos' => ['tamanho' => 'M', 'cor' => 'azul'],
            'preco_venda' => 55,
            'estoque_atual' => 7,
            'ativo' => true,
        ])->assertStatus(201)->assertJsonPath('data.sku', 'CAM-M-AZ');

        $this->assertDatabaseHas('produto_variacoes', [
            'id_produto' => $produto->id_produto,
            'sku' => 'CAM-M-AZ',
        ]);
    }

    public function test_upload_foto_anexa_media(): void
    {
        Storage::fake('public');

        $cat = $this->categoria();
        $produto = Produto::create([
            'nome' => 'Boneca', 'slug' => 'boneca',
            'preco_custo' => 5, 'preco_venda' => 60, 'unidade' => 'un',
            'id_categoria' => $cat->id_categoria, 'ativo' => true, 'visivel_ecommerce' => true,
        ]);

        $this->postJson("/api/v1/painel/produtos/{$produto->id_produto}/fotos", [
            'foto' => UploadedFile::fake()->image('boneca.jpg', 600, 600),
        ])->assertStatus(201)->assertJsonStructure(['data' => ['id', 'url']]);

        $this->assertSame(1, $produto->fresh()->getMedia('images')->count());
    }
}
