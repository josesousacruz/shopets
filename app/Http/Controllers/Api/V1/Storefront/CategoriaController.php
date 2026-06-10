<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\CategoriaResource;
use App\Models\Categoria;

class CategoriaController extends Controller
{
    public function index()
    {
        $categorias = Categoria::query()
            ->where('ativo', true)
            ->where('visivel_ecommerce', true)
            ->orderBy('ordem')
            ->orderBy('nome')
            ->get();

        return CategoriaResource::collection($categorias);
    }
}
