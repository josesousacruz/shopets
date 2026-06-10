<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Cart\CarrinhoService;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\CarrinhoResource;
use App\Models\Cliente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CarrinhoController extends Controller
{
    public function __construct(private readonly CarrinhoService $service)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $carrinho = $this->resolver($request);

        return (new CarrinhoResource($carrinho))->response()->setStatusCode(200);
    }

    public function adicionar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_produto' => ['required', 'integer'],
            'id_variacao' => ['nullable', 'integer'],
            'quantidade' => ['required', 'integer', 'min:1'],
        ]);

        $carrinho = $this->resolver($request);

        $this->service->adicionarItem(
            $carrinho,
            $data['id_produto'],
            $data['id_variacao'] ?? null,
            $data['quantidade'],
        );

        return (new CarrinhoResource($carrinho->fresh('itens')))
            ->response()
            ->setStatusCode(201);
    }

    public function atualizar(Request $request, int $item): CarrinhoResource
    {
        $data = $request->validate([
            'quantidade' => ['required', 'integer', 'min:1'],
        ]);

        $carrinho = $this->resolver($request);

        $this->service->atualizarQuantidade($carrinho, $item, $data['quantidade']);

        return new CarrinhoResource($carrinho->fresh('itens'));
    }

    public function remover(Request $request, int $item): CarrinhoResource
    {
        $carrinho = $this->resolver($request);

        $this->service->removerItem($carrinho, $item);

        return new CarrinhoResource($carrinho->fresh('itens'));
    }

    private function resolver(Request $request)
    {
        // As rotas de carrinho não exigem auth (guest), mas se vier um Bearer
        // token resolvemos o cliente pelo guard sanctum explicitamente — o
        // guard padrão é 'web'/sessão e não enxerga o Bearer.
        $usuario = $request->user('sanctum');
        $cliente = $usuario instanceof Cliente ? $usuario : null;
        $token = $request->header('X-Cart-Token');

        return $this->service->resolver($cliente, $token);
    }
}
