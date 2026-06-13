<?php

namespace Tests\Feature\Painel;

use App\Models\MetodoEnvio;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MetodoEnvioTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
    }

    public function test_crud_metodo_envio(): void
    {
        $r = $this->postJson('/api/v1/painel/metodos-envio', [
            'nome' => 'Frete grátis acima de R$200',
            'tipo' => 'frete_gratis',
            'config' => ['minimo' => 200],
        ])->assertCreated();

        $id = $r->json('data.id');
        $this->getJson('/api/v1/painel/metodos-envio')->assertOk()->assertJsonCount(1, 'data');

        $this->putJson("/api/v1/painel/metodos-envio/{$id}", [
            'nome' => 'Tabela própria',
            'tipo' => 'tabela',
            'ativo' => false,
        ])->assertOk()->assertJsonPath('data.tipo', 'tabela');

        $this->deleteJson("/api/v1/painel/metodos-envio/{$id}")->assertNoContent();
        $this->assertSame(0, MetodoEnvio::count());
    }

    public function test_valida_tipo(): void
    {
        $this->postJson('/api/v1/painel/metodos-envio', ['nome' => 'X', 'tipo' => 'aviao'])
            ->assertStatus(422)->assertJsonValidationErrors('tipo');
    }
}
