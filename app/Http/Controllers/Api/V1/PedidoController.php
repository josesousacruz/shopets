<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\PedidoResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PedidoController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $pedidos = $request->user()->pedidos()
            ->with('itens')
            ->latest('id_pedido')
            ->get();

        return PedidoResource::collection($pedidos);
    }

    public function show(Request $request, string $numero): PedidoResource
    {
        $pedido = $request->user()->pedidos()
            ->where('numero', $numero)
            ->with(['itens', 'enderecoEntrega'])
            ->firstOrFail();

        return new PedidoResource($pedido);
    }
}
