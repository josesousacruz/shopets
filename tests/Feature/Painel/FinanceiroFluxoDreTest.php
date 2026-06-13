<?php

namespace Tests\Feature\Painel;

use App\Models\ContaPagar;
use App\Models\ContaReceber;
use App\Models\PontoVenda;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceiroFluxoDreTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected int $pdv;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);
        $this->pdv = PontoVenda::create(['nome_pdv' => 'Loja', 'ativo' => true])->id_pdv;
    }

    private function ap(array $a): ContaPagar
    {
        return ContaPagar::create(array_merge([
            'descricao' => 'AP', 'id_pdv' => $this->pdv, 'user_id' => $this->admin->id,
            'valor_original' => 100, 'data_vencimento' => '2026-07-01', 'status' => 'pendente',
            'categoria' => 'outros', 'tipo_documento' => 'outros',
        ], $a));
    }

    private function ar(array $a): ContaReceber
    {
        return ContaReceber::create(array_merge([
            'descricao' => 'AR', 'id_pdv' => $this->pdv, 'user_id' => $this->admin->id,
            'valor_original' => 100, 'data_vencimento' => '2026-07-01', 'status' => 'pendente',
            'categoria' => 'outros', 'tipo_documento' => 'outros',
        ], $a));
    }

    public function test_fluxo_realizado_soma_pagos_e_recebidos(): void
    {
        $this->ar(['status' => 'recebido', 'valor_recebido' => 500, 'data_recebimento' => '2026-07-10']);
        $this->ap(['status' => 'pago', 'valor_pago' => 200, 'data_pagamento' => '2026-07-12']);

        $r = $this->getJson('/api/v1/painel/financeiro/fluxo-caixa?modo=realizado&de=2026-07-01&ate=2026-07-31')
            ->assertOk();

        $this->assertSame(500.0, (float) $r->json('data.totais.entradas'));
        $this->assertSame(200.0, (float) $r->json('data.totais.saidas'));
        $this->assertSame(300.0, (float) $r->json('data.totais.saldo'));
    }

    public function test_fluxo_previsto_usa_vencimento(): void
    {
        $this->ar(['valor_original' => 800, 'data_vencimento' => '2026-08-05']);

        $r = $this->getJson('/api/v1/painel/financeiro/fluxo-caixa?modo=previsto&de=2026-08-01&ate=2026-08-31')
            ->assertOk();
        $this->assertSame(800.0, (float) $r->json('data.totais.entradas'));
    }

    public function test_dre_calcula_lucro_liquido(): void
    {
        $this->ar(['status' => 'recebido', 'valor_recebido' => 1000, 'data_recebimento' => '2026-07-10']);
        $this->ap(['status' => 'pago', 'valor_pago' => 600, 'data_pagamento' => '2026-07-15']);

        $r = $this->getJson('/api/v1/painel/financeiro/dre?de=2026-07-01&ate=2026-07-31')->assertOk();

        $this->assertSame(1000.0, (float) $r->json('data.total_receitas'));
        $this->assertSame(600.0, (float) $r->json('data.total_despesas'));
        $this->assertSame(400.0, (float) $r->json('data.lucro_liquido'));
    }
}
