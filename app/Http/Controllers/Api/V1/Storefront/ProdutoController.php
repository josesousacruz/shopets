<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ProdutoDetalheResource;
use App\Http\Resources\V1\ProdutoListaResource;
use App\Models\Produto;
use Illuminate\Http\Request;

class ProdutoController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->integer('por_pagina', 24);
        $perPage = max(1, min(100, $perPage));

        $query = Produto::query()
            ->where('visivel_ecommerce', true)
            ->where('ativo', true)
            ->with(['categoria', 'variacoes' => fn ($q) => $q->ativas()]);

        if ($request->filled('categoria')) {
            $slug = (string) $request->string('categoria');
            $query->whereHas('categoria', fn ($q) => $q->where('slug', $slug));
        }

        if ($request->boolean('em_promocao')) {
            $query->where('em_promocao', true);
        }

        if ($request->boolean('destaque')) {
            $query->where('destaque', true);
        }

        if ($request->filled('preco_min')) {
            $query->where('preco_venda', '>=', $request->float('preco_min'));
        }

        if ($request->filled('preco_max')) {
            $query->where('preco_venda', '<=', $request->float('preco_max'));
        }

        match ((string) $request->string('ordem')) {
            'preco_asc'  => $query->orderBy('preco_venda'),
            'preco_desc' => $query->orderByDesc('preco_venda'),
            'nome'       => $query->orderBy('nome'),
            'novidades'  => $query->orderByDesc('created_at'),
            default      => $query->orderByDesc('destaque')->orderByDesc('novo')->orderBy('nome'),
        };

        return ProdutoListaResource::collection($query->paginate($perPage));
    }

    public function show(string $slug)
    {
        $produto = Produto::query()
            ->where('slug', $slug)
            ->where('visivel_ecommerce', true)
            ->where('ativo', true)
            ->with(['categoria', 'variacoes' => fn ($q) => $q->ativas()])
            ->firstOrFail();

        return new ProdutoDetalheResource($produto);
    }
}
