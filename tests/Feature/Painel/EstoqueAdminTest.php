<?php

namespace Tests\Feature\Painel;

use App\Models\Deposito;
use App\Models\EstoqueSaldo;
use App\Models\MovimentacaoEstoque;
use App\Models\ProdutoVariacao;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EstoqueAdminTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);
    }

    private function deposito(array $attrs = []): Deposito
    {
        return Deposito::create(array_merge([
            'nome' => 'Dep '.uniqid(),
            'default' => false,
            'ativo' => true,
        ], $attrs));
    }

    private function saldoFor(ProdutoVariacao $v, Deposito $d, int $saldo, int $minimo = 0): EstoqueSaldo
    {
        return EstoqueSaldo::create([
            'produto_variacao_id' => $v->id_variacao,
            'deposito_id' => $d->id,
            'saldo' => $saldo,
            'reservado' => 0,
            'minimo' => $minimo,
            'custo_medio' => 0,
        ]);
    }

    public function test_lista_saldos(): void
    {
        $v = ProdutoVariacao::factory()->create();
        $d = $this->deposito();
        $this->saldoFor($v, $d, 5);

        $r = $this->getJson('/api/v1/painel/estoque')->assertOk();
        $this->assertSame(1, $r->json('meta.total'));
    }

    public function test_filtra_por_deposito_id(): void
    {
        $v = ProdutoVariacao::factory()->create();
        $d1 = $this->deposito();
        $d2 = $this->deposito();
        $this->saldoFor($v, $d1, 5);
        $this->saldoFor($v, $d2, 7);

        $r = $this->getJson("/api/v1/painel/estoque?deposito_id={$d1->id}")->assertOk();
        $this->assertSame(1, $r->json('meta.total'));
    }

    public function test_filtra_abaixo_do_minimo(): void
    {
        $v1 = ProdutoVariacao::factory()->create();
        $v2 = ProdutoVariacao::factory()->create();
        $d = $this->deposito();
        $this->saldoFor($v1, $d, 2, minimo: 10);
        $this->saldoFor($v2, $d, 20, minimo: 5);

        $r = $this->getJson('/api/v1/painel/estoque?abaixo_minimo=1')->assertOk();
        $this->assertSame(1, $r->json('meta.total'));
    }

    public function test_lista_depositos(): void
    {
        $this->deposito(['nome' => 'A']);
        $this->deposito(['nome' => 'B']);

        $r = $this->getJson('/api/v1/painel/estoque/depositos')->assertOk();
        $this->assertCount(2, $r->json('data'));
    }

    public function test_ajuste_positivo_aumenta_saldo_e_cria_movimentacao(): void
    {
        $v = ProdutoVariacao::factory()->create();
        $d = $this->deposito();
        $this->saldoFor($v, $d, 4);

        $r = $this->postJson('/api/v1/painel/estoque/ajuste', [
            'produto_variacao_id' => $v->id_variacao,
            'deposito_id' => $d->id,
            'qtd_delta' => 6,
            'motivo' => 'Compra avulsa',
        ])->assertOk();

        $this->assertSame(10, $r->json('data.saldo'));
        $this->assertDatabaseHas('movimentacoes_estoque', [
            'id_produto_variacao' => $v->id_variacao,
            'deposito_id' => $d->id,
            'tipo_movimentacao' => 'ajuste',
            'quantidade' => 6,
            'observacoes' => 'Compra avulsa',
            'id_usuario' => $this->admin->id,
        ]);
    }

    public function test_ajuste_negativo_reduz_saldo(): void
    {
        $v = ProdutoVariacao::factory()->create();
        $d = $this->deposito();
        $this->saldoFor($v, $d, 10);

        $r = $this->postJson('/api/v1/painel/estoque/ajuste', [
            'produto_variacao_id' => $v->id_variacao,
            'deposito_id' => $d->id,
            'qtd_delta' => -3,
            'motivo' => 'Perda',
        ])->assertOk();

        $this->assertSame(7, $r->json('data.saldo'));
        $this->assertDatabaseHas('movimentacoes_estoque', [
            'id_produto_variacao' => $v->id_variacao,
            'quantidade' => 3,
            'observacoes' => 'Perda',
        ]);
    }

    public function test_ajuste_que_deixaria_saldo_negativo_falha(): void
    {
        $v = ProdutoVariacao::factory()->create();
        $d = $this->deposito();
        $this->saldoFor($v, $d, 2);

        $this->postJson('/api/v1/painel/estoque/ajuste', [
            'produto_variacao_id' => $v->id_variacao,
            'deposito_id' => $d->id,
            'qtd_delta' => -5,
            'motivo' => 'Quebra',
        ])->assertStatus(422)->assertJsonValidationErrors('qtd_delta');
    }

    public function test_transferencia_move_qtd_e_cria_duas_movimentacoes(): void
    {
        $v = ProdutoVariacao::factory()->create();
        $de = $this->deposito();
        $para = $this->deposito();
        $this->saldoFor($v, $de, 10);

        $this->postJson('/api/v1/painel/estoque/transferencias', [
            'de' => $de->id,
            'para' => $para->id,
            'itens' => [['produto_variacao_id' => $v->id_variacao, 'qtd' => 4]],
            'observacao' => 'Reposicao',
        ])->assertOk();

        $this->assertSame(6, EstoqueSaldo::where('deposito_id', $de->id)->first()->saldo);
        $this->assertSame(4, EstoqueSaldo::where('deposito_id', $para->id)->first()->saldo);

        $this->assertSame(1, MovimentacaoEstoque::where('deposito_id', $de->id)
            ->where('tipo_movimentacao', 'saida')->where('origem_type', 'transferencia_saida')->count());
        $this->assertSame(1, MovimentacaoEstoque::where('deposito_id', $para->id)
            ->where('tipo_movimentacao', 'entrada')->where('origem_type', 'transferencia_entrada')->count());
    }

    public function test_transferencia_sem_saldo_falha(): void
    {
        $v = ProdutoVariacao::factory()->create();
        $de = $this->deposito();
        $para = $this->deposito();
        $this->saldoFor($v, $de, 2);

        $this->postJson('/api/v1/painel/estoque/transferencias', [
            'de' => $de->id,
            'para' => $para->id,
            'itens' => [['produto_variacao_id' => $v->id_variacao, 'qtd' => 5]],
        ])->assertStatus(422)->assertJsonValidationErrors('itens');
    }

    public function test_transferencia_mesmo_deposito_falha(): void
    {
        $v = ProdutoVariacao::factory()->create();
        $d = $this->deposito();

        $this->postJson('/api/v1/painel/estoque/transferencias', [
            'de' => $d->id,
            'para' => $d->id,
            'itens' => [['produto_variacao_id' => $v->id_variacao, 'qtd' => 1]],
        ])->assertStatus(422);
    }

    public function test_kardex_retorna_movimentacoes_da_variacao(): void
    {
        $v = ProdutoVariacao::factory()->create();
        $outra = ProdutoVariacao::factory()->create();
        $d = $this->deposito();
        $this->saldoFor($v, $d, 10);
        $this->saldoFor($outra, $d, 10);

        $this->postJson('/api/v1/painel/estoque/ajuste', [
            'produto_variacao_id' => $v->id_variacao,
            'deposito_id' => $d->id,
            'qtd_delta' => 3,
            'motivo' => 'x',
        ])->assertOk();
        $this->postJson('/api/v1/painel/estoque/ajuste', [
            'produto_variacao_id' => $outra->id_variacao,
            'deposito_id' => $d->id,
            'qtd_delta' => 1,
            'motivo' => 'y',
        ])->assertOk();

        $r = $this->getJson("/api/v1/painel/estoque/kardex/{$v->id_variacao}")->assertOk();
        $this->assertCount(1, $r->json('data'));
        $this->assertSame($v->id_variacao, $r->json('data.0.id_produto_variacao'));
    }
}
