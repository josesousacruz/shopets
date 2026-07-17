<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Jobs\EmitirNotaFiscalJob;
use App\Models\Pedido;
use Illuminate\Http\JsonResponse;

/**
 * Fila de pedidos presos em 'aguardando_revisao_fiscal' — emissão de NF-e/NFC-e
 * falhou (config incompleta, SEFAZ fora do ar, etc.) e precisa de ação manual.
 * O pagamento e a venda já aconteceram; só a nota fiscal ficou pendente.
 */
class RevisaoFiscalAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $pedidos = Pedido::query()
            ->where('status', 'aguardando_revisao_fiscal')
            ->with(['cliente:id_cliente,nome,email', 'eventos' => fn ($q) => $q->where('tipo', 'revisao_fiscal')->orderByDesc('criado_em')])
            ->orderByDesc('updated_at')
            ->paginate(20);

        $pedidos->getCollection()->transform(fn (Pedido $p) => [
            'numero' => $p->numero,
            'modalidade' => $p->modalidade,
            'cliente' => $p->cliente?->nome ?? '—',
            'total' => (float) $p->total,
            'motivo' => $p->eventos->first()?->descricao,
            'atualizado_em' => optional($p->updated_at)->toIso8601String(),
        ]);

        return response()->json([
            'data' => $pedidos->items(),
            'meta' => [
                'current_page' => $pedidos->currentPage(),
                'last_page' => $pedidos->lastPage(),
                'total' => $pedidos->total(),
            ],
        ]);
    }

    public function reemitir(string $numero): JsonResponse
    {
        $pedido = Pedido::where('numero', $numero)
            ->where('status', 'aguardando_revisao_fiscal')
            ->firstOrFail();

        // Síncrono (não vai pra fila) — o operador quer saber o resultado na hora.
        (new EmitirNotaFiscalJob($pedido->id_pedido))->handle();

        $pedido->refresh();

        return response()->json([
            'data' => [
                'numero' => $pedido->numero,
                'status' => $pedido->status,
                'nfe_chave' => $pedido->nfe_chave,
                'resolvido' => $pedido->status !== 'aguardando_revisao_fiscal',
            ],
        ]);
    }
}
