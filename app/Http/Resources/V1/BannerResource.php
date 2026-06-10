<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class BannerResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'titulo' => $this->titulo,
            'subtitulo' => $this->subtitulo,
            'imagem' => $this->imagem_path,
            'link' => $this->link,
            'ordem' => (int) $this->ordem,
        ];
    }
}
