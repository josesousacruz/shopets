<?php

namespace App\Domain\Payment;

use App\Models\Pedido;

interface PaymentGatewayInterface
{
    /**
     * Cria uma cobrança no gateway para o pedido.
     *
     * @return array{gateway_id:string, status:string, pix_qr?:string, pix_copia_cola?:string, boleto_url?:string}
     */
    public function criarCobranca(Pedido $pedido, string $metodo): array;

    /**
     * Consulta o status atual da cobrança no gateway.
     * Retorna um dos: pendente|aprovado|rejeitado|estornado.
     */
    public function consultarStatus(string $gatewayId): string;

    /**
     * Solicita estorno (total ou parcial) de uma cobrança.
     */
    public function estornar(string $gatewayId, float $valor): bool;
}
