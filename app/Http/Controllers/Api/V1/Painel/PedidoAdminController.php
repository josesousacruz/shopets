<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Domain\Order\TransicaoInvalidaException;
use App\Domain\Order\TransicionarPedidoAction;
use App\Http\Controllers\Controller;
use App\Models\PagamentoPedido;
use App\Models\Pedido;
use App\Models\Venda;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PedidoAdminController extends Controller
{
    public function __construct(private readonly TransicionarPedidoAction $transicionar)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $busca = trim((string) $request->query('busca', ''));

        $query = Pedido::query()
            ->with(['cliente:id_cliente,nome,email'])
            ->withCount('itens')
            ->orderByDesc('created_at');

        if ($status && array_key_exists($status, TransicionarPedidoAction::TRANSICOES)) {
            $query->where('status', $status);
        }

        if ($busca !== '') {
            $query->where(function ($q) use ($busca) {
                $q->where('numero', 'like', "%{$busca}%")
                    ->orWhereHas('cliente', function ($c) use ($busca) {
                        $c->where('nome', 'like', "%{$busca}%")
                            ->orWhere('email', 'like', "%{$busca}%");
                    });
            });
        }

        $pedidos = $query->paginate((int) $request->integer('por_pagina', 20));

        $pedidos->getCollection()->transform(fn (Pedido $p) => [
            'numero' => $p->numero,
            'cliente' => $p->cliente?->nome ?? '—',
            'cliente_email' => $p->cliente?->email,
            'data' => optional($p->created_at)->toIso8601String(),
            'modalidade' => $p->modalidade,
            'total' => (float) $p->total,
            'status' => $p->status,
            'itens_count' => $p->itens_count,
        ]);

        return response()->json([
            'data' => $pedidos->items(),
            'meta' => [
                'current_page' => $pedidos->currentPage(),
                'last_page' => $pedidos->lastPage(),
                'per_page' => $pedidos->perPage(),
                'total' => $pedidos->total(),
            ],
            'status_options' => array_keys(TransicionarPedidoAction::TRANSICOES),
        ]);
    }

    public function show(string $numero): JsonResponse
    {
        $pedido = Pedido::query()
            ->where('numero', $numero)
            ->with([
                'cliente:id_cliente,nome,email,telefone,cpf_cnpj',
                'itens',
                'enderecoEntrega',
                'eventos' => fn ($q) => $q->orderByDesc('criado_em'),
            ])
            ->firstOrFail();

        $pagamento = PagamentoPedido::where('id_pedido', $pedido->id_pedido)
            ->orderByDesc('id_pagamento_pedido')
            ->first();

        $venda = $pedido->id_venda
            ? Venda::where('id_venda', $pedido->id_venda)->first(['id_venda', 'numero_venda'])
            : null;

        return response()->json([
            'data' => [
                'numero' => $pedido->numero,
                'status' => $pedido->status,
                'modalidade' => $pedido->modalidade,
                'subtotal' => (float) $pedido->subtotal,
                'frete' => (float) $pedido->frete,
                'desconto' => (float) $pedido->desconto,
                'total' => (float) $pedido->total,
                'frete_servico' => $pedido->frete_servico,
                'prazo_entrega_dias' => $pedido->prazo_entrega_dias,
                'codigo_rastreio' => $pedido->codigo_rastreio,
                'observacoes' => $pedido->observacoes,
                'criado_em' => optional($pedido->created_at)->toIso8601String(),
                'pago_em' => optional($pedido->pago_em)->toIso8601String(),
                'enviado_em' => optional($pedido->enviado_em)->toIso8601String(),
                'entregue_em' => optional($pedido->entregue_em)->toIso8601String(),
                'cancelado_em' => optional($pedido->cancelado_em)->toIso8601String(),
                'nfe_numero' => $pedido->nfe_numero,
                'nfe_chave' => $pedido->nfe_chave,
                'cliente' => $pedido->cliente ? [
                    'nome' => $pedido->cliente->nome,
                    'email' => $pedido->cliente->email,
                    'telefone' => $pedido->cliente->telefone,
                    'cpf_cnpj' => $pedido->cliente->cpf_cnpj,
                ] : null,
                'endereco' => $pedido->enderecoEntrega ? [
                    'logradouro' => $pedido->enderecoEntrega->logradouro,
                    'numero' => $pedido->enderecoEntrega->numero,
                    'complemento' => $pedido->enderecoEntrega->complemento,
                    'bairro' => $pedido->enderecoEntrega->bairro,
                    'cidade' => $pedido->enderecoEntrega->cidade,
                    'uf' => $pedido->enderecoEntrega->uf,
                    'cep' => $pedido->enderecoEntrega->cep,
                ] : null,
                'itens' => $pedido->itens->map(fn ($i) => [
                    'nome' => $i->nome,
                    'sku' => $i->sku,
                    'preco_unit' => (float) $i->preco_unit,
                    'quantidade' => $i->quantidade,
                    'subtotal' => (float) $i->subtotal,
                ]),
                'pagamento' => $pagamento ? [
                    'metodo' => $pagamento->metodo,
                    'status' => $pagamento->status,
                    'valor' => (float) $pagamento->valor,
                    'gateway' => $pagamento->gateway,
                    'processado_em' => optional($pagamento->processado_em)->toIso8601String(),
                ] : null,
                'venda' => $venda ? ['numero' => $venda->numero_venda] : null,
                'eventos' => $pedido->eventos->map(fn ($e) => [
                    'tipo' => $e->tipo,
                    'descricao' => $e->descricao,
                    'criado_em' => optional($e->criado_em)->toIso8601String(),
                ]),
            ],
        ]);
    }

    public function separacao(string $numero): JsonResponse
    {
        return $this->aplicar($numero, 'em_separacao', 'Pedido em separação.');
    }

    public function enviar(Request $request, string $numero): JsonResponse
    {
        $request->validate(['codigo_rastreio' => 'nullable|string|max:60']);

        return $this->aplicar(
            $numero,
            'enviado',
            'Pedido enviado.' . ($request->codigo_rastreio ? " Rastreio: {$request->codigo_rastreio}." : ''),
            function (Pedido $p) use ($request) {
                $p->codigo_rastreio = $request->codigo_rastreio ?: $p->codigo_rastreio;
            },
        );
    }

    public function entregar(string $numero): JsonResponse
    {
        return $this->aplicar($numero, 'entregue', 'Pedido entregue ao cliente.');
    }

    public function cancelar(Request $request, string $numero): JsonResponse
    {
        $request->validate(['motivo' => 'nullable|string|max:255']);

        return $this->aplicar(
            $numero,
            'cancelado',
            'Pedido cancelado.' . ($request->motivo ? " Motivo: {$request->motivo}." : ''),
        );
    }

    private function aplicar(string $numero, string $novoStatus, string $descricao, ?callable $extra = null): JsonResponse
    {
        $pedido = Pedido::where('numero', $numero)->firstOrFail();

        try {
            $this->transicionar->executar($pedido, $novoStatus, $descricao, $extra);
        } catch (TransicaoInvalidaException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'data' => [
                'numero' => $pedido->numero,
                'status' => $pedido->status,
                'codigo_rastreio' => $pedido->codigo_rastreio,
            ],
        ]);
    }
}
