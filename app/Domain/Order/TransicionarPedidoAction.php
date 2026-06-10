<?php

namespace App\Domain\Order;

use App\Models\Pedido;
use App\Models\PedidoEvento;
use Illuminate\Support\Facades\DB;

/**
 * Ação compartilhada de transição de status de pedido.
 *
 * Usada tanto pelo painel Inertia do PDV (Admin\LojaPedidoController) quanto
 * pela API do painel do lojista (Api\V1\Painel\PedidoAdminController), para
 * que a máquina de estados e o registro de eventos não sejam duplicados.
 */
class TransicionarPedidoAction
{
    /** Status válidos e suas transições permitidas. */
    public const TRANSICOES = [
        'aguardando_pagamento' => ['cancelado'],
        'pago' => ['em_separacao', 'cancelado'],
        'em_separacao' => ['enviado', 'cancelado'],
        'enviado' => ['entregue'],
        'entregue' => [],
        'cancelado' => [],
    ];

    /**
     * Aplica a transição validando a máquina de estados, gravando status +
     * timestamp e registrando um PedidoEvento — tudo dentro de uma transação.
     *
     * @param  callable(Pedido):void|null  $extra  ajustes adicionais no pedido (ex.: codigo_rastreio)
     *
     * @throws TransicaoInvalidaException
     */
    public function executar(
        Pedido $pedido,
        string $novoStatus,
        string $descricao,
        ?callable $extra = null,
        ?int $userId = null,
    ): Pedido {
        $atual = $pedido->status;
        $permitidos = self::TRANSICOES[$atual] ?? [];

        if (! in_array($novoStatus, $permitidos, true)) {
            throw new TransicaoInvalidaException($atual, $novoStatus);
        }

        return DB::transaction(function () use ($pedido, $novoStatus, $descricao, $extra, $userId) {
            $pedido->status = $novoStatus;

            // Timestamps padrão por status (extra pode sobrescrever).
            match ($novoStatus) {
                'enviado' => $pedido->enviado_em = now(),
                'entregue' => $pedido->entregue_em = now(),
                'cancelado' => $pedido->cancelado_em = now(),
                default => null,
            };

            if ($extra) {
                $extra($pedido);
            }

            $pedido->save();

            PedidoEvento::create([
                'id_pedido' => $pedido->id_pedido,
                'tipo' => $novoStatus,
                'descricao' => $descricao,
                'criado_por_user_id' => $userId ?? auth()->id(),
                'criado_em' => now(),
            ]);

            return $pedido;
        });
    }
}
