<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class VariacaoResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->id_variacao,
            'sku'               => $this->sku,
            'nome'              => $this->nome_variacao,
            'atributos'         => $this->atributos ?? [],
            'preco_venda'       => (float) $this->preco_venda,
            'preco_promocional' => $this->preco_promocional !== null ? (float) $this->preco_promocional : null,
            'preco_efetivo'    => $this->precoEfetivo(),
            'disponivel'        => (float) $this->estoque_atual > 0 && $this->ativo,
        ];
    }
}
