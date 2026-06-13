<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProdutoAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $busca = trim((string) $request->query('busca', ''));

        $query = Produto::query()
            ->with('categoria')
            ->orderByDesc('created_at');

        if ($busca !== '') {
            $query->where(function ($q) use ($busca) {
                $q->where('nome', 'like', "%{$busca}%")
                    ->orWhere('codigo_interno', 'like', "%{$busca}%")
                    ->orWhere('codigo_barras', 'like', "%{$busca}%");
            });
        }

        if ($request->filled('categoria')) {
            $query->where('id_categoria', $request->integer('categoria'));
        }

        $produtos = $query->paginate((int) $request->integer('por_pagina', 20));

        $produtos->getCollection()->transform(fn (Produto $p) => [
            'id' => $p->id_produto,
            'nome' => $p->nome,
            'slug' => $p->slug,
            'preco_venda' => (float) $p->preco_venda,
            'preco_promocional' => $p->preco_promocional !== null ? (float) $p->preco_promocional : null,
            'estoque_atual' => $p->estoque_atual,
            'ativo' => (bool) $p->ativo,
            'visivel_ecommerce' => (bool) $p->visivel_ecommerce,
            'categoria' => $p->categoria?->nome,
            'thumb' => $p->getImageUrl('thumb'),
        ]);

        return response()->json([
            'data' => $produtos->items(),
            'meta' => [
                'current_page' => $produtos->currentPage(),
                'last_page' => $produtos->lastPage(),
                'per_page' => $produtos->perPage(),
                'total' => $produtos->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $produto = Produto::with(['categoria', 'variacoes'])->findOrFail($id);

        return response()->json(['data' => $this->detalhe($produto)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validar($request);
        $data['slug'] = $this->slugUnico($data['slug'] ?? null, $data['nome']);
        $data['preco_custo'] ??= 0;

        $produto = Produto::create($data);

        return response()->json(['data' => $this->detalhe($produto->load(['categoria', 'variacoes']))], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $produto = Produto::findOrFail($id);
        $data = $this->validar($request, $produto->id_produto);

        if (array_key_exists('slug', $data)) {
            $data['slug'] = $this->slugUnico($data['slug'] ?: null, $data['nome'] ?? $produto->nome, $produto->id_produto);
        }

        $produto->update($data);

        return response()->json(['data' => $this->detalhe($produto->fresh(['categoria', 'variacoes']))]);
    }

    public function destroy(int $id): JsonResponse
    {
        Produto::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    /**
     * POST /produtos/bulk — edição em massa.
     * action: status | categoria | price_delta
     */
    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:produtos,id_produto'],
            'action' => ['required', 'in:status,categoria,price_delta'],
            'payload' => ['required', 'array'],
        ]);

        $produtos = Produto::whereIn('id_produto', $data['ids']);

        $afetados = match ($data['action']) {
            'status' => $this->bulkStatus($produtos, $data['payload']),
            'categoria' => $produtos->update(['id_categoria' => $data['payload']['id_categoria'] ?? null]),
            'price_delta' => $this->bulkPreco($data['ids'], $data['payload']),
        };

        return response()->json(['data' => ['afetados' => $afetados]]);
    }

    private function bulkStatus($query, array $payload): int
    {
        $update = [];
        if (array_key_exists('ativo', $payload)) {
            $update['ativo'] = (bool) $payload['ativo'];
        }
        if (array_key_exists('visivel_ecommerce', $payload)) {
            $update['visivel_ecommerce'] = (bool) $payload['visivel_ecommerce'];
        }

        return $update ? $query->update($update) : 0;
    }

    private function bulkPreco(array $ids, array $payload): int
    {
        $tipo = $payload['tipo'] ?? 'percentual'; // percentual | fixo
        $valor = (float) ($payload['valor'] ?? 0);
        $afetados = 0;

        foreach (Produto::whereIn('id_produto', $ids)->get() as $p) {
            $novo = $tipo === 'percentual'
                ? (float) $p->preco_venda * (1 + $valor / 100)
                : (float) $p->preco_venda + $valor;
            $p->update(['preco_venda' => round(max(0, $novo), 2)]);
            $afetados++;
        }

        return $afetados;
    }

    private function validar(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'descricao_curta' => ['nullable', 'string', 'max:500'],
            'descricao_longa' => ['nullable', 'string'],
            'preco_custo' => ['nullable', 'numeric', 'min:0'],
            'preco_venda' => ['required', 'numeric', 'min:0'],
            'preco_promocional' => ['nullable', 'numeric', 'min:0'],
            'id_categoria' => ['nullable', 'integer', 'exists:categorias,id_categoria'],
            'peso_gramas' => ['nullable', 'integer', 'min:0'],
            'altura_cm' => ['nullable', 'numeric', 'min:0'],
            'largura_cm' => ['nullable', 'numeric', 'min:0'],
            'comprimento_cm' => ['nullable', 'numeric', 'min:0'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'destaque' => ['sometimes', 'boolean'],
            'novo' => ['sometimes', 'boolean'],
            'em_promocao' => ['sometimes', 'boolean'],
            'visivel_ecommerce' => ['sometimes', 'boolean'],
            'ativo' => ['sometimes', 'boolean'],
            'estoque_atual' => ['sometimes', 'integer', 'min:0'],
            'estoque_minimo' => ['sometimes', 'integer', 'min:0'],
            'unidade' => ['sometimes', 'string', 'max:10'],
            'slug' => [
                'nullable', 'string', 'max:255',
                Rule::unique('produtos', 'slug')->ignore($ignoreId, 'id_produto'),
            ],
        ]);
    }

    private function slugUnico(?string $slug, string $nome, ?int $ignoreId = null): string
    {
        $base = Str::slug($slug ?: $nome) ?: 'produto';
        $candidato = $base;
        $i = 1;

        while (Produto::withoutGlobalScopes()
            ->where('slug', $candidato)
            ->when($ignoreId, fn ($q) => $q->where('id_produto', '!=', $ignoreId))
            ->exists()) {
            $candidato = $base.'-'.(++$i);
        }

        return $candidato;
    }

    private function detalhe(Produto $produto): array
    {
        return [
            'id' => $produto->id_produto,
            'nome' => $produto->nome,
            'slug' => $produto->slug,
            'descricao_curta' => $produto->descricao_curta,
            'descricao_longa' => $produto->descricao_longa,
            'preco_custo' => $produto->preco_custo !== null ? (float) $produto->preco_custo : null,
            'preco_venda' => (float) $produto->preco_venda,
            'preco_promocional' => $produto->preco_promocional !== null ? (float) $produto->preco_promocional : null,
            'id_categoria' => $produto->id_categoria,
            'categoria' => $produto->categoria?->nome,
            'peso_gramas' => $produto->peso_gramas,
            'altura_cm' => $produto->altura_cm !== null ? (float) $produto->altura_cm : null,
            'largura_cm' => $produto->largura_cm !== null ? (float) $produto->largura_cm : null,
            'comprimento_cm' => $produto->comprimento_cm !== null ? (float) $produto->comprimento_cm : null,
            'meta_title' => $produto->meta_title,
            'meta_description' => $produto->meta_description,
            'destaque' => (bool) $produto->destaque,
            'novo' => (bool) $produto->novo,
            'em_promocao' => (bool) $produto->em_promocao,
            'visivel_ecommerce' => (bool) $produto->visivel_ecommerce,
            'ativo' => (bool) $produto->ativo,
            'estoque_atual' => $produto->estoque_atual,
            'estoque_minimo' => $produto->estoque_minimo,
            'variacoes' => $produto->relationLoaded('variacoes')
                ? $produto->variacoes->map(fn ($v) => [
                    'id' => $v->id_variacao,
                    'sku' => $v->sku,
                    'nome_variacao' => $v->nome_variacao,
                    'atributos' => $v->atributos ?? [],
                    'preco_venda' => (float) $v->preco_venda,
                    'preco_promocional' => $v->preco_promocional !== null ? (float) $v->preco_promocional : null,
                    'estoque_atual' => (float) $v->estoque_atual,
                    'estoque_minimo' => (float) $v->estoque_minimo,
                    'ativo' => (bool) $v->ativo,
                ])->all()
                : [],
            'galeria' => $produto->getMedia('images')->map(fn ($m) => [
                'id' => $m->id,
                'url' => $m->getUrl(),
                'url_thumb' => $m->hasGeneratedConversion('thumb') ? $m->getUrl('thumb') : $m->getUrl(),
                'url_medium' => $m->hasGeneratedConversion('medium') ? $m->getUrl('medium') : $m->getUrl(),
                'url_large' => $m->hasGeneratedConversion('large') ? $m->getUrl('large') : $m->getUrl(),
                'ordem' => $m->order_column,
            ])->all(),
        ];
    }
}
