<?php

namespace Tests\Feature\Painel;

use App\Models\Deposito;
use App\Models\EstoqueSaldo;
use App\Models\Inventario;
use App\Models\InventarioContagem;
use App\Models\MovimentacaoEstoque;
use App\Models\ProdutoVariacao;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventarioAdminTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);
    }

    private function setupDepositoComSaldos(int $saldoA = 10, int $saldoB = 5): array
    {
        $d = Deposito::create(['nome' => 'D1', 'default' => true, 'ativo' => true]);
        $va = ProdutoVariacao::factory()->create();
        $vb = ProdutoVariacao::factory()->create();
        EstoqueSaldo::create([
            'produto_variacao_id' => $va->id_variacao, 'deposito_id' => $d->id,
            'saldo' => $saldoA, 'reservado' => 0, 'minimo' => 0, 'custo_medio' => 0,
        ]);
        EstoqueSaldo::create([
            'produto_variacao_id' => $vb->id_variacao, 'deposito_id' => $d->id,
            'saldo' => $saldoB, 'reservado' => 0, 'minimo' => 0, 'custo_medio' => 0,
        ]);

        return [$d, $va, $vb];
    }

    public function test_abre_inventario_e_cria_snapshot_de_saldos(): void
    {
        [$d, $va, $vb] = $this->setupDepositoComSaldos();

        $r = $this->postJson('/api/v1/painel/inventarios', [
            'deposito_id' => $d->id,
            'observacoes' => 'Contagem mensal',
        ])->assertCreated();

        $invId = $r->json('data.id');
        $this->assertSame('aberto', $r->json('data.status'));

        $this->assertSame(2, InventarioContagem::where('inventario_id', $invId)->count());
        $this->assertDatabaseHas('inventario_contagens', [
            'inventario_id' => $invId,
            'produto_variacao_id' => $va->id_variacao,
            'saldo_sistema' => 10,
            'saldo_contado' => null,
        ]);
    }

    public function test_registrar_contagem_calcula_diferenca_e_move_para_contando(): void
    {
        [$d, $va] = $this->setupDepositoComSaldos();
        $inv = $this->postJson('/api/v1/painel/inventarios', ['deposito_id' => $d->id])->json('data');

        $this->postJson("/api/v1/painel/inventarios/{$inv['id']}/contagens", [
            'produto_variacao_id' => $va->id_variacao,
            'saldo_contado' => 8,
            'observacoes' => 'Quebrado 2',
        ])->assertOk()
          ->assertJsonPath('data.saldo_contado', 8)
          ->assertJsonPath('data.diferenca', -2);

        $this->assertSame('contando', Inventario::find($inv['id'])->status);
    }

    public function test_concluir_gera_ajustes_apenas_para_divergencias(): void
    {
        [$d, $va, $vb] = $this->setupDepositoComSaldos(10, 5);
        $inv = $this->postJson('/api/v1/painel/inventarios', ['deposito_id' => $d->id])->json('data');

        // VA: divergência -2 (sistema 10, contado 8)
        $this->postJson("/api/v1/painel/inventarios/{$inv['id']}/contagens", [
            'produto_variacao_id' => $va->id_variacao,
            'saldo_contado' => 8,
        ])->assertOk();
        // VB: sem divergência (sistema 5, contado 5)
        $this->postJson("/api/v1/painel/inventarios/{$inv['id']}/contagens", [
            'produto_variacao_id' => $vb->id_variacao,
            'saldo_contado' => 5,
        ])->assertOk();

        $r = $this->postJson("/api/v1/painel/inventarios/{$inv['id']}/concluir")->assertOk();
        $this->assertSame('concluido', $r->json('data.status'));

        $this->assertSame(8, EstoqueSaldo::where('produto_variacao_id', $va->id_variacao)->first()->saldo);
        $this->assertSame(5, EstoqueSaldo::where('produto_variacao_id', $vb->id_variacao)->first()->saldo);

        // só 1 movimentação (a divergência de VA)
        $this->assertSame(1, MovimentacaoEstoque::where('origem_type', 'inventario')->count());
        $this->assertDatabaseHas('movimentacoes_estoque', [
            'origem_type' => 'inventario',
            'origem_id' => $inv['id'],
            'id_produto_variacao' => $va->id_variacao,
            'quantidade' => 2,
        ]);
    }

    public function test_concluir_inventario_ja_finalizado_falha(): void
    {
        [$d] = $this->setupDepositoComSaldos();
        $inv = $this->postJson('/api/v1/painel/inventarios', ['deposito_id' => $d->id])->json('data');
        $this->postJson("/api/v1/painel/inventarios/{$inv['id']}/concluir")->assertOk();

        $this->postJson("/api/v1/painel/inventarios/{$inv['id']}/concluir")
            ->assertStatus(422)
            ->assertJsonValidationErrors('inventario');
    }

    public function test_lista_inventarios_filtra_por_status_e_deposito(): void
    {
        [$d] = $this->setupDepositoComSaldos();
        $outro = Deposito::create(['nome' => 'X', 'default' => false, 'ativo' => true]);

        $this->postJson('/api/v1/painel/inventarios', ['deposito_id' => $d->id])->assertCreated();
        $inv2 = $this->postJson('/api/v1/painel/inventarios', ['deposito_id' => $outro->id])->assertCreated()->json('data');
        $this->postJson("/api/v1/painel/inventarios/{$inv2['id']}/cancelar")->assertOk();

        $r = $this->getJson("/api/v1/painel/inventarios?status=aberto")->assertOk();
        $this->assertSame(1, $r->json('meta.total'));

        $r = $this->getJson("/api/v1/painel/inventarios?deposito_id={$outro->id}")->assertOk();
        $this->assertSame(1, $r->json('meta.total'));
    }
}
