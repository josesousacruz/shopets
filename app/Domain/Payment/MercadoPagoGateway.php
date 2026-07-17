<?php

namespace App\Domain\Payment;

use App\Models\Pedido;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Gateway Mercado Pago (Pix via API de Payments).
 *
 * Ativado quando configuracoes_empresa.payment_driver === 'mercadopago'; o access
 * token vem da tela de Configurações (write-only, criptografado no banco).
 *
 * O MP não tem URL de sandbox separada: o ambiente é decidido pelas CREDENCIAIS —
 * access token (APP_USR-...) de conta de teste roteia automaticamente pro ambiente
 * de teste. O flag `mercadopago_sandbox` da tela é só aviso de qual token colar.
 *
 * Cartão exige tokenização no front (Checkout Bricks/Transparente) — fase 2.
 *
 * @see https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
 */
class MercadoPagoGateway implements PaymentGatewayInterface
{
    private const BASE_URL = 'https://api.mercadopago.com';

    public function __construct(private readonly ?string $accessToken = null) {}

    public function criarCobranca(Pedido $pedido, string $metodo): array
    {
        $this->exigirToken();

        if ($metodo !== 'pix') {
            throw new RuntimeException(
                "Método '{$metodo}' ainda não suportado pelo MercadoPagoGateway (cartão exige checkout no front — fase 2)."
            );
        }

        $pedido->loadMissing('cliente');

        $resposta = $this->client()
            // Idempotência exigida pelo MP: repetir a mesma chave não duplica a cobrança.
            ->withHeaders(['X-Idempotency-Key' => 'pedido-'.$pedido->numero.'-'.Str::uuid()])
            ->post('/v1/payments', $this->payload($pedido))
            ->throw()
            ->json();

        $pixData = data_get($resposta, 'point_of_interaction.transaction_data', []);
        $qrBase64 = data_get($pixData, 'qr_code_base64');

        return [
            'gateway_id' => (string) data_get($resposta, 'id'),
            'status' => $this->normalizarStatus((string) data_get($resposta, 'status', '')),
            // qr_code_base64 é a imagem do QR; qr_code é o copia-e-cola (payload EMV).
            'pix_qr' => $qrBase64 ? 'data:image/png;base64,'.$qrBase64 : null,
            'pix_copia_cola' => data_get($pixData, 'qr_code'),
        ];
    }

    public function consultarStatus(string $gatewayId): string
    {
        $this->exigirToken();

        $resposta = $this->client()
            ->get('/v1/payments/'.$gatewayId)
            ->throw()
            ->json();

        return $this->normalizarStatus((string) data_get($resposta, 'status', ''));
    }

    public function estornar(string $gatewayId, float $valor): bool
    {
        $this->exigirToken();

        $resposta = $this->client()
            ->withHeaders(['X-Idempotency-Key' => 'estorno-'.$gatewayId.'-'.Str::uuid()])
            ->post('/v1/payments/'.$gatewayId.'/refunds', [
                'amount' => round($valor, 2),
            ]);

        return $resposta->successful();
    }

    private function payload(Pedido $pedido): array
    {
        $cliente = $pedido->cliente;
        $cpfCnpj = preg_replace('/\D/', '', (string) ($cliente?->cpf_cnpj ?: ''));

        return [
            'transaction_amount' => round((float) $pedido->total, 2),
            'description' => 'Pedido '.$pedido->numero,
            'payment_method_id' => 'pix',
            'external_reference' => $pedido->numero,
            // wh_secret autentica a notificação (ver WebhookPagamentoController);
            // a assinatura x-signature do MP é validada por cima disso.
            'notification_url' => route('api.v1.webhooks.pagamento', [
                'wh_secret' => config('services.payment.webhook_secret'),
            ]),
            'payer' => array_filter([
                'email' => (string) ($cliente?->email ?: ''),
                'first_name' => Str::before((string) ($cliente?->nome ?: 'Cliente'), ' '),
                'identification' => $cpfCnpj !== '' ? [
                    'type' => strlen($cpfCnpj) > 11 ? 'CNPJ' : 'CPF',
                    'number' => $cpfCnpj,
                ] : null,
            ]),
        ];
    }

    private function normalizarStatus(string $status): string
    {
        return match (mb_strtolower(trim($status))) {
            'approved' => 'aprovado',
            'rejected', 'cancelled' => 'rejeitado',
            'refunded', 'charged_back' => 'estornado',
            // pending, authorized, in_process, in_mediation → aguardando definição.
            default => 'pendente',
        };
    }

    private function exigirToken(): void
    {
        if (empty($this->accessToken)) {
            throw new RuntimeException(
                'Gateway Mercado Pago não configurado. Cole o access token em Configurações → Pagamento/Frete.'
            );
        }
    }

    private function client()
    {
        return Http::baseUrl(self::BASE_URL)
            ->withToken($this->accessToken)
            ->acceptJson()
            ->asJson();
    }
}
