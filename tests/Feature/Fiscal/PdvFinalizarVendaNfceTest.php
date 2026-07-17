<?php

namespace Tests\Feature\Fiscal;

use App\Models\FormaPagamento;
use App\Models\PontoVenda;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PdvFinalizarVendaNfceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // PDVController::storeSale fixa id_pdv=1 — garante que o PDV 1 existe.
        PontoVenda::create(['nome_pdv' => 'Loja 1', 'ativo' => true]);
    }

    public function test_venda_de_balcao_finaliza_mesmo_sem_config_fiscal(): void
    {
        $this->actingAs(User::factory()->create());
        $produto = Produto::factory()->create(['preco_venda' => 25]);
        $forma = FormaPagamento::create(['nome' => 'Dinheiro', 'tipo' => 'dinheiro', 'ativo' => true]);

        $venda = $this->postJson('/sales')->assertOk()->json('venda');

        $resp = $this->postJson('/sales/finalizar', [
            'id_venda' => $venda['id_venda'],
            'pagamentos' => [
                ['id_forma_pagamento' => $forma->id_forma_pagamento, 'valor_pagamento' => 25],
            ],
            'items' => [
                ['product' => ['id' => $produto->id_produto, 'price' => 25], 'quantity' => 1],
            ],
        ])->assertOk();

        // A venda finaliza independente do resultado fiscal — sem certificado
        // configurado, a NFC-e falha (best-effort) mas a venda continua 'sucesso'.
        $resp->assertJsonPath('success', true);
        $resp->assertJsonPath('fiscal.emitido', false);
        $this->assertDatabaseHas('vendas', ['id_venda' => $venda['id_venda'], 'status' => 'finalizada']);
    }
}
