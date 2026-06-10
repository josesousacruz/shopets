<?php

namespace App\Domain\Payment;

use App\Models\Pedido;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Esqueleto do gateway Mercado Pago. Implementa a interface mas ainda não
 * integra com a API real — requer MERCADOPAGO_TOKEN + assinatura de webhook.
 * Ativado quando services.payment.driver === 'mercadopago'.
 *
 * TODO (followup): usar SDK MP, criar preferência/pagamento Pix, validar
 * x-signature do webhook, mapear status MP -> {pendente,aprovado,rejeitado,estornado}.
 */
class MercadoPagoGateway implements PaymentGatewayInterface
{
    public function __construct(private readonly ?string $token = null)
    {
    }

    public function criarCobranca(Pedido $pedido, string $metodo): array
    {
        $this->indisponivel();
    }

    public function consultarStatus(string $gatewayId): string
    {
        $this->indisponivel();
    }

    public function estornar(string $gatewayId, float $valor): bool
    {
        $this->indisponivel();
    }

    private function indisponivel(): never
    {
        Log::warning('MercadoPagoGateway acionado sem integração configurada. Configure MERCADOPAGO_TOKEN.');

        throw new RuntimeException('Gateway Mercado Pago não configurado. Defina MERCADOPAGO_TOKEN e implemente a integração.');
    }
}
