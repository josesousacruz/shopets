<?php

namespace Tests\Feature\Painel;

use App\Models\ContaPagar;
use App\Models\ContaReceber;
use App\Models\PontoVenda;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceiroContasTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);
        PontoVenda::create(['nome_pdv' => 'Loja', 'ativo' => true]);
    }

    public function test_cria_conta_bancaria(): void
    {
        $this->postJson('/api/v1/painel/financeiro/contas-bancarias', [
            'tipo' => 'banco',
            'nome' => 'Conta Itaú',
            'saldo_inicial' => 1000,
        ])->assertCreated()->assertJsonPath('data.nome', 'Conta Itaú');

        $this->getJson('/api/v1/painel/financeiro/contas-bancarias')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_cria_conta_pagar_simples(): void
    {
        $r = $this->postJson('/api/v1/painel/financeiro/contas-pagar', [
            'descricao' => 'Aluguel',
            'valor_original' => 2000,
            'data_vencimento' => '2026-07-10',
            'categoria' => 'despesa_operacional',
        ])->assertCreated();

        $this->assertCount(1, $r->json('data'));
        $this->assertDatabaseHas('contas_pagar', ['descricao' => 'Aluguel', 'valor_original' => 2000, 'status' => 'pendente']);
    }

    public function test_cria_conta_pagar_parcelada(): void
    {
        $r = $this->postJson('/api/v1/painel/financeiro/contas-pagar', [
            'descricao' => 'Equipamento',
            'valor_original' => 300,
            'data_vencimento' => '2026-07-01',
            'categoria' => 'outros',
            'parcelas' => 3,
            'intervalo_dias' => 30,
        ])->assertCreated();

        $this->assertCount(3, $r->json('data'));
        $this->assertDatabaseCount('contas_pagar', 3);
        $this->assertSame(300.0, (float) ContaPagar::sum('valor_original'));
    }

    public function test_baixa_conta_pagar(): void
    {
        $r = $this->postJson('/api/v1/painel/financeiro/contas-pagar', [
            'descricao' => 'X', 'valor_original' => 100, 'data_vencimento' => '2026-07-01', 'categoria' => 'outros',
        ])->assertCreated();
        $id = $r->json('data.0.id_conta_pagar');

        $this->postJson("/api/v1/painel/financeiro/contas-pagar/{$id}/baixar", [
            'data_pagamento' => '2026-07-02',
        ])->assertOk()->assertJsonPath('data.status', 'pago');
    }

    public function test_index_contas_pagar_filtra_status_e_resumo(): void
    {
        $this->postJson('/api/v1/painel/financeiro/contas-pagar', [
            'descricao' => 'A', 'valor_original' => 50, 'data_vencimento' => '2026-07-01', 'categoria' => 'outros',
        ]);
        $r = $this->getJson('/api/v1/painel/financeiro/contas-pagar?status=pendente')->assertOk();
        $this->assertSame(1, $r->json('meta.total'));
        $this->assertSame(50.0, (float) $r->json('resumo.pendente'));
    }

    public function test_cria_e_baixa_conta_receber(): void
    {
        $r = $this->postJson('/api/v1/painel/financeiro/contas-receber', [
            'descricao' => 'Serviço', 'valor_original' => 400, 'data_vencimento' => '2026-07-05', 'categoria' => 'servico',
        ])->assertCreated();
        $id = $r->json('data.0.id_conta_receber');

        $this->postJson("/api/v1/painel/financeiro/contas-receber/{$id}/baixar", [])
            ->assertOk()->assertJsonPath('data.status', 'recebido');

        $this->assertSame(400.0, (float) ContaReceber::find($id)->valor_recebido);
    }
}
