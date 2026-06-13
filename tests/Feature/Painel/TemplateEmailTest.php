<?php

namespace Tests\Feature\Painel;

use App\Models\TemplateEmail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TemplateEmailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
    }

    public function test_crud_template(): void
    {
        $r = $this->postJson('/api/v1/painel/templates-email', [
            'slug' => 'pedido_enviado',
            'nome' => 'Pedido enviado',
            'assunto' => 'Seu pedido {{numero}} foi enviado',
            'corpo_html' => '<p>Olá {{cliente}}, o pedido {{numero}} saiu para entrega.</p>',
            'variaveis' => ['numero', 'cliente'],
        ])->assertCreated();

        $id = $r->json('data.id');
        $this->getJson('/api/v1/painel/templates-email')->assertOk()->assertJsonCount(1, 'data');

        $this->putJson("/api/v1/painel/templates-email/{$id}", [
            'slug' => 'pedido_enviado',
            'nome' => 'Pedido enviado (v2)',
            'assunto' => 'Pedido {{numero}} a caminho',
            'corpo_html' => '<p>{{cliente}}</p>',
        ])->assertOk()->assertJsonPath('data.nome', 'Pedido enviado (v2)');

        $this->deleteJson("/api/v1/painel/templates-email/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('templates_email', ['id' => $id]);
    }

    public function test_preview_renderiza_variaveis(): void
    {
        $t = TemplateEmail::create([
            'slug' => 'pedido_pago',
            'nome' => 'Pago',
            'assunto' => 'Pedido {{numero}} pago',
            'corpo_html' => '<p>Obrigado, {{cliente}}! Total: {{total}}.</p>',
        ]);

        $r = $this->getJson("/api/v1/painel/templates-email/{$t->id}/preview")->assertOk();
        $this->assertStringContainsString('PED-2026-000123', $r->json('data.assunto'));
        $this->assertStringContainsString('Maria Silva', $r->json('data.corpo_html'));
        $this->assertStringContainsString('R$ 189,90', $r->json('data.corpo_html'));
    }

    public function test_slug_unico(): void
    {
        TemplateEmail::create(['slug' => 'x', 'nome' => 'X', 'assunto' => 'a', 'corpo_html' => 'b']);
        $this->postJson('/api/v1/painel/templates-email', [
            'slug' => 'x', 'nome' => 'Y', 'assunto' => 'a', 'corpo_html' => 'b',
        ])->assertStatus(422)->assertJsonValidationErrors('slug');
    }
}
