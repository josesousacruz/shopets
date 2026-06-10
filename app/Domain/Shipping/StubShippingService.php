<?php

namespace App\Domain\Shipping;

use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Cálculo de frete determinístico para desenvolvimento.
 *
 * Peso total = Σ(peso_gramas × quantidade), fallback 200g por item.
 * Região via 1º dígito do CEP. Retorna PAC (barato/lento) e SEDEX (caro/rápido).
 */
class StubShippingService implements ShippingQuoteInterface
{
    private const PESO_PADRAO_GRAMAS = 200;

    public function cotar(string $cepDestino, Collection $itens): array
    {
        $cep = preg_replace('/\D/', '', $cepDestino);

        if (strlen($cep) !== 8) {
            throw ValidationException::withMessages([
                'cep' => 'CEP inválido. Informe 8 dígitos.',
            ]);
        }

        $pesoKg = $this->pesoTotalKg($itens);
        $regiao = (int) substr($cep, 0, 1); // 0..9
        $ajusteRegiao = $regiao * 1.5;

        $pacBase = 12.0 + ($pesoKg * 4.0) + $ajusteRegiao;
        $sedexBase = 22.0 + ($pesoKg * 7.5) + ($ajusteRegiao * 1.4);

        $prazoPac = 5 + $regiao;
        $prazoSedex = 2 + (int) ceil($regiao / 2);

        return [
            [
                'servico' => 'PAC',
                'transportadora' => 'Correios',
                'preco' => round($pacBase, 2),
                'prazo_dias' => $prazoPac,
            ],
            [
                'servico' => 'SEDEX',
                'transportadora' => 'Correios',
                'preco' => round($sedexBase, 2),
                'prazo_dias' => $prazoSedex,
            ],
        ];
    }

    private function pesoTotalKg(Collection $itens): float
    {
        $gramas = 0.0;

        foreach ($itens as $item) {
            $peso = (float) (data_get($item, 'peso_gramas') ?: self::PESO_PADRAO_GRAMAS);
            $qtd = (float) (data_get($item, 'quantidade') ?: 1);
            $gramas += $peso * $qtd;
        }

        return $gramas / 1000.0;
    }
}
