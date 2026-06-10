<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\DevolucaoSolicitada;
use App\Models\DevolucaoPedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class DevolucaoController extends Controller
{
    /** Prazo de arrependimento (CDC art. 49): 7 dias após a entrega. */
    private const PRAZO_DIAS = 7;

    /**
     * GET /api/v1/pedidos/{numero}/devolucoes — devoluções do próprio pedido.
     */
    public function index(Request $request, string $numero): JsonResponse
    {
        $pedido = $request->user()->pedidos()->where('numero', $numero)->firstOrFail();

        $devolucoes = DevolucaoPedido::where('id_pedido', $pedido->id_pedido)
            ->with('itens')
            ->orderByDesc('id_devolucao')
            ->get();

        return response()->json(['data' => $devolucoes->map(fn ($d) => $this->serializar($d))]);
    }

    /**
     * POST /api/v1/pedidos/{numero}/devolucao — cliente solicita devolução.
     */
    public function store(Request $request, string $numero): JsonResponse
    {
        $data = $request->validate([
            'motivo' => ['required', 'string', 'max:1000'],
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.id_pedido_item' => ['required', 'integer'],
            'itens.*.quantidade' => ['required', 'numeric', 'min:0.01'],
        ]);

        // Escopo: só pedidos do próprio cliente (404 se não for dele).
        $pedido = $request->user()->pedidos()->where('numero', $numero)->firstOrFail();

        // Só pedidos enviados/entregues.
        if (! in_array($pedido->status, ['enviado', 'entregue'], true)) {
            throw ValidationException::withMessages([
                'pedido' => 'Devolução só é possível para pedidos enviados ou entregues.',
            ]);
        }

        // Janela CDC: 7 dias após a entrega. Se ainda não entregue (só enviado),
        // permite (cliente recebeu mas o lojista não marcou entregue ainda).
        if ($pedido->entregue_em && $pedido->entregue_em->lt(now()->subDays(self::PRAZO_DIAS))) {
            throw ValidationException::withMessages([
                'prazo' => 'Prazo de devolução (7 dias após a entrega) expirado.',
            ]);
        }

        // Itens precisam pertencer ao pedido.
        $idsValidos = $pedido->itens()->pluck('id_pedido_item')->all();
        foreach ($data['itens'] as $item) {
            if (! in_array($item['id_pedido_item'], $idsValidos, true)) {
                throw ValidationException::withMessages([
                    'itens' => 'Item não pertence a este pedido.',
                ]);
            }
        }

        $devolucao = DB::transaction(function () use ($pedido, $data) {
            $dev = DevolucaoPedido::create([
                'id_pedido' => $pedido->id_pedido,
                'id_cliente' => $pedido->id_cliente,
                'motivo' => $data['motivo'],
                'status' => 'solicitada',
            ]);

            foreach ($data['itens'] as $item) {
                $dev->itens()->create([
                    'id_pedido_item' => $item['id_pedido_item'],
                    'quantidade' => $item['quantidade'],
                ]);
            }

            return $dev;
        });

        // Notifica o lojista (ShouldQueue; em dev usa log).
        $emailLojista = config('mail.from.address', 'lojista@sistema.local');
        Mail::to($emailLojista)->queue(new DevolucaoSolicitada($devolucao));

        return response()->json([
            'data' => $this->serializar($devolucao->load('itens')),
        ], 201);
    }

    private function serializar(DevolucaoPedido $d): array
    {
        return [
            'id' => $d->id_devolucao,
            'status' => $d->status,
            'motivo' => $d->motivo,
            'valor_reembolso' => $d->valor_reembolso !== null ? (float) $d->valor_reembolso : null,
            'criado_em' => optional($d->created_at)->toIso8601String(),
            'itens' => $d->itens->map(fn ($i) => [
                'id_pedido_item' => $i->id_pedido_item,
                'quantidade' => (float) $i->quantidade,
            ]),
        ];
    }
}
