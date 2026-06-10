<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class PedidoResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'numero' => $this->numero,
            'status' => $this->status,
            'modalidade' => $this->modalidade,
            'subtotal' => (float) $this->subtotal,
            'frete' => (float) $this->frete,
            'desconto' => (float) $this->desconto,
            'total' => (float) $this->total,
            'frete_servico' => $this->frete_servico,
            'prazo_entrega_dias' => $this->prazo_entrega_dias,
            'codigo_rastreio' => $this->codigo_rastreio,
            'itens' => PedidoItemResource::collection($this->whenLoaded('itens')),
            'endereco_entrega' => $this->whenLoaded('enderecoEntrega', fn () => $this->enderecoEntrega
                ? new EnderecoResource($this->enderecoEntrega)
                : null),
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}
