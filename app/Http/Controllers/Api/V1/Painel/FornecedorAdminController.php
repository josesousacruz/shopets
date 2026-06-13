<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\Fornecedor;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FornecedorAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Fornecedor::query()
            ->withCount('produtos')
            ->when($request->query('q'), function ($qq, $v) {
                $qq->where(fn ($w) => $w->where('nome', 'like', "%{$v}%")
                    ->orWhere('cnpj', 'like', "%{$v}%")
                    ->orWhere('email', 'like', "%{$v}%"));
            })
            ->when($request->query('status') === 'ativo', fn ($qq) => $qq->where('ativo', true))
            ->when($request->query('status') === 'inativo', fn ($qq) => $qq->where('ativo', false));

        $page = $q->orderBy('nome')->paginate(20);

        return response()->json([
            'data' => $page->items(),
            'meta' => $this->meta($page),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $f = Fornecedor::withCount('produtos')->findOrFail($id);

        return response()->json(['data' => $f]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validar($request);
        $f = Fornecedor::create($data);

        return response()->json(['data' => $f], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $f = Fornecedor::findOrFail($id);
        $f->update($this->validar($request, $id));

        return response()->json(['data' => $f->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        Fornecedor::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    /** Produtos vinculados ao fornecedor (pivot produtos_fornecedores). */
    public function produtos(int $id): JsonResponse
    {
        $f = Fornecedor::findOrFail($id);
        $produtos = $f->produtos()->get(['produtos.id_produto', 'produtos.nome'])
            ->map(fn ($p) => [
                'id_produto' => $p->id_produto,
                'nome' => $p->nome,
                'codigo_fornecedor' => $p->pivot->codigo_fornecedor,
                'codigo_no_fornecedor' => $p->pivot->codigo_no_fornecedor ?? null,
                'preco_custo_fornecedor' => $p->pivot->preco_custo_fornecedor,
                'fornecedor_principal' => (bool) $p->pivot->fornecedor_principal,
            ]);

        return response()->json(['data' => $produtos]);
    }

    /** Vincula/atualiza um produto ao fornecedor. */
    public function vincularProduto(Request $request, int $id): JsonResponse
    {
        $f = Fornecedor::findOrFail($id);
        $data = $request->validate([
            'id_produto' => ['required', 'integer', 'exists:produtos,id_produto'],
            'codigo_no_fornecedor' => ['nullable', 'string', 'max:80'],
            'preco_custo_fornecedor' => ['nullable', 'numeric', 'min:0'],
            'fornecedor_principal' => ['sometimes', 'boolean'],
        ]);

        $f->produtos()->syncWithoutDetaching([
            $data['id_produto'] => [
                'codigo_no_fornecedor' => $data['codigo_no_fornecedor'] ?? null,
                'preco_custo_fornecedor' => $data['preco_custo_fornecedor'] ?? null,
                'fornecedor_principal' => $data['fornecedor_principal'] ?? false,
                'ativo' => true,
            ],
        ]);

        return response()->json(['data' => ['ok' => true]], 201);
    }

    public function desvincularProduto(int $id, int $produto): JsonResponse
    {
        Fornecedor::findOrFail($id)->produtos()->detach($produto);

        return response()->json(null, 204);
    }

    /** Histórico de pedidos de compra + métricas agregadas. */
    public function historico(int $id): JsonResponse
    {
        $f = Fornecedor::findOrFail($id);
        $pedidos = $f->pedidosCompra()->latest()->limit(50)->get();

        return response()->json([
            'data' => [
                'pedidos' => $pedidos,
                'metricas' => [
                    'total_pedidos' => $f->pedidosCompra()->count(),
                    'total_comprado' => (float) $f->pedidosCompra()->where('status', '!=', 'cancelado')->sum('total'),
                    'ultimo_pedido' => $f->pedidosCompra()->latest()->value('created_at'),
                ],
            ],
        ]);
    }

    public function documentos(int $id): JsonResponse
    {
        $f = Fornecedor::findOrFail($id);

        return response()->json(['data' => $this->serializeDocumentos($f)]);
    }

    public function anexarDocumento(Request $request, int $id): JsonResponse
    {
        $request->validate(['arquivo' => ['required', 'file', 'max:10240']]);
        $f = Fornecedor::findOrFail($id);
        $f->addMediaFromRequest('arquivo')->toMediaCollection('documentos');

        return response()->json(['data' => $this->serializeDocumentos($f)], 201);
    }

    public function removerDocumento(int $id, int $media): JsonResponse
    {
        $f = Fornecedor::findOrFail($id);
        $item = $f->getMedia('documentos')->firstWhere('id', $media);
        abort_unless($item, 404);
        $item->delete();

        return response()->json(null, 204);
    }

    // ---- internos -------------------------------------------------------

    private function validar(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'nome' => ['required', 'string', 'max:150'],
            'cnpj' => ['nullable', 'string', 'max:18'],
            'telefone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'endereco' => ['nullable', 'string'],
            'contato_principal' => ['nullable', 'string', 'max:100'],
            'observacoes' => ['nullable', 'string'],
            'prazo_medio_dias' => ['nullable', 'integer', 'min:0'],
            'condicao_pagamento_padrao' => ['nullable', 'string', 'max:50'],
            'desconto_padrao' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'ativo' => ['sometimes', 'boolean'],
        ]);
    }

    private function serializeDocumentos(Fornecedor $f): array
    {
        return $f->getMedia('documentos')->map(fn ($m) => [
            'id' => $m->id,
            'nome' => $m->file_name,
            'tamanho' => $m->size,
            'url' => $m->getUrl(),
            'criado_em' => $m->created_at,
        ])->all();
    }

    private function meta($page): array
    {
        return [
            'total' => $page->total(),
            'per_page' => $page->perPage(),
            'current_page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
        ];
    }
}
