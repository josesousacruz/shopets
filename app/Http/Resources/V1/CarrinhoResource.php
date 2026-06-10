<?php

namespace App\Http\Resources\V1;

use App\Models\CarrinhoItem;
use Illuminate\Http\Resources\Json\JsonResource;

class CarrinhoResource extends JsonResource
{
    public function toArray($request): array
    {
        $itens = $this->itens ?? collect();

        return [
            'id' => $this->id_carrinho,
            'token' => $this->token,
            'id_cliente' => $this->id_cliente,
            'itens' => $itens->map(function (CarrinhoItem $item) {
                $produto = $item->produto;
                $variacao = $item->variacao;

                return [
                    'id' => $item->id_carrinho_item,
                    'id_produto' => $item->id_produto,
                    'id_variacao' => $item->id_variacao,
                    'nome' => $produto?->nome,
                    'slug' => $produto?->slug,
                    'imagem' => $produto?->getImageUrl('thumb'),
                    'variacao' => $variacao ? [
                        'id' => $variacao->id_variacao,
                        'nome' => $variacao->nome_variacao,
                        'sku' => $variacao->sku,
                        'atributos' => $variacao->atributos,
                    ] : null,
                    'preco_unit' => (float) $item->preco_unit_snapshot,
                    'quantidade' => (int) $item->quantidade,
                    'subtotal' => $item->subtotal(),
                ];
            })->values(),
            'subtotal' => $this->subtotal(),
            'quantidade_total' => $this->quantidadeTotal(),
        ];
    }
}
