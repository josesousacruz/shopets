<?php

namespace App\Domain\Shipping;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Integração real com o Melhor Envio (atrás da flag de config).
 *
 * Só é usada quando config('services.shipping.driver') === 'melhorenvio'.
 * O token vem de config('services.shipping.melhorenvio.token'); ausente → RuntimeException.
 * A base URL alterna entre sandbox e produção conforme services.shipping.melhorenvio.sandbox.
 */
class MelhorEnvioService implements ShippingQuoteInterface
{
    private const PESO_PADRAO_GRAMAS = 200;

    private const SANDBOX_URL = 'https://sandbox.melhorenvio.com.br';

    private const PROD_URL = 'https://www.melhorenvio.com.br';

    public function __construct(
        private readonly ?string $token = null,
        private readonly bool $sandbox = true,
    ) {}

    public function cotar(string $cepDestino, Collection $itens): array
    {
        $cepDestino = preg_replace('/\D/', '', $cepDestino);

        $produtos = $itens->map(fn ($item) => [
            'weight' => (float) (data_get($item, 'peso_gramas') ?: self::PESO_PADRAO_GRAMAS) / 1000.0,
            'quantity' => (int) (data_get($item, 'quantidade') ?: 1),
            'width' => 11,
            'height' => 2,
            'length' => 16,
        ])->values()->all();

        $resposta = $this->client()
            ->post('/api/v2/me/shipment/calculate', [
                'from' => ['postal_code' => (string) config('services.shipping.melhorenvio.cep_origem', '01001000')],
                'to' => ['postal_code' => $cepDestino],
                'products' => $produtos,
            ])
            ->throw()
            ->json();

        return collect($resposta)
            ->filter(fn ($o) => empty($o['error']))
            ->map(fn ($o) => [
                // ID numérico do serviço no ME — necessário depois pra comprar a
                // etiqueta real (POST /me/cart exige `service`). Ausente no stub.
                'id' => isset($o['id']) ? (string) $o['id'] : null,
                'servico' => $o['name'] ?? 'Frete',
                'transportadora' => data_get($o, 'company.name', 'Transportadora'),
                'preco' => (float) ($o['price'] ?? 0),
                'prazo_dias' => (int) ($o['delivery_time'] ?? 0),
            ])
            ->values()
            ->all();
    }

    /**
     * Adiciona o pedido ao carrinho do ME, compra e gera a etiqueta.
     * Retorna a URL/identificador da etiqueta gerada.
     */
    public function gerarEtiqueta(array $payload): string
    {
        $cart = $this->client()
            ->post('/api/v2/me/cart', $payload)
            ->throw()
            ->json();

        $ids = ['orders' => [$cart['id'] ?? null]];

        $this->client()->post('/api/v2/me/shipment/checkout', $ids)->throw();
        $this->client()->post('/api/v2/me/shipment/generate', $ids)->throw();

        $print = $this->client()
            ->post('/api/v2/me/shipment/print', ['mode' => 'public'] + $ids)
            ->throw()
            ->json();

        return $print['url'] ?? '';
    }

    /**
     * Consulta o rastreio de uma ou mais etiquetas no ME.
     */
    public function rastrear(string $idEtiqueta): array
    {
        return $this->client()
            ->post('/api/v2/me/shipment/tracking', ['orders' => [$idEtiqueta]])
            ->throw()
            ->json();
    }

    private function client()
    {
        if (empty($this->token)) {
            throw new RuntimeException('configure MELHORENVIO_TOKEN');
        }

        return Http::baseUrl($this->sandbox ? self::SANDBOX_URL : self::PROD_URL)
            ->withToken($this->token)
            // Obrigatório pelo Melhor Envio: requisições sem User-Agent são bloqueadas.
            ->withHeaders(['User-Agent' => (string) config('services.shipping.melhorenvio.user_agent', 'Pontto')])
            ->acceptJson()
            ->asJson();
    }
}
