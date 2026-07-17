<?php

namespace Tests\Feature\Integracao;

use App\Domain\Payment\PaymentGatewayInterface;
use App\Domain\Payment\YapayGateway;
use App\Models\Cliente;
use App\Models\ConfiguracaoEmpresa;
use App\Models\PagamentoPedido;
use App\Models\Pedido;
use App\Models\PedidoItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class YapayGatewayTest extends TestCase
{
    use RefreshDatabase;

    private const PAY_URL = 'api.intermediador.sandbox.yapay.com.br/api/v3/transactions/payment';

    private const SECRET = 'test-secret';

    protected function setUp(): void
    {
        parent::setUp();
        // Driver/credenciais do Yapay vêm de configuracoes_empresa (tela do painel).
        ConfiguracaoEmpresa::create([
            'payment_driver' => 'yapay',
            'yapay_token_account' => 'tok-conta-123',
            'yapay_sandbox' => true,
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

    private function fakePix(): void
    {
        Http::fake([
            self::PAY_URL => Http::response([
                'message_response' => ['message' => 'success'],
                'data_response' => ['transaction' => [
                    'transaction_id' => 1727667,
                    'status_id' => 4,
                    'status_name' => 'Aguardando Pagamento',
                    'token_transaction' => 'tok-tx',
                    'payment' => [
                        'payment_method_id' => 27,
                        'payment_method_name' => 'Pix',
                        'qrcode_path' => 'https://yapay.test/qr.png',
                        'qrcode_original_path' => '00020126PIXCOPIACOLA5204',
                        'url_payment' => 'https://yapay.test/pay/1727667',
                    ],
                ]],
            ], 201),
        ]);
    }

    public function test_driver_yapay_resolve_yapay_gateway(): void
    {
        $this->assertInstanceOf(YapayGateway::class, app(PaymentGatewayInterface::class));
    }

    public function test_criar_cobranca_pix_retorna_qr_copia_cola_e_gateway_id(): void
    {
        $this->fakePix();
        $pedido = $this->pedido();

        $res = app(PaymentGatewayInterface::class)->criarCobranca($pedido, 'pix');

        $this->assertSame('1727667', $res['gateway_id']);
        $this->assertSame('pendente', $res['status']);
        $this->assertSame('https://yapay.test/qr.png', $res['pix_qr']);
        $this->assertSame('00020126PIXCOPIACOLA5204', $res['pix_copia_cola']);

        Http::assertSent(function ($request) use ($pedido) {
            return str_contains($request->url(), self::PAY_URL)
                && $request['token_account'] === 'tok-conta-123'
                && $request['payment']['payment_method_id'] === '27'
                && $request['transaction']['order_number'] === $pedido->numero;
        });
    }

    public function test_criar_cobranca_boleto_retorna_url(): void
    {
        Http::fake([
            self::PAY_URL => Http::response([
                'message_response' => ['message' => 'success'],
                'data_response' => ['transaction' => [
                    'transaction_id' => 42,
                    'status_id' => 4,
                    'status_name' => 'Aguardando Pagamento',
                    'payment' => [
                        'payment_method_id' => 6,
                        'url_payment' => 'https://yapay.test/boleto/42',
                    ],
                ]],
            ], 201),
        ]);

        $res = app(PaymentGatewayInterface::class)->criarCobranca($this->pedido(), 'boleto');

        $this->assertSame('42', $res['gateway_id']);
        $this->assertSame('https://yapay.test/boleto/42', $res['boleto_url']);
        Http::assertSent(fn ($r) => $r['payment']['payment_method_id'] === '6');
    }

    public function test_criar_cobranca_cartao_ainda_nao_suportado(): void
    {
        Http::fake();

        $this->expectException(RuntimeException::class);
        app(PaymentGatewayInterface::class)->criarCobranca($this->pedido(), 'cartao_credito');
    }

    public function test_consultar_status_mapeia_aprovada(): void
    {
        Http::fake([
            'api.intermediador.sandbox.yapay.com.br/*' => Http::response([
                'data_response' => ['transaction' => [
                    'transaction_id' => 1727667,
                    'status_name' => 'Aprovada',
                ]],
            ], 200),
        ]);

        $status = app(PaymentGatewayInterface::class)->consultarStatus('1727667');

        $this->assertSame('aprovado', $status);
    }

    public function test_webhook_yapay_usa_transaction_id_e_status_name(): void
    {
        $pedido = $this->pedido();
        PagamentoPedido::create([
            'id_pedido' => $pedido->id_pedido,
            'gateway' => 'yapay',
            'gateway_id_externo' => '1727667',
            'metodo' => 'pix',
            'status' => 'pendente',
            'valor' => 100,
        ]);

        // O webhook reconfirma via consultarStatus() antes de gravar — o corpo do
        // POST só identifica QUAL transaction_id mudou, não é a fonte do status.
        Http::fake([
            'api.intermediador.sandbox.yapay.com.br/*' => Http::response([
                'data_response' => ['transaction' => [
                    'transaction_id' => 1727667,
                    'status_name' => 'Cancelada',
                ]],
            ], 200),
        ]);

        // Payload no formato do Yapay: transaction_id + status_name em português.
        $this->postJson('/api/v1/webhooks/pagamento?wh_secret='.self::SECRET, [
            'transaction_id' => '1727667',
            'status_name' => 'Cancelada',
        ])->assertOk();

        $this->assertSame('rejeitado', PagamentoPedido::first()->status);
    }

    public function test_webhook_yapay_sem_secret_nao_processa(): void
    {
        $pedido = $this->pedido();
        PagamentoPedido::create([
            'id_pedido' => $pedido->id_pedido,
            'gateway' => 'yapay',
            'gateway_id_externo' => '1727667',
            'metodo' => 'pix',
            'status' => 'pendente',
            'valor' => 100,
        ]);

        $this->postJson('/api/v1/webhooks/pagamento', [
            'transaction_id' => '1727667',
            'status_name' => 'Aprovada',
        ])->assertOk();

        $this->assertSame('pendente', PagamentoPedido::first()->status);
    }

    public function test_webhook_yapay_ignora_status_forjado_no_corpo(): void
    {
        $pedido = $this->pedido();
        PagamentoPedido::create([
            'id_pedido' => $pedido->id_pedido,
            'gateway' => 'yapay',
            'gateway_id_externo' => '1727667',
            'metodo' => 'pix',
            'status' => 'pendente',
            'valor' => 100,
        ]);

        // A API real (mock) diz "ainda pendente" — o corpo forjado dizendo "Aprovada"
        // não pode sobrepor a reconfirmação.
        Http::fake([
            'api.intermediador.sandbox.yapay.com.br/*' => Http::response([
                'data_response' => ['transaction' => [
                    'transaction_id' => 1727667,
                    'status_name' => 'Aguardando Pagamento',
                ]],
            ], 200),
        ]);

        $this->postJson('/api/v1/webhooks/pagamento?wh_secret='.self::SECRET, [
            'transaction_id' => '1727667',
            'status_name' => 'Aprovada',
        ])->assertOk();

        $this->assertSame('pendente', PagamentoPedido::first()->status);
    }

    public function test_sem_token_account_lanca(): void
    {
        $gateway = new YapayGateway(null, true);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Configurações → Integrações');

        $gateway->criarCobranca($this->pedido(), 'pix');
    }
}
