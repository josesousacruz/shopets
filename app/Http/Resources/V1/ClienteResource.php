<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class ClienteResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'               => $this->id_cliente,
            'nome'             => $this->nome,
            'email'            => $this->email,
            'telefone'         => $this->telefone,
            'origem'           => $this->origem,
            'aceita_marketing' => (bool) $this->aceita_marketing,
            'created_at'       => $this->created_at?->toIso8601String(),
        ];
    }
}
