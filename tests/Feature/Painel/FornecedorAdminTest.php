<?php

namespace Tests\Feature\Painel;

use App\Models\Deposito;
use App\Models\Fornecedor;
use App\Models\PedidoCompra;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FornecedorAdminTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);
    }

    public function test_lista_com_filtro_busca(): void
    {
        Fornecedor::create(['nome' => 'ACME Ltda', 'ativo' => true]);
        Fornecedor::create(['nome' => 'Beta SA', 'ativo' => true]);

        $this->getJson('/api/v1/painel/fornecedores?q=acme')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.nome', 'ACME Ltda');
    }

    public function test_cria_fornecedor_com_condicoes(): void
    {
        $r = $this->postJson('/api/v1/painel/fornecedores', [
            'nome' => 'Fornecedor X',
            'cnpj' => '12345678000199',
            'email' => 'x@forn.com',
            'prazo_medio_dias' => 30,
            'condicao_pagamento_padrao' => '30/60',
            'desconto_padrao' => 5,
        ])->assertCreated();

        $this->assertSame(30, $r->json('data.prazo_medio_dias'));
        $this->assertDatabaseHas('fornecedores', ['nome' => 'Fornecedor X', 'condicao_pagamento_padrao' => '30/60']);
    }

    public function test_valida_nome_obrigatorio(): void
    {
        $this->postJson('/api/v1/painel/fornecedores', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nome');
    }

    public function test_atualiza_fornecedor(): void
    {
        $f = Fornecedor::create(['nome' => 'Antigo', 'ativo' => true]);
        $this->putJson("/api/v1/painel/fornecedores/{$f->id_fornecedor}", [
            'nome' => 'Novo Nome',
            'ativo' => false,
        ])->assertOk()->assertJsonPath('data.nome', 'Novo Nome');

        $this->assertDatabaseHas('fornecedores', ['id_fornecedor' => $f->id_fornecedor, 'nome' => 'Novo Nome', 'ativo' => 0]);
    }

    public function test_exclui_fornecedor(): void
    {
        $f = Fornecedor::create(['nome' => 'Del', 'ativo' => true]);
        $this->deleteJson("/api/v1/painel/fornecedores/{$f->id_fornecedor}")->assertNoContent();
        $this->assertDatabaseMissing('fornecedores', ['id_fornecedor' => $f->id_fornecedor]);
    }

    public function test_vincula_e_lista_produtos(): void
    {
        $f = Fornecedor::create(['nome' => 'Forn', 'ativo' => true]);
        $produto = Produto::factory()->create();

        $this->postJson("/api/v1/painel/fornecedores/{$f->id_fornecedor}/produtos", [
            'id_produto' => $produto->id_produto,
            'codigo_no_fornecedor' => 'ABC-1',
            'preco_custo_fornecedor' => 12.5,
            'fornecedor_principal' => true,
        ])->assertCreated();

        $this->getJson("/api/v1/painel/fornecedores/{$f->id_fornecedor}/produtos")
            ->assertOk()
            ->assertJsonPath('data.0.codigo_no_fornecedor', 'ABC-1');
    }

    public function test_historico_traz_pedidos_e_metricas(): void
    {
        $f = Fornecedor::create(['nome' => 'Forn', 'ativo' => true]);
        $dep = Deposito::create(['nome' => 'D', 'default' => true, 'ativo' => true]);
        PedidoCompra::create([
            'numero' => 'PC-000001', 'fornecedor_id' => $f->id_fornecedor, 'deposito_id' => $dep->id,
            'status' => 'enviado', 'subtotal' => 100, 'total' => 100, 'criado_por' => $this->admin->id,
        ]);

        $this->getJson("/api/v1/painel/fornecedores/{$f->id_fornecedor}/historico")
            ->assertOk()
            ->assertJsonPath('data.metricas.total_pedidos', 1)
            ->assertJsonPath('data.metricas.total_comprado', 100);
    }

    public function test_anexa_e_remove_documento(): void
    {
        Storage::fake('public');
        $f = Fornecedor::create(['nome' => 'Forn', 'ativo' => true]);

        $r = $this->postJson("/api/v1/painel/fornecedores/{$f->id_fornecedor}/documentos", [
            'arquivo' => UploadedFile::fake()->create('contrato.pdf', 50),
        ])->assertCreated();

        $mediaId = $r->json('data.0.id');
        $this->assertNotNull($mediaId);

        $this->deleteJson("/api/v1/painel/fornecedores/{$f->id_fornecedor}/documentos/{$mediaId}")
            ->assertNoContent();
    }
}
