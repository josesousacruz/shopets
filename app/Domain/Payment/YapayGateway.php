<?php

namespace App\Domain\Payment;

use App\Models\Pedido;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Gateway Yapay Intermediador (LWSA, hoje sob a marca Vindi Pagamentos).
 *
 * Ativado quando services.payment.driver === 'yapay'. Autenticação por
 * `token_account` no corpo da requisição. Cria transações Pix e boleto via
 * POST /api/v3/transactions/payment; cartão exige checkout hospedado (fase 2).
 *
 * Contrato confirmado na doc do Intermediador; o endpoint de consulta de status
 * (consultarStatus) deve ser validado em sandbox antes do go-live — em produção
 * o canal primário de status é o webhook (url_notification → WebhookPagamentoController).
 *
 * @see https://developers.vindi.com.br/reference/criacao-de-transacoes
 */
class YapayGateway implements PaymentGatewayInterface
{
    private const SANDBOX_URL = 'https://api.intermediador.sandbox.yapay.com.br';

    private const PROD_URL = 'https://api.intermediador.yapay.com.br';

    /** metodo interno → payment_method_id do Yapay. */
    private const METODOS = [
        'pix' => '27',
        'boleto' => '6',
    ];

    public function __construct(
        private readonly ?string $tokenAccount = null,
        private readonly bool $sandbox = true,
    ) {}

    public function criarCobranca(Pedido $pedido, string $metodo): array
    {
        if (empty($this->tokenAccount)) {
            throw new RuntimeException('Gateway Yapay não configurado. Defina o token da conta em Configurações → Integrações.');
        }

        if (! isset(self::METODOS[$metodo])) {
            throw new RuntimeException(
                "Método '{$metodo}' ainda não suportado pelo YapayGateway (cartão exige checkout hospedado — fase 2)."
            );
        }

        $pedido->loadMissing(['cliente', 'itens']);
        $paymentMethodId = self::METODOS[$metodo];

        $resposta = $this->client()
            ->post('/api/v3/transactions/payment', $this->payload($pedido, $paymentMethodId))
            ->throw()
            ->json();

        $transacao = data_get($resposta, 'data_response.transaction', []);
        $payment = data_get($transacao, 'payment', []);

        $resultado = [
            'gateway_id' => (string) data_get($transacao, 'transaction_id'),
            'status' => $this->normalizarStatus((string) data_get($transacao, 'status_name', '')),
        ];

        if ($metodo === 'pix') {
            $resultado['pix_qr'] = data_get($payment, 'qrcode_path');
            $resultado['pix_copia_cola'] = data_get($payment, 'qrcode_original_path')
                ?? data_get($payment, 'url_payment');
        }

        if ($metodo === 'boleto') {
            $resultado['boleto_url'] = data_get($payment, 'url_payment')
                ?? data_get($payment, 'url_slip');
        }

        return $resultado;
    }

    public function consultarStatus(string $gatewayId): string
    {
        $resposta = $this->client()
            ->post('/api/v3/transactions/get_by_transaction_id', [
                'token_account' => $this->tokenAccount,
                'transaction_id' => $gatewayId,
            ])
            ->throw()
            ->json();

        return $this->normalizarStatus(
            (string) data_get($resposta, 'data_response.transaction.status_name', '')
        );
    }

    public function estornar(string $gatewayId, float $valor): bool
    {
        $resposta = $this->client()
            ->post('/api/v3/transactions/refund', [
                'token_account' => $this->tokenAccount,
                'transaction_id' => $gatewayId,
            ]);

        return $resposta->successful();
    }

    /**
     * Monta o payload da transação a partir do pedido.
     */
    private function payload(Pedido $pedido, string $paymentMethodId): array
    {
        $cliente = $pedido->cliente;

        $produtos = $pedido->itens
            ->map(fn ($item) => [
                'description' => (string) ($item->nome ?: 'Item'),
                'quantity' => (string) ($item->quantidade ?: 1),
                'price_unit' => number_format((float) $item->preco_unit, 2, '.', ''),
            ])
            ->values()
            ->all();

        if (empty($produtos)) {
            $produtos = [[
                'description' => 'Pedido '.$pedido->numero,
                'quantity' => '1',
                'price_unit' => number_format((float) $pedido->total, 2, '.', ''),
            ]];
        }

        return [
            'token_account' => $this->tokenAccount,
            'customer' => [
                'name' => (string) ($cliente?->nome ?: 'Cliente'),
                'email' => (string) ($cliente?->email ?: ''),
                'cpf' => preg_replace('/\D/', '', (string) ($cliente?->cpf_cnpj ?: '')),
                'contacts' => array_filter([
                    $cliente?->telefone ? [
                        'type_contact' => 'M',
                        'number_contact' => preg_replace('/\D/', '', (string) $cliente->telefone),
                    ] : null,
                ]),
            ],
            'transaction' => [
                'order_number' => $pedido->numero,
                // wh_secret autentica a notificação (ver WebhookPagamentoController).
                'url_notification' => route('api.v1.webhooks.pagamento', [
                    'wh_secret' => config('services.payment.webhook_secret'),
                ]),
                'available_payment_methods' => $paymentMethodId,
            ],
            'transaction_product' => $produtos,
            'payment' => [
                'payment_method_id' => $paymentMethodId,
            ],
        ];
    }

    private function normalizarStatus(string $statusName): string
    {
        return match (mb_strtolower(trim($statusName))) {
            'aprovada', 'paga', 'concluída', 'concluida' => 'aprovado',
            'cancelada', 'negada', 'contestada', 'monitoramento' => 'rejeitado',
            'estornada', 'devolvida' => 'estornado',
            default => 'pendente',
        };
    }

    private function client()
    {
        return Http::baseUrl($this->sandbox ? self::SANDBOX_URL : self::PROD_URL)
            ->acceptJson()
            ->asJson();
    }
}
