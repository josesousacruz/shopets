<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Order\MarcarPedidoPagoAction;
use App\Http\Controllers\Controller;
use App\Models\PagamentoPedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Webhook público de pagamento. Identifica o PagamentoPedido por gateway_id_externo,
 * atualiza o status e, quando aprovado, dispara MarcarPedidoPagoAction (idempotente).
 *
 * TODO (MP real): validar assinatura (x-signature) antes de processar.
 */
class WebhookPagamentoController extends Controller
{
    public function __invoke(Request $request, MarcarPedidoPagoAction $marcarPago): JsonResponse
    {
        $gatewayId = $request->input('gateway_id')
            ?? $request->input('data.id')
            ?? $request->input('id');

        $statusRecebido = $request->input('status', 'aprovado');

        if (! $gatewayId) {
            return response()->json(['message' => 'gateway_id ausente.'], 422);
        }

        $pagamento = PagamentoPedido::where('gateway_id_externo', $gatewayId)->first();

        if (! $pagamento) {
            // Responde 200 para o gateway não reenviar indefinidamente; loga.
            Log::warning('Webhook pagamento: gateway_id desconhecido.', ['gateway_id' => $gatewayId]);

            return response()->json(['message' => 'Pagamento não encontrado.'], 200);
        }

        $statusNormalizado = $this->normalizarStatus($statusRecebido);

        $pagamento->update([
            'status' => $statusNormalizado,
            'dados_brutos' => $request->all(),
            'processado_em' => now(),
        ]);

        if ($statusNormalizado === 'aprovado' && $pagamento->pedido) {
            // Idempotente: se já foi processado, no-op.
            $marcarPago->executar($pagamento->pedido);
        }

        return response()->json([
            'message' => 'ok',
            'status' => $statusNormalizado,
        ]);
    }

    private function normalizarStatus(string $status): string
    {
        return match (strtolower($status)) {
            'approved', 'aprovado', 'paid', 'pago' => 'aprovado',
            'rejected', 'rejeitado', 'cancelled', 'cancelado' => 'rejeitado',
            'refunded', 'estornado' => 'estornado',
            default => 'pendente',
        };
    }
}
