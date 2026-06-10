<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Order\MarcarPedidoPagoAction;
use App\Domain\Payment\FakePaymentGateway;
use App\Domain\Payment\PaymentGatewayInterface;
use App\Http\Controllers\Controller;
use App\Models\PagamentoPedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PagamentoController extends Controller
{
    public function __construct(
        private readonly PaymentGatewayInterface $gateway,
    ) {
    }

    /**
     * POST /api/v1/pedidos/{numero}/pagar
     * Cria a cobrança no gateway e retorna os dados de pagamento (QR Pix etc).
     * Escopado ao cliente. Idempotente: se já há pagamento aprovado, devolve 200.
     */
    public function pagar(Request $request, string $numero): JsonResponse
    {
        $data = $request->validate([
            'metodo' => ['nullable', 'in:pix,cartao_credito,boleto'],
        ]);
        $metodo = $data['metodo'] ?? 'pix';

        $pedido = $request->user()->pedidos()
            ->where('numero', $numero)
            ->firstOrFail();

        // Idempotência: pedido já pago.
        if ($pedido->id_venda || $pedido->status === 'pago') {
            return response()->json([
                'message' => 'Pedido já está pago.',
                'status' => $pedido->status,
            ], 200);
        }

        if (! in_array($pedido->status, ['aguardando_pagamento'], true)) {
            return response()->json([
                'message' => 'Pedido não está aguardando pagamento.',
                'status' => $pedido->status,
            ], 422);
        }

        // Reaproveita pagamento pendente existente (cobrança idempotente).
        $pagamentoExistente = PagamentoPedido::where('id_pedido', $pedido->id_pedido)
            ->where('status', 'pendente')
            ->where('metodo', $metodo)
            ->first();

        $cobranca = $this->gateway->criarCobranca($pedido, $metodo);

        $pagamento = DB::transaction(function () use ($pagamentoExistente, $pedido, $metodo, $cobranca) {
            $payload = [
                'gateway' => config('services.payment.driver', 'fake'),
                'gateway_id_externo' => $cobranca['gateway_id'],
                'metodo' => $metodo,
                'status' => $cobranca['status'] ?? 'pendente',
                'valor' => (float) $pedido->total,
                'dados_brutos' => $cobranca,
            ];

            if ($pagamentoExistente) {
                $pagamentoExistente->update($payload);

                return $pagamentoExistente->fresh();
            }

            return PagamentoPedido::create(array_merge(['id_pedido' => $pedido->id_pedido], $payload));
        });

        return response()->json([
            'pedido' => $pedido->numero,
            'gateway_id' => $pagamento->gateway_id_externo,
            'metodo' => $pagamento->metodo,
            'status' => $pagamento->status,
            'valor' => (float) $pagamento->valor,
            'pix_qr' => $cobranca['pix_qr'] ?? null,
            'pix_copia_cola' => $cobranca['pix_copia_cola'] ?? null,
            'boleto_url' => $cobranca['boleto_url'] ?? null,
        ], 201);
    }

    /**
     * POST /api/v1/dev/pagamentos/{gatewayId}/aprovar
     * Simula o webhook de aprovação. Disponível só em local ou com driver=fake.
     */
    public function aprovarDev(Request $request, string $gatewayId, MarcarPedidoPagoAction $marcarPago): JsonResponse
    {
        if (! app()->environment('local') && config('services.payment.driver') !== 'fake') {
            abort(404);
        }

        if (! $this->gateway instanceof FakePaymentGateway) {
            abort(404);
        }

        $pagamento = $this->gateway->aprovar($gatewayId);

        if (! $pagamento) {
            return response()->json(['message' => 'Pagamento não encontrado.'], 404);
        }

        $pedido = $pagamento->pedido;
        if ($pedido) {
            $marcarPago->executar($pedido);
        }

        return response()->json([
            'message' => 'Pagamento aprovado (dev).',
            'gateway_id' => $gatewayId,
            'pedido' => $pedido?->numero,
            'status' => $pedido?->fresh()->status,
        ]);
    }
}
