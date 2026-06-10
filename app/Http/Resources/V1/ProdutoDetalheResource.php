<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class ProdutoDetalheResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->id_produto,
            'slug'              => $this->slug,
            'nome'              => $this->nome,
            'descricao_curta'   => $this->descricao_curta,
            'descricao_longa'   => $this->descricao_longa,
            'preco_venda'       => (float) $this->preco_venda,
            'preco_promocional' => $this->preco_promocional !== null ? (float) $this->preco_promocional : null,
            'em_promocao'       => (bool) $this->em_promocao,
            'novo'              => (bool) $this->novo,
            'destaque'          => (bool) $this->destaque,
            'disponivel'        => $this->disponivelParaVenda(),
            'peso_gramas'       => $this->peso_gramas,
            'dimensoes_cm'      => [
                'altura'      => $this->altura_cm !== null ? (float) $this->altura_cm : null,
                'largura'     => $this->largura_cm !== null ? (float) $this->largura_cm : null,
                'comprimento' => $this->comprimento_cm !== null ? (float) $this->comprimento_cm : null,
            ],
            'seo' => [
                'title'       => $this->meta_title ?? $this->nome,
                'description' => $this->meta_description,
                'og_image'    => $this->og_image_path ?? $this->getImageUrl('large'),
            ],
            'categoria' => $this->whenLoaded('categoria', fn () =>
                new CategoriaResource($this->categoria)
            ),
            'galeria' => $this->getMedia('images')->map(fn ($m) => [
                'url'        => $m->getUrl(),
                'url_medium' => $m->getUrl('medium'),
                'url_large'  => $m->getUrl('large'),
            ])->all(),
            'variacoes' => VariacaoResource::collection($this->whenLoaded('variacoes')),
        ];
    }
}
