<?php

namespace Tests\Feature\Painel;

use App\Models\Categoria;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProdutoImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
    }

    private function upload(string $conteudo): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('produtos.csv', $conteudo);
    }

    public function test_importa_linhas_validas_e_reporta_erros(): void
    {
        $cat = Categoria::create(['nome' => 'Ração', 'ativo' => true]);
        $csv = "nome,preco_venda,id_categoria,estoque_atual\n"
            ."Ração Golden 15kg,189.90,{$cat->id_categoria},30\n"
            .",50.00,,10\n" // nome vazio → erro
            ."Areia Pipicat,abc,,5\n"; // preco inválido → erro

        $r = $this->postJson('/api/v1/painel/produtos/import', ['arquivo' => $this->upload($csv)])
            ->assertOk();

        $this->assertSame(1, $r->json('data.criados'));
        $this->assertSame(3, $r->json('data.total_linhas'));
        $this->assertCount(2, $r->json('data.erros'));
        $this->assertSame(3, $r->json('data.erros.0.linha')); // linha 3 (nome vazio)

        $this->assertDatabaseHas('produtos', ['nome' => 'Ração Golden 15kg', 'id_categoria' => $cat->id_categoria]);
        $this->assertSame(1, Produto::count());
    }

    public function test_template_disponivel(): void
    {
        $r = $this->get('/api/v1/painel/produtos/import/template')->assertOk();
        $this->assertStringContainsString('text/csv', $r->headers->get('Content-Type'));
        $this->assertStringContainsString('nome,preco_venda', $r->getContent());
    }

    public function test_exige_arquivo(): void
    {
        $this->postJson('/api/v1/painel/produtos/import', [])
            ->assertStatus(422)->assertJsonValidationErrors('arquivo');
    }
}
