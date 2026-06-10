<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class ProdutoListaResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->id_produto,
            'slug'              => $this->slug,
            'nome'              => $this->nome,
            'descricao_curta'   => $this->descricao_curta,
            'preco_venda'       => (float) $this->preco_venda,
            'preco_promocional' => $this->preco_promocional !== null ? (float) $this->preco_promocional : null,
            'em_promocao'       => (bool) $this->em_promocao,
            'novo'              => (bool) $this->novo,
            'destaque'          => (bool) $this->destaque,
            'categoria' => $this->whenLoaded('categoria', fn () => [
                'nome' => $this->categoria->nome,
                'slug' => $this->categoria->slug,
            ]),
            'imagem_capa'  => $this->getImageUrl('medium'),
            'tem_variacoes' => $this->relationLoaded('variacoes') ? $this->variacoes->isNotEmpty() : null,
        ];
    }
}
