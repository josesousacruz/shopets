<?php

namespace Tests\Feature\Painel;

use App\Models\PlanoConta;
use App\Models\User;
use Database\Seeders\PlanoContasSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceiroPlanoContasTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
    }

    public function test_tree_retorna_arvore_do_seeder(): void
    {
        $this->seed(PlanoContasSeeder::class);
        $r = $this->getJson('/api/v1/painel/financeiro/plano-contas')->assertOk();

        $this->assertCount(2, $r->json('data')); // Receitas, Despesas
        $this->assertSame('Receitas', $r->json('data.0.nome'));
        $this->assertCount(3, $r->json('data.0.filhos'));
    }

    public function test_criar_filho_herda_tipo_do_pai(): void
    {
        $pai = PlanoConta::create(['tipo' => 'despesa', 'codigo' => '9', 'nome' => 'Operacional']);
        $r = $this->postJson('/api/v1/painel/financeiro/plano-contas', [
            'parent_id' => $pai->id,
            'codigo' => '9.1',
            'nome' => 'Energia',
        ])->assertCreated();

        $this->assertSame('despesa', $r->json('data.tipo'));
    }

    public function test_mover_para_descendente_falha(): void
    {
        $pai = PlanoConta::create(['tipo' => 'despesa', 'codigo' => '5', 'nome' => 'A']);
        $filho = PlanoConta::create(['tipo' => 'despesa', 'codigo' => '5.1', 'nome' => 'B', 'parent_id' => $pai->id]);

        $this->postJson("/api/v1/painel/financeiro/plano-contas/{$pai->id}/mover", ['parent_id' => $filho->id])
            ->assertStatus(422);
    }

    public function test_desativar_cascata(): void
    {
        $pai = PlanoConta::create(['tipo' => 'despesa', 'codigo' => '7', 'nome' => 'A']);
        $filho = PlanoConta::create(['tipo' => 'despesa', 'codigo' => '7.1', 'nome' => 'B', 'parent_id' => $pai->id]);

        $this->deleteJson("/api/v1/painel/financeiro/plano-contas/{$pai->id}")->assertNoContent();

        $this->assertFalse($pai->fresh()->ativo);
        $this->assertFalse($filho->fresh()->ativo);
    }
}
