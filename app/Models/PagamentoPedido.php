<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PagamentoPedido extends Model
{
    protected $table = 'pagamentos_pedido';
    protected $primaryKey = 'id_pagamento_pedido';

    protected $fillable = [
        'id_pedido',
        'gateway',
        'gateway_id_externo',
        'metodo',
        'status',
        'valor',
        'dados_brutos',
        'processado_em',
    ];

    protected $casts = [
        'valor' => 'decimal:2',
        'dados_brutos' => 'array',
        'processado_em' => 'datetime',
    ];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'id_pedido', 'id_pedido');
    }

    public function scopeAprovados($query)
    {
        return $query->where('status', 'aprovado');
    }
}
