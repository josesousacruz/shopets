<?php

namespace Tests\Feature\Painel;

use App\Models\Deposito;
use App\Models\EstoqueSaldo;
use App\Models\PontoVenda;
use App\Models\ProdutoVariacao;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PontoVendaAdminTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);
    }

    public function test_cria_pdv_com_deposito_e_fiscal(): void
    {
        $dep = Deposito::create(['nome' => 'Central', 'default' => true, 'ativo' => true]);

        $r = $this->postJson('/api/v1/painel/pontos-venda', [
            'nome_pdv' => 'Loja Shopping',
            'deposito_id' => $dep->id,
            'serie_fiscal_default' => '1',
            'regime_tributario' => 'simples_nacional',
        ])->assertCreated();

        $this->assertSame('Loja Shopping', $r->json('data.nome_pdv'));
        $this->assertDatabaseHas('pontos_venda', ['nome_pdv' => 'Loja Shopping', 'deposito_id' => $dep->id]);
    }

    public function test_lista_pdvs_com_deposito(): void
    {
        $dep = Deposito::create(['nome' => 'D', 'default' => true, 'ativo' => true]);
        PontoVenda::create(['nome_pdv' => 'Loja A', 'ativo' => true, 'deposito_id' => $dep->id]);

        $this->getJson('/api/v1/painel/pontos-venda')->assertOk()->assertJsonPath('data.0.nome_pdv', 'Loja A');
    }

    public function test_atualiza_numeracao_nfce(): void
    {
        $pdv = PontoVenda::create(['nome_pdv' => 'Loja', 'ativo' => true, 'serie_fiscal_default' => '1']);

        $this->putJson("/api/v1/painel/pontos-venda/{$pdv->id_pdv}", ['nfce_proximo_numero' => 500])
            ->assertOk()
            ->assertJsonPath('data.nfce_proximo_numero', 500);

        $this->assertSame(500, $pdv->fresh()->nfce_proximo_numero);
    }

    public function test_atualiza_e_desativa_pdv(): void
    {
        $pdv = PontoVenda::create(['nome_pdv' => 'Loja', 'ativo' => true]);

        $this->putJson("/api/v1/painel/pontos-venda/{$pdv->id_pdv}", ['nome_pdv' => 'Loja Nova'])
            ->assertOk()->assertJsonPath('data.nome_pdv', 'Loja Nova');

        $this->deleteJson("/api/v1/painel/pontos-venda/{$pdv->id_pdv}")->assertNoContent();
        $this->assertFalse($pdv->fresh()->ativo);
    }

    public function test_sync_operadores(): void
    {
        $pdv = PontoVenda::create(['nome_pdv' => 'Loja', 'ativo' => true]);
        $op1 = User::factory()->create();
        $op2 = User::factory()->create();

        $this->postJson("/api/v1/painel/pontos-venda/{$pdv->id_pdv}/operadores", [
            'user_ids' => [$op1->id, $op2->id],
        ])->assertOk();

        $this->assertDatabaseHas('users_pdvs', ['id_pdv' => $pdv->id_pdv, 'user_id' => $op1->id]);
        $this->assertSame(2, $pdv->users()->count());
    }

    public function test_pdv_scope_filtra_estoque_pelo_deposito_do_pdv(): void
    {
        $depA = Deposito::create(['nome' => 'A', 'default' => true, 'ativo' => true]);
        $depB = Deposito::create(['nome' => 'B', 'default' => false, 'ativo' => true]);
        $pdv = PontoVenda::create(['nome_pdv' => 'Loja A', 'ativo' => true, 'deposito_id' => $depA->id]);

        $vA = ProdutoVariacao::factory()->create();
        $vB = ProdutoVariacao::factory()->create();
        EstoqueSaldo::create(['produto_variacao_id' => $vA->id_variacao, 'deposito_id' => $depA->id, 'saldo' => 5, 'reservado' => 0, 'minimo' => 0, 'custo_medio' => 0]);
        EstoqueSaldo::create(['produto_variacao_id' => $vB->id_variacao, 'deposito_id' => $depB->id, 'saldo' => 9, 'reservado' => 0, 'minimo' => 0, 'custo_medio' => 0]);

        // Sem cookie: vê os dois saldos.
        $this->getJson('/api/v1/painel/estoque')->assertOk()->assertJsonPath('meta.total', 2);

        // Com PDV ativo: escopa para o depósito A.
        $this->withHeader('X-Pdv-Ativo', (string) $pdv->id_pdv)
            ->getJson('/api/v1/painel/estoque')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }
}
