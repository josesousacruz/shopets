<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class PedidoItemResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id_pedido_item,
            'id_produto' => $this->id_produto,
            'id_variacao' => $this->id_variacao,
            'nome' => $this->nome,
            'sku' => $this->sku,
            'preco_unit' => (float) $this->preco_unit,
            'quantidade' => (int) $this->quantidade,
            'subtotal' => (float) $this->subtotal,
        ];
    }
}
