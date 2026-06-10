<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Domain\Catalog\BuscaProdutoService;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ProdutoListaResource;
use Illuminate\Http\Request;

class BuscaController extends Controller
{
    public function __invoke(Request $request, BuscaProdutoService $service)
    {
        $termo = (string) $request->query('q', '');

        $perPage = (int) $request->integer('por_pagina', 24);
        $perPage = max(1, min(100, $perPage));

        $paginator = $service->buscar($termo)->paginate($perPage);

        return ProdutoListaResource::collection($paginator)
            ->additional(['termo' => $termo]);
    }
}
