<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Cart\CarrinhoService;
use App\Domain\Shipping\ShippingQuoteInterface;
use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class FreteController extends Controller
{
    public function __construct(
        private readonly ShippingQuoteInterface $shipping,
        private readonly CarrinhoService $carrinhoService,
    ) {
    }

    public function cotar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cep' => ['required', 'string'],
            'itens' => ['sometimes', 'array'],
            'itens.*.id_produto' => ['required_with:itens', 'integer'],
            'itens.*.id_variacao' => ['nullable', 'integer'],
            'itens.*.quantidade' => ['required_with:itens', 'integer', 'min:1'],
        ]);

        $itens = isset($data['itens'])
            ? $this->itensDoPayload($data['itens'])
            : $this->itensDoCarrinho($request);

        $opcoes = $this->shipping->cotar($data['cep'], $itens);

        return response()->json(['data' => $opcoes]);
    }

    private function itensDoPayload(array $itens): Collection
    {
        return collect($itens)->map(function (array $i) {
            $peso = null;
            if (! empty($i['id_variacao'])) {
                $peso = ProdutoVariacao::where('id_variacao', $i['id_variacao'])->value('peso_gramas');
            }
            if ($peso === null) {
                $peso = Produto::where('id_produto', $i['id_produto'])->value('peso_gramas');
            }

            return [
                'id_produto' => $i['id_produto'],
                'id_variacao' => $i['id_variacao'] ?? null,
                'quantidade' => $i['quantidade'],
                'peso_gramas' => $peso,
            ];
        });
    }

    private function itensDoCarrinho(Request $request): Collection
    {
        $usuario = $request->user('sanctum');
        $cliente = $usuario instanceof Cliente ? $usuario : null;
        $carrinho = $this->carrinhoService->resolver($cliente, $request->header('X-Cart-Token'));

        return $carrinho->itens->map(function ($item) {
            $peso = $item->variacao?->peso_gramas ?? $item->produto?->peso_gramas;

            return [
                'id_produto' => $item->id_produto,
                'id_variacao' => $item->id_variacao,
                'quantidade' => $item->quantidade,
                'peso_gramas' => $peso,
            ];
        });
    }
}
