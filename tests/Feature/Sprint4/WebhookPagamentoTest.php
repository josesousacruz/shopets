<?php

namespace Tests\Feature\Sprint4;

use App\Domain\Payment\PaymentGatewayInterface;
use App\Models\PagamentoPedido;
use App\Services\NfceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WebhookPagamentoTest extends TestCase
{
    use RefreshDatabase, Sprint4Helpers;

    private const SECRET = 'test-secret';

    protected function setUp(): void
    {
        parent::setUp();
        // NfceService toca filesystem/cert; substitui por stub que "emite".
        $this->mock(NfceService::class, function ($mock) {
            $mock->shouldReceive('emitir')->andReturn([
                'chave' => '29260612345678000199650010000000011000000017',
                'numero' => '1',
            ]);
        });
        Mail::fake();
        config(['services.payment.webhook_secret' => self::SECRET]);
    }

    private function criarPagamentoPendente(): array
    {
        [$cliente, $pedido] = $this->pedidoComItem();
        Sanctum::actingAs($cliente);
        $resp = $this->postJson("/api/v1/pedidos/{$pedido->numero}/pagar", ['metodo' => 'pix']);
        $gatewayId = $resp->json('gateway_id');

        return [$pedido, $gatewayId];
    }

    private function webhookUrl(?string $secret = self::SECRET): string
    {
        return $secret === null
            ? '/api/v1/webhooks/pagamento'
            : '/api/v1/webhooks/pagamento?wh_secret='.$secret;
    }

    public function test_webhook_aprovado_marca_pedido_pago_e_gera_venda(): void
    {
        $this->seedInfra();
        [$pedido, $gatewayId] = $this->criarPagamentoPendente();

        $this->postJson($this->webhookUrl(), [
            'gateway_id' => $gatewayId,
            'status' => 'approved',
        ])->assertOk();

        $pedido->refresh();
        $this->assertContains($pedido->status, ['pago', 'aguardando_revisao_fiscal']);
        $this->assertNotNull($pedido->id_venda);
        $this->assertEquals('aprovado', PagamentoPedido::first()->status);
    }

    public function test_webhook_duplicado_e_idempotente(): void
    {
        $this->seedInfra();
        [$pedido, $gatewayId] = $this->criarPagamentoPendente();

        $payload = ['gateway_id' => $gatewayId, 'status' => 'approved'];

        $this->postJson($this->webhookUrl(), $payload)->assertOk();
        $idVenda = $pedido->fresh()->id_venda;

        // Segundo webhook não cria nova venda.
        $this->postJson($this->webhookUrl(), $payload)->assertOk();

        $this->assertEquals($idVenda, $pedido->fresh()->id_venda);
        $this->assertEquals(1, \App\Models\Venda::count());
    }

    public function test_webhook_gateway_desconhecido_responde_200(): void
    {
        $this->seedInfra();

        $this->postJson($this->webhookUrl(), [
            'gateway_id' => 'inexistente_xyz',
            'status' => 'approved',
        ])->assertOk();
    }

    public function test_webhook_sem_secret_nao_processa(): void
    {
        $this->seedInfra();
        [$pedido, $gatewayId] = $this->criarPagamentoPendente();

        $this->postJson($this->webhookUrl(null), [
            'gateway_id' => $gatewayId,
            'status' => 'approved',
        ])->assertOk();

        $pedido->refresh();
        $this->assertNull($pedido->id_venda);
        $this->assertEquals('pendente', PagamentoPedido::first()->status);
    }

    public function test_webhook_secret_errado_nao_processa(): void
    {
        $this->seedInfra();
        [$pedido, $gatewayId] = $this->criarPagamentoPendente();

        $this->postJson($this->webhookUrl('errado'), [
            'gateway_id' => $gatewayId,
            'status' => 'approved',
        ])->assertOk();

        $pedido->refresh();
        $this->assertNull($pedido->id_venda);
        $this->assertEquals('pendente', PagamentoPedido::first()->status);
    }

    public function test_webhook_gateway_real_ignora_status_forjado_no_corpo(): void
    {
        $this->seedInfra();

        // Gateway "real" (não FakePaymentGateway): o webhook precisa reconfirmar
        // via consultarStatus() em vez de confiar no body.
        $this->mock(PaymentGatewayInterface::class, function ($mock) {
            $mock->shouldReceive('criarCobranca')
                ->andReturn(['gateway_id' => 'yp_123', 'status' => 'pendente']);
            $mock->shouldReceive('consultarStatus')
                ->with('yp_123')
                ->andReturn('aprovado');
        });

        [$cliente, $pedido] = $this->pedidoComItem();
        Sanctum::actingAs($cliente);
        $this->postJson("/api/v1/pedidos/{$pedido->numero}/pagar", ['metodo' => 'pix']);

        // Corpo forjado diz "rejeitado" — quem decide é a reconfirmação (mock → aprovado).
        $this->postJson($this->webhookUrl(), [
            'gateway_id' => 'yp_123',
            'status' => 'rejeitado',
        ])->assertOk();

        $this->assertEquals('aprovado', PagamentoPedido::first()->status);
        $this->assertNotNull($pedido->fresh()->id_venda);
    }

    public function test_endpoint_dev_aprova_pagamento(): void
    {
        $this->seedInfra();
        [$pedido, $gatewayId] = $this->criarPagamentoPendente();

        $this->postJson("/api/v1/dev/pagamentos/{$gatewayId}/aprovar")
            ->assertOk();

        $pedido->refresh();
        $this->assertNotNull($pedido->id_venda);
    }
}
