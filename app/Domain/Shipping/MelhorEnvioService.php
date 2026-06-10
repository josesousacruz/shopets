<?php

namespace App\Domain\Shipping;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Esqueleto da integração com Melhor Envio.
 *
 * Não usado por padrão. Para ativar: defina SHIPPING_DRIVER=melhor_envio e
 * configure o token (services.shipping.melhor_envio.token). A implementação
 * real deve chamar a API de cotação e mapear para o contrato da interface.
 */
class MelhorEnvioService implements ShippingQuoteInterface
{
    public function __construct(private readonly ?string $token = null)
    {
    }

    public function cotar(string $cepDestino, Collection $itens): array
    {
        if (empty($this->token)) {
            Log::warning('MelhorEnvioService chamado sem token configurado.');

            throw new RuntimeException(
                'Integração Melhor Envio não configurada: defina o token em services.shipping.melhor_envio.token.'
            );
        }

        // TODO: chamar API real de cotação do Melhor Envio e mapear a resposta.
        throw new RuntimeException('MelhorEnvioService::cotar() ainda não implementado.');
    }
}
