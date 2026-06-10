<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class EnderecoResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'          => $this->id_endereco,
            'apelido'     => $this->apelido,
            'cep'         => $this->cep,
            'logradouro'  => $this->logradouro,
            'numero'      => $this->numero,
            'complemento' => $this->complemento,
            'bairro'      => $this->bairro,
            'cidade'      => $this->cidade,
            'uf'          => $this->uf,
            'tipo'        => $this->tipo,
            'principal'   => (bool) $this->principal,
            'created_at'  => $this->created_at?->toIso8601String(),
        ];
    }
}
