<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Domain\Payment\PaymentGatewayInterface;
use App\Http\Controllers\Controller;
use App\Models\DevolucaoPedido;
use App\Models\MovimentacaoEstoque;
use App\Models\PagamentoPedido;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DevolucaoAdminController extends Controller
{
    public function __construct(
        private readonly PaymentGatewayInterface $gateway,
    ) {
    }

    /** Transições permitidas da máquina de estados de devolução. */
    private const TRANSICOES = [
        'solicitada' => ['aprovada', 'rejeitada'],
        'aprovada' => ['recebida', 'rejeitada'],
        'recebida' => ['reembolsada'],
        'reembolsada' => [],
        'rejeitada' => [],
    ];

    /**
     * GET /api/v1/painel/devolucoes — fila, filtro por status.
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $query = DevolucaoPedido::query()
            ->with(['pedido:id_pedido,numero', 'cliente:id_cliente,nome,email'])
            ->orderByDesc('id_devolucao');

        if ($status && array_key_exists($status, self::TRANSICOES)) {
            $query->where('status', $status);
        }

        $devolucoes = $query->paginate((int) $request->integer('por_pagina', 20));

        $devolucoes->getCollection()->transform(fn (DevolucaoPedido $d) => [
            'id' => $d->id_devolucao,
            'pedido' => $d->pedido?->numero,
            'cliente' => $d->cliente?->nome,
            'status' => $d->status,
            'motivo' => $d->motivo,
            'valor_reembolso' => $d->valor_reembolso !== null ? (float) $d->valor_reembolso : null,
            'criado_em' => optional($d->created_at)->toIso8601String(),
        ]);

        return response()->json([
            'data' => $devolucoes->items(),
            'meta' => [
                'current_page' => $devolucoes->currentPage(),
                'last_page' => $devolucoes->lastPage(),
                'per_page' => $devolucoes->perPage(),
                'total' => $devolucoes->total(),
            ],
            'status_options' => array_keys(self::TRANSICOES),
        ]);
    }

    /**
     * GET /api/v1/painel/devolucoes/{id}
     */
    public function show(int $id): JsonResponse
    {
        $dev = DevolucaoPedido::with(['pedido:id_pedido,numero,total', 'cliente:id_cliente,nome,email', 'itens.pedidoItem'])
            ->where('id_devolucao', $id)
            ->firstOrFail();

        return response()->json(['data' => $this->serializar($dev)]);
    }

    public function aprovar(int $id): JsonResponse
    {
        return $this->transicionar($id, 'aprovada', 'Devolução aprovada.');
    }

    public function rejeitar(Request $request, int $id): JsonResponse
    {
        $obs = $request->validate(['observacao_admin' => ['nullable', 'string', 'max:1000']]);

        return $this->transicionar($id, 'rejeitada', 'Devolução rejeitada.', $obs['observacao_admin'] ?? null);
    }

    public function receber(int $id): JsonResponse
    {
        return $this->transicionar($id, 'recebida', 'Itens recebidos de volta.');
    }

    /**
     * PUT /api/v1/painel/devolucoes/{id}/reembolsar
     * Chama o gateway::estornar no pagamento aprovado do pedido, marca reembolsada,
     * grava valor_reembolso e devolve o estoque dos itens.
     */
    public function reembolsar(int $id): JsonResponse
    {
        $dev = DevolucaoPedido::with(['itens.pedidoItem', 'pedido'])
            ->where('id_devolucao', $id)
            ->firstOrFail();

        if (! in_array('reembolsada', self::TRANSICOES[$dev->status] ?? [], true)) {
            return response()->json([
                'message' => "Transição inválida de {$dev->status} para reembolsada.",
            ], 422);
        }

        // Calcula o valor do reembolso a partir dos itens devolvidos.
        $valor = 0.0;
        foreach ($dev->itens as $item) {
            $valor += (float) $item->quantidade * (float) ($item->pedidoItem?->preco_unit ?? 0);
        }

        // Estorno no gateway sobre o pagamento aprovado do pedido.
        $pagamento = PagamentoPedido::where('id_pedido', $dev->id_pedido)
            ->where('status', 'aprovado')
            ->orderByDesc('id_pagamento_pedido')
            ->first();

        if ($pagamento && $pagamento->gateway_id_externo) {
            $this->gateway->estornar($pagamento->gateway_id_externo, $valor);
        }

        DB::transaction(function () use ($dev, $valor) {
            $dev->update([
                'status' => 'reembolsada',
                'valor_reembolso' => $valor,
            ]);

            // Devolve o estoque dos itens devolvidos (movimentação tipo 'devolucao').
            $idUsuario = config('ecommerce.system_user_id');
            $idUsuario = $idUsuario instanceof \Closure ? $idUsuario() : $idUsuario;
            $idUsuario = $idUsuario ?: auth()->id();

            foreach ($dev->itens as $item) {
                $idProduto = $item->pedidoItem?->id_produto;
                if (! $idProduto) {
                    continue;
                }
                Produto::where('id_produto', $idProduto)->increment('estoque_atual', (float) $item->quantidade);

                MovimentacaoEstoque::create([
                    'id_produto' => $idProduto,
                    'id_usuario' => $idUsuario,
                    'tipo_movimentacao' => 'devolucao',
                    'quantidade' => (float) $item->quantidade,
                    'valor_unitario' => (float) ($item->pedidoItem?->preco_unit ?? 0),
                    'data_movimentacao' => now(),
                ]);
            }
        });

        return response()->json(['data' => $this->serializar($dev->fresh()->load(['itens.pedidoItem', 'pedido', 'cliente']))]);
    }

    private function transicionar(int $id, string $novo, string $descricao, ?string $obs = null): JsonResponse
    {
        $dev = DevolucaoPedido::where('id_devolucao', $id)->firstOrFail();

        if (! in_array($novo, self::TRANSICOES[$dev->status] ?? [], true)) {
            return response()->json([
                'message' => "Transição inválida de {$dev->status} para {$novo}.",
            ], 422);
        }

        $dev->update(array_filter([
            'status' => $novo,
            'observacao_admin' => $obs,
        ], fn ($v) => $v !== null));

        return response()->json(['data' => $this->serializar($dev->fresh()->load(['itens', 'pedido', 'cliente']))]);
    }

    private function serializar(DevolucaoPedido $d): array
    {
        return [
            'id' => $d->id_devolucao,
            'pedido' => $d->pedido?->numero,
            'cliente' => $d->cliente?->nome,
            'status' => $d->status,
            'motivo' => $d->motivo,
            'observacao_admin' => $d->observacao_admin,
            'valor_reembolso' => $d->valor_reembolso !== null ? (float) $d->valor_reembolso : null,
            'criado_em' => optional($d->created_at)->toIso8601String(),
            'itens' => $d->itens->map(fn ($i) => [
                'id_pedido_item' => $i->id_pedido_item,
                'quantidade' => (float) $i->quantidade,
                'nome' => $i->pedidoItem?->nome,
            ]),
        ];
    }
}
