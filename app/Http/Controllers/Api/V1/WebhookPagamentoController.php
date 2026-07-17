<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Order\MarcarPedidoPagoAction;
use App\Domain\Payment\FakePaymentGateway;
use App\Domain\Payment\MercadoPagoGateway;
use App\Domain\Payment\PaymentGatewayInterface;
use App\Http\Controllers\Controller;
use App\Models\ConfiguracaoEmpresa;
use App\Models\PagamentoPedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Webhook público de pagamento. Identifica o PagamentoPedido por gateway_id_externo,
 * atualiza o status e, quando aprovado, dispara MarcarPedidoPagoAction (idempotente).
 *
 * Segurança: o `gateway_id` volta pro cliente na resposta do checkout
 * (`PagamentoController::pagar`), então o corpo do POST não é confiável por si só —
 * qualquer cliente logado poderia forjar a aprovação do próprio pedido. Duas camadas:
 * 1. `wh_secret` na query string (só o servidor conhece — ver `PAYMENT_WEBHOOK_SECRET`).
 * 2. Reconfirmação: para gateways reais, o status gravado nunca vem do corpo do POST,
 *    vem de `PaymentGatewayInterface::consultarStatus()` chamado de volta no gateway.
 *    FakePaymentGateway (dev/teste) não tem uma fonte externa pra reconfirmar contra
 *    (o próprio consultarStatus lê o mesmo registro que estamos atualizando aqui), então
 *    continua confiando no corpo — mas ainda exige o secret.
 * 3. Mercado Pago (quando ativo + secret configurado): valida também o header
 *    `x-signature` — ver assinaturaMercadoPagoValida().
 */
class WebhookPagamentoController extends Controller
{
    public function __construct(
        private readonly PaymentGatewayInterface $gateway,
    ) {}

    public function __invoke(Request $request, MarcarPedidoPagoAction $marcarPago): JsonResponse
    {
        if (! $this->secretValido($request)) {
            // 200 propositalmente: não entrega ao chamador se o secret existe/está certo
            // (evita dar pista pra quem tenta adivinhar). O warning fica pro monitoramento.
            Log::warning('Webhook pagamento: secret ausente ou inválido.', [
                'ip' => $request->ip(),
            ]);

            return response()->json(['message' => 'ok']);
        }

        if (! $this->assinaturaMercadoPagoValida($request)) {
            Log::warning('Webhook pagamento: x-signature do Mercado Pago inválida.', [
                'ip' => $request->ip(),
            ]);

            return response()->json(['message' => 'ok']);
        }

        $gatewayId = $request->input('gateway_id')
            ?? $request->input('data.id')
            // Mercado Pago também manda data.id na query string (vira data_id no PHP).
            ?? $request->query('data_id')
            ?? $request->input('id')
            // Yapay Intermediador envia transaction_id.
            ?? $request->input('transaction_id')
            ?? $request->input('transaction.transaction_id');

        if (! $gatewayId) {
            return response()->json(['message' => 'gateway_id ausente.'], 422);
        }

        $pagamento = PagamentoPedido::where('gateway_id_externo', $gatewayId)->first();

        if (! $pagamento) {
            // Responde 200 para o gateway não reenviar indefinidamente; loga.
            Log::warning('Webhook pagamento: gateway_id desconhecido.', ['gateway_id' => $gatewayId]);

            return response()->json(['message' => 'Pagamento não encontrado.'], 200);
        }

        $statusNormalizado = $this->resolverStatus($request, $gatewayId);

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

    /**
     * Fail-closed: sem `PAYMENT_WEBHOOK_SECRET` configurado, rejeita tudo — não
     * existe um estado "aberto por omissão" que alguém possa esquecer de fechar.
     */
    private function secretValido(Request $request): bool
    {
        $esperado = (string) config('services.payment.webhook_secret', '');

        if ($esperado === '') {
            return false;
        }

        return hash_equals($esperado, (string) $request->query('wh_secret', ''));
    }

    /**
     * Terceira camada, específica do Mercado Pago: valida o header `x-signature`
     * (HMAC-SHA256 do manifest `id:...;request-id:...;ts:...;` com o secret do
     * painel MP). Só se aplica quando o gateway ativo é o MP e o secret está
     * configurado — sem secret, as duas camadas gerais (wh_secret + reconfirmação
     * via consultarStatus) continuam cobrindo.
     *
     * @see https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
     */
    private function assinaturaMercadoPagoValida(Request $request): bool
    {
        // Secret vem da tela do admin (banco); .env como fallback.
        $secret = (string) (ConfiguracaoEmpresa::first()?->mercadopago_webhook_secret
            ?: config('services.payment.mercadopago.webhook_secret', ''));

        if (! $this->gateway instanceof MercadoPagoGateway || $secret === '') {
            return true;
        }

        // Header no formato "ts=1704908010,v1=618c8534...".
        $partes = [];
        foreach (explode(',', (string) $request->header('x-signature', '')) as $par) {
            [$chave, $valor] = array_pad(explode('=', trim($par), 2), 2, null);
            if ($chave !== null && $valor !== null) {
                $partes[trim($chave)] = trim($valor);
            }
        }

        $ts = $partes['ts'] ?? null;
        $v1 = $partes['v1'] ?? null;

        if ($ts === null || $v1 === null) {
            return false;
        }

        // O manifest usa o data.id da QUERY STRING (o PHP converte "data.id" em
        // "data_id"); seções sem valor ficam de fora do template.
        $dataId = $request->query('data_id') ?? $request->input('data.id');
        $requestId = $request->header('x-request-id');

        $manifest = '';
        if (! empty($dataId)) {
            $manifest .= 'id:'.mb_strtolower((string) $dataId).';';
        }
        if (! empty($requestId)) {
            $manifest .= 'request-id:'.$requestId.';';
        }
        $manifest .= 'ts:'.$ts.';';

        return hash_equals(hash_hmac('sha256', $manifest, $secret), $v1);
    }

    private function resolverStatus(Request $request, string $gatewayId): string
    {
        if ($this->gateway instanceof FakePaymentGateway) {
            $statusRecebido = $request->input('status')
                // Yapay envia status_name (ex.: "Aprovada", "Cancelada").
                ?? $request->input('status_name')
                ?? $request->input('transaction.status_name')
                ?? 'aprovado';

            return $this->normalizarStatus($statusRecebido);
        }

        // Gateway real: o corpo do POST é só o "toque de campainha" (indica QUAL
        // gateway_id mudou). O status gravado vem sempre da reconfirmação direta
        // com o gateway — nunca do que o chamador afirmou no corpo.
        return $this->gateway->consultarStatus($gatewayId);
    }

    private function normalizarStatus(string $status): string
    {
        return match (mb_strtolower(trim($status))) {
            'approved', 'aprovado', 'aprovada', 'paid', 'pago', 'paga', 'concluída', 'concluida' => 'aprovado',
            'rejected', 'rejeitado', 'rejeitada', 'cancelled', 'cancelado', 'cancelada', 'negada', 'contestada' => 'rejeitado',
            'refunded', 'estornado', 'estornada', 'devolvida' => 'estornado',
            default => 'pendente',
        };
    }
}
