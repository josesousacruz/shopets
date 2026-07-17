<?php

namespace Tests\Feature\Pdv;

use App\Models\CaixaSessao;
use App\Models\ConfiguracaoEmpresa;
use App\Models\PontoVenda;
use App\Models\User;
use App\Models\Venda;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CaixaSessaoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create());
        PontoVenda::create(['nome_pdv' => 'Loja 1', 'ativo' => true]); // id_pdv=1
    }

    public function test_status_sem_config_e_modo_simples_por_padrao(): void
    {
        $r = $this->getJson('/caixa/status?id_pdv=1')->assertOk();
        $this->assertFalse($r->json('data.modo_sessao_ativo'));
        $this->assertNull($r->json('data.sessao'));
    }

    public function test_abrir_cria_sessao_e_bloqueia_segunda_abertura(): void
    {
        $this->postJson('/caixa/abrir', ['id_pdv' => 1, 'valor_abertura' => 100])
            ->assertCreated()
            ->assertJsonPath('data.status', 'aberta')
            ->assertJsonPath('data.valor_abertura', '100.00');

        $this->postJson('/caixa/abrir', ['id_pdv' => 1, 'valor_abertura' => 50])
            ->assertStatus(422);

        $this->assertSame(1, CaixaSessao::where('id_pdv', 1)->count());
    }

    public function test_movimento_exige_sessao_aberta(): void
    {
        $this->postJson('/caixa/movimento', ['id_pdv' => 1, 'tipo' => 'sangria', 'valor' => 20])
            ->assertStatus(422);
    }

    public function test_sangria_e_suprimento_entram_no_fluxo_caixa(): void
    {
        $this->postJson('/caixa/abrir', ['id_pdv' => 1, 'valor_abertura' => 100])->assertCreated();

        $this->postJson('/caixa/movimento', ['id_pdv' => 1, 'tipo' => 'sangria', 'valor' => 30, 'descricao' => 'Retirada pro cofre'])
            ->assertCreated()
            ->assertJsonPath('data.tipo_operacao', 'saida')
            ->assertJsonPath('data.categoria', 'sangria');

        $this->postJson('/caixa/movimento', ['id_pdv' => 1, 'tipo' => 'suprimento', 'valor' => 10])
            ->assertCreated()
            ->assertJsonPath('data.tipo_operacao', 'entrada')
            ->assertJsonPath('data.categoria', 'suprimento');

        $this->assertDatabaseHas('fluxo_caixa', ['categoria' => 'sangria', 'valor' => 30]);
        $this->assertDatabaseHas('fluxo_caixa', ['categoria' => 'suprimento', 'valor' => 10]);
    }

    public function test_fechar_calcula_diferenca_considerando_venda_e_sangria(): void
    {
        Carbon::setTestNow('2026-07-17 08:00:00');
        $this->postJson('/caixa/abrir', ['id_pdv' => 1, 'valor_abertura' => 100])->assertCreated();

        Carbon::setTestNow('2026-07-17 09:00:00');
        Venda::create([
            'numero_venda' => '2026000001',
            'id_usuario' => auth()->id(),
            'id_pdv' => 1,
            'valor_subtotal' => 50,
            'valor_desconto' => 0,
            'valor_acrescimo' => 0,
            'valor_total' => 50,
            'status' => 'finalizada',
            'data_venda' => now(),
        ]);
        // A venda em si não passa pelo trigger (só roda em MySQL/UPDATE) — simula
        // a entrada no fluxo_caixa manualmente, como o trigger faria em produção.
        \DB::table('fluxo_caixa')->insert([
            'user_id' => auth()->id(), 'id_pdv' => 1, 'tipo_operacao' => 'entrada',
            'valor' => 50, 'descricao' => 'Venda #2026000001', 'categoria' => 'venda',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->postJson('/caixa/movimento', ['id_pdv' => 1, 'tipo' => 'sangria', 'valor' => 20])->assertCreated();

        Carbon::setTestNow('2026-07-17 18:00:00');
        // Abertura 100 + venda 50 - sangria 20 = 130 esperado. Operador contou 125 (falta 5).
        $r = $this->postJson('/caixa/fechar', ['id_pdv' => 1, 'valor_fechamento_informado' => 125])
            ->assertOk();

        $this->assertSame('130.00', $r->json('data.valor_fechamento_calculado'));
        $this->assertSame('-5.00', $r->json('data.diferenca'));
        $this->assertSame('fechada', $r->json('data.status'));

        Carbon::setTestNow();
    }

    public function test_fechar_sem_sessao_aberta_retorna_422(): void
    {
        $this->postJson('/caixa/fechar', ['id_pdv' => 1, 'valor_fechamento_informado' => 100])
            ->assertStatus(422);
    }

    public function test_venda_bloqueada_quando_modo_sessao_ativo_sem_caixa_aberto(): void
    {
        ConfiguracaoEmpresa::create(['nome_empresa' => 'Loja', 'caixa_modo_sessao' => true]);

        $this->postJson('/sales')
            ->assertStatus(422)
            ->assertJsonPath('caixa_fechado', true);
    }

    public function test_venda_permitida_quando_modo_sessao_ativo_com_caixa_aberto(): void
    {
        ConfiguracaoEmpresa::create(['nome_empresa' => 'Loja', 'caixa_modo_sessao' => true]);
        $this->postJson('/caixa/abrir', ['id_pdv' => 1, 'valor_abertura' => 100])->assertCreated();

        $this->postJson('/sales')->assertOk()->assertJsonPath('success', true);
    }

    public function test_venda_permitida_no_modo_simples_sem_caixa_aberto(): void
    {
        // caixa_modo_sessao default false — nem precisa criar ConfiguracaoEmpresa.
        $this->postJson('/sales')->assertOk()->assertJsonPath('success', true);
    }
}
