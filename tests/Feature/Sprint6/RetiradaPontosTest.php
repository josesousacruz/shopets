<?php

namespace Tests\Feature\Sprint6;

use App\Models\PontoVenda;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RetiradaPontosTest extends TestCase
{
    use RefreshDatabase;

    public function test_lista_somente_pdvs_habilitados_e_ativos(): void
    {
        PontoVenda::create(['nome_pdv' => 'Loja Centro', 'ativo' => true, 'permite_retirada' => true, 'endereco' => 'Rua A, 1', 'telefone' => '1133334444']);
        PontoVenda::create(['nome_pdv' => 'Loja Sem Retirada', 'ativo' => true, 'permite_retirada' => false]);
        PontoVenda::create(['nome_pdv' => 'Loja Inativa', 'ativo' => false, 'permite_retirada' => true]);

        $resp = $this->getJson('/api/v1/pontos-retirada')->assertOk();

        $nomes = collect($resp->json('data'))->pluck('nome_pdv')->all();
        $this->assertContains('Loja Centro', $nomes);
        $this->assertNotContains('Loja Sem Retirada', $nomes);
        $this->assertNotContains('Loja Inativa', $nomes);
        $this->assertCount(1, $resp->json('data'));
    }

    public function test_admin_pode_ativar_retirada_no_pdv(): void
    {
        $admin = \App\Models\User::factory()->create(['nivel_acesso' => 'admin']);
        $pdv = PontoVenda::create(['nome_pdv' => 'Loja X', 'ativo' => true, 'permite_retirada' => false]);

        \Laravel\Sanctum\Sanctum::actingAs($admin);

        $this->putJson("/api/v1/painel/pontos-venda/{$pdv->id_pdv}", ['permite_retirada' => true])
            ->assertOk();

        $this->assertTrue($pdv->fresh()->permite_retirada);
    }
}
