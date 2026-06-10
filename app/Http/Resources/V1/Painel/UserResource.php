<?php

namespace App\Http\Resources\V1\Painel;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'nivel_acesso' => $this->nivel_acesso,
        ];
    }
}
