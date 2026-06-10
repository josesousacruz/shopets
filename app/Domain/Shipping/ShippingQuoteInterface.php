<?php

namespace App\Domain\Shipping;

use Illuminate\Support\Collection;

interface ShippingQuoteInterface
{
    /**
     * Cotação de frete para o CEP de destino.
     *
     * @param  string  $cepDestino  CEP destino (somente dígitos ou com máscara).
     * @param  Collection  $itens  Coleção de itens; cada item deve ter `quantidade`
     *                             e opcionalmente `peso_gramas` (fallback 200g).
     * @return array<int, array{servico:string, transportadora:string, preco:float, prazo_dias:int}>
     */
    public function cotar(string $cepDestino, Collection $itens): array;
}
