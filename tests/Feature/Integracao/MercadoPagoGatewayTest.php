<?php

namespace Tests\Feature\Integracao;

use App\Domain\Payment\MercadoPagoGateway;
use App\Domain\Payment\PaymentGatewayInterface;
use App\Models\Cliente;
use App\Models\ConfiguracaoEmpresa;
use App\Models\PagamentoPedido;
use App\Models\Pedido;
use App\Models\PedidoItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class MercadoPagoGatewayTest extends TestCase
{
    use RefreshDatabase;

    private const PAY_URL = 'api.mercadopago.com/v1/payments';

    private const SECRET = 'test-secret';

    private const MP_SECRET = 'mp-assinatura-secret';

    protected function setUp(): void
    {
        parent::setUp();
        // Driver/credenciais do MP vêm de configuracoes_empresa (tela do painel).
        ConfiguracaoEmpresa::create([
            'payment_driver' => 'mercadopago',
            'mercadopago_access_token' => 'APP_USR-token-teste',
            'mercadopago_sandbox' => true,
        ]);
        config()->set('services.payment.webhook_secret', self::SECRET);
    }

    private function pedido(): Pedido
    {
        $cliente = Cliente::factory()->create([
            'nome' => 'Fulano de Tal',
            'email' => 'fulano@example.com',
            'cpf_cnpj' => '39053344705',
        ]);
        $pedido = Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => $cliente->id_cliente,
            'status' => 'aguardando_pagamento',
            'modalidade' => 'entrega',
            'subtotal' => 100,
            'frete' => 0,
            'desconto' => 0,
            'total' => 100,
        ]);
        PedidoItem::create([
            'id_pedido' => $pedido->id_pedido,
            'nome' => 'Produto X',
            'preco_unit' => 100,
            'quantidade' => 1,
            'subtotal' => 100,
        ]);

        return $pedido->fresh();
    }

    private function pagamentoPendente(string $gatewayId = '12345678'): PagamentoPedido
    {
        return PagamentoPedido::create([
            'id_pedido' => $this->pedido()->id_pedido,
            'gateway' => 'mercadopago',
            'gateway_id_externo' => $gatewayId,
            'metodo' => 'pix',
            'status' => 'pendente',
            'valor' => 100,
        ]);
    }

    /**
     * Assinatura válida no formato do MP: HMAC-SHA256 do manifest
     * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` com o secret do painel.
     */
    private function assinatura(string $dataId, string $requestId, string $ts, string $secret = self::MP_SECRET): string
    {
        $manifest = "id:{$dataId};request-id:{$requestId};ts:{$ts};";

        return 'ts='.$ts.',v1='.hash_hmac('sha256', $manifest, $secret);
    }

    public function test_driver_mercadopago_resolve_mercadopago_gateway(): void
    {
        $this->assertInstanceOf(MercadoPagoGateway::class, app(PaymentGatewayInterface::class));
    }

    public function test_criar_cobranca_pix_retorna_qr_copia_cola_e_gateway_id(): void
    {
        Http::fake([
            self::PAY_URL => Http::response([
                'id' => 12345678,
                'status' => 'pending',
                'point_of_interaction' => ['transaction_data' => [
                    'qr_code' => '00020126PIXCOPIACOLA5204',
                    'qr_code_base64' => 'aW1hZ2VtLXFy',
                ]],
            ], 201),
        ]);
        $pedido = $this->pedido();

        $res = app(PaymentGatewayInterface::class)->criarCobranca($pedido, 'pix');

        $this->assertSame('12345678', $res['gateway_id']);
        $this->assertSame('pendente', $res['status']);
        $this->assertSame('data:image/png;base64,aW1hZ2VtLXFy', $res['pix_qr']);
        $this->assertSame('00020126PIXCOPIACOLA5204', $res['pix_copia_cola']);

        Http::assertSent(function ($request) use ($pedido) {
            return str_contains($request->url(), self::PAY_URL)
                && $request->hasHeader('X-Idempotency-Key')
                && $request->hasHeader('Authorization', 'Bearer APP_USR-token-teste')
                && $request['transaction_amount'] === 100.0
                && $request['payment_method_id'] === 'pix'
                && $request['external_reference'] === $pedido->numero
                && $request['payer']['identification']['type'] === 'CPF';
        });
    }

    public function test_criar_cobranca_boleto_ainda_nao_suportado(): void
    {
        Http::fake();

        $this->expectException(RuntimeException::class);
        app(PaymentGatewayInterface::class)->criarCobranca($this->pedido(), 'boleto');
    }

    public function test_consultar_status_mapeia_approved(): void
    {
        Http::fake([
            self::PAY_URL.'/12345678' => Http::response(['id' => 12345678, 'status' => 'approved'], 200),
        ]);

        $this->assertSame('aprovado', app(PaymentGatewayInterface::class)->consultarStatus('12345678'));
    }

    public function test_estornar_chama_refunds(): void
    {
        Http::fake([
            self::PAY_URL.'/12345678/refunds' => Http::response(['id' => 999, 'status' => 'approved'], 201),
        ]);

        $ok = app(PaymentGatewayInterface::class)->estornar('12345678', 100.0);

        $this->assertTrue($ok);
        Http::assertSent(fn ($r) => str_contains($r->url(), '/refunds') && $r['amount'] === 100.0);
    }

    public function test_webhook_mp_com_assinatura_valida_reconfirma_status(): void
    {
        config()->set('services.payment.mercadopago.webhook_secret', self::MP_SECRET);
        $this->pagamentoPendente();

        // Reconfirmação: o status gravado vem do GET /v1/payments/{id}, não do corpo.
        Http::fake([
            self::PAY_URL.'/12345678' => Http::response(['id' => 12345678, 'status' => 'cancelled'], 200),
        ]);

        $headers = [
            'x-request-id' => 'req-abc',
            'x-signature' => $this->assinatura('12345678', 'req-abc', '1704908010'),
        ];

        $this->postJson(
            '/api/v1/webhooks/pagamento?wh_secret='.self::SECRET.'&data.id=12345678',
            ['action' => 'payment.updated', 'data' => ['id' => '12345678']],
            $headers
        )->assertOk();

        $this->assertSame('rejeitado', PagamentoPedido::first()->status);
    }

    public function test_webhook_mp_com_assinatura_invalida_nao_processa(): void
    {
        config()->set('services.payment.mercadopago.webhook_secret', self::MP_SECRET);
        $this->pagamentoPendente();

        Http::fake([
            self::PAY_URL.'/12345678' => Http::response(['id' => 12345678, 'status' => 'approved'], 200),
        ]);

        $headers = [
            'x-request-id' => 'req-abc',
            'x-signature' => $this->assinatura('12345678', 'req-abc', '1704908010', 'secret-errado'),
        ];

        $this->postJson(
            '/api/v1/webhooks/pagamento?wh_secret='.self::SECRET.'&data.id=12345678',
            ['action' => 'payment.updated', 'data' => ['id' => '12345678']],
            $headers
        )->assertOk();

        $this->assertSame('pendente', PagamentoPedido::first()->status);
        Http::assertNothingSent();
    }

    public function test_webhook_mp_sem_header_assinatura_nao_processa(): void
    {
        config()->set('services.payment.mercadopago.webhook_secret', self::MP_SECRET);
        $this->pagamentoPendente();
        Http::fake();

        $this->postJson(
            '/api/v1/webhooks/pagamento?wh_secret='.self::SECRET.'&data.id=12345678',
            ['action' => 'payment.updated', 'data' => ['id' => '12345678']]
        )->assertOk();

        $this->assertSame('pendente', PagamentoPedido::first()->status);
    }

    public function test_webhook_mp_sem_secret_de_assinatura_configurado_processa_com_as_outras_camadas(): void
    {
        // Sem MERCADOPAGO_WEBHOOK_SECRET, a camada x-signature é pulada — mas
        // wh_secret + reconfirmação continuam valendo.
        config()->set('services.payment.mercadopago.webhook_secret', null);
        $this->pagamentoPendente();

        Http::fake([
            self::PAY_URL.'/12345678' => Http::response(['id' => 12345678, 'status' => 'cancelled'], 200),
        ]);

        $this->postJson(
            '/api/v1/webhooks/pagamento?wh_secret='.self::SECRET,
            ['data' => ['id' => '12345678']]
        )->assertOk();

        $this->assertSame('rejeitado', PagamentoPedido::first()->status);
    }

    public function test_webhook_mp_usa_secret_de_assinatura_do_banco(): void
    {
        // Secret configurado pela tela (banco) vale mesmo sem o env.
        config()->set('services.payment.mercadopago.webhook_secret', null);
        ConfiguracaoEmpresa::first()->update(['mercadopago_webhook_secret' => self::MP_SECRET]);
        $this->pagamentoPendente();

        Http::fake([
            self::PAY_URL.'/12345678' => Http::response(['id' => 12345678, 'status' => 'cancelled'], 200),
        ]);

        // Assinatura errada → rejeita (prova que o secret do banco está em uso).
        $this->postJson(
            '/api/v1/webhooks/pagamento?wh_secret='.self::SECRET.'&data.id=12345678',
            ['data' => ['id' => '12345678']],
            ['x-request-id' => 'req-abc', 'x-signature' => $this->assinatura('12345678', 'req-abc', '1704908010', 'secret-errado')]
        )->assertOk();
        $this->assertSame('pendente', PagamentoPedido::first()->status);

        // Assinatura correta com o secret do banco → processa.
        $this->postJson(
            '/api/v1/webhooks/pagamento?wh_secret='.self::SECRET.'&data.id=12345678',
            ['data' => ['id' => '12345678']],
            ['x-request-id' => 'req-abc', 'x-signature' => $this->assinatura('12345678', 'req-abc', '1704908010')]
        )->assertOk();
        $this->assertSame('rejeitado', PagamentoPedido::first()->status);
    }

    public function test_sem_access_token_lanca(): void
    {
        $gateway = new MercadoPagoGateway(null);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Configurações → Pagamento/Frete');

        $gateway->criarCobranca($this->pedido(), 'pix');
    }
}
