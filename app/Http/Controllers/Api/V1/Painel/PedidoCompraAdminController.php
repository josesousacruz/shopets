<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\PedidoCompra;
use App\Services\Compras\PedidoCompraInvalidoException;
use App\Services\Compras\PedidoCompraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PedidoCompraAdminController extends Controller
{
    public function __construct(private readonly PedidoCompraService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $q = PedidoCompra::query()
            ->with(['fornecedor:id_fornecedor,nome', 'deposito:id,nome'])
            ->withCount('itens')
            ->when($request->query('status'), fn ($qq, $v) => $qq->where('status', $v))
            ->when($request->query('fornecedor_id'), fn ($qq, $v) => $qq->where('fornecedor_id', $v))
            ->when($request->query('de'), fn ($qq, $v) => $qq->whereDate('created_at', '>=', $v))
            ->when($request->query('ate'), fn ($qq, $v) => $qq->whereDate('created_at', '<=', $v))
            ->when($request->query('q'), fn ($qq, $v) => $qq->where('numero', 'like', "%{$v}%"));

        $page = $q->latest()->paginate(20);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'total' => $page->total(),
                'per_page' => $page->perPage(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $po = PedidoCompra::with([
            'fornecedor:id_fornecedor,nome,cnpj',
            'deposito:id,nome',
            'itens.variacao:id_variacao,id_produto,sku',
            'itens.variacao.produto:id_produto,nome',
            'recebimentos.itens',
        ])->findOrFail($id);

        return response()->json(['data' => $po]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validar($request);
        $po = $this->service->criar($data, $request->user()->id);

        return response()->json(['data' => $po], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $po = PedidoCompra::findOrFail($id);
        $data = $this->validar($request, parcial: true);

        try {
            $po = $this->service->atualizar($po, $data);
        } catch (PedidoCompraInvalidoException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return response()->json(['data' => $po]);
    }

    public function destroy(int $id): JsonResponse
    {
        $po = PedidoCompra::findOrFail($id);
        abort_unless($po->status === 'rascunho', 422, 'Apenas rascunhos podem ser excluídos.');
        $po->delete();

        return response()->json(null, 204);
    }

    public function enviar(int $id): JsonResponse
    {
        $po = PedidoCompra::findOrFail($id);

        try {
            $po = $this->service->enviar($po);
        } catch (PedidoCompraInvalidoException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return response()->json(['data' => $po]);
    }

    public function receber(Request $request, int $id): JsonResponse
    {
        $po = PedidoCompra::findOrFail($id);
        $payload = $request->validate([
            'data' => ['nullable', 'date'],
            'nota_fiscal' => ['nullable', 'string', 'max:50'],
            'observacoes' => ['nullable', 'string'],
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.item_id' => ['required', 'integer'],
            'itens.*.qtd_recebida' => ['required', 'integer', 'min:0'],
        ]);

        try {
            $receb = $this->service->receber($po, $payload, $request->user()->id);
        } catch (PedidoCompraInvalidoException $e) {
            throw ValidationException::withMessages(['itens' => $e->getMessage()]);
        }

        return response()->json(['data' => $receb->load('itens'), 'pedido' => $po->fresh()], 201);
    }

    public function cancelar(int $id): JsonResponse
    {
        $po = PedidoCompra::findOrFail($id);

        try {
            $po = $this->service->cancelar($po);
        } catch (PedidoCompraInvalidoException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return response()->json(['data' => $po]);
    }

    private function validar(Request $request, bool $parcial = false): array
    {
        $req = $parcial ? 'sometimes' : 'required';

        return $request->validate([
            'fornecedor_id' => [$req, 'integer', 'exists:fornecedores,id_fornecedor'],
            'deposito_id' => [$req, 'integer', 'exists:depositos,id'],
            'previsao_entrega' => ['nullable', 'date'],
            'frete' => ['nullable', 'numeric', 'min:0'],
            'desconto' => ['nullable', 'numeric', 'min:0'],
            'condicao_pagamento' => ['nullable', 'string', 'max:50'],
            'observacoes' => ['nullable', 'string'],
            'itens' => [$req, 'array', 'min:1'],
            'itens.*.produto_variacao_id' => ['required_with:itens', 'integer', 'exists:produto_variacoes,id_variacao'],
            'itens.*.qtd' => ['required_with:itens', 'integer', 'min:1'],
            'itens.*.custo_unit' => ['required_with:itens', 'numeric', 'min:0'],
        ]);
    }
}
