<?php

namespace App\Domain\Order;

use RuntimeException;

/**
 * Lançada quando uma transição de status de pedido não é permitida
 * pela máquina de estados.
 */
class TransicaoInvalidaException extends RuntimeException
{
    public function __construct(
        public readonly string $de,
        public readonly string $para,
    ) {
        parent::__construct("Transição inválida: de \"{$de}\" para \"{$para}\".");
    }
}
