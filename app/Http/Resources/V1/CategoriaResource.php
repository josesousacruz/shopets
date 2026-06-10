<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class CategoriaResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'        => $this->id_categoria,
            'nome'      => $this->nome,
            'slug'      => $this->slug,
            'imagem'    => $this->imagem_path,
            'ordem'     => (int) $this->ordem,
            'pai_id'    => $this->id_categoria_pai,
            'descricao' => $this->descricao,
        ];
    }
}
