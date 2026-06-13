<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PedidoCompra extends Model
{
    use HasFactory;

    protected $table = 'pedidos_compra';

    protected $fillable = [
        'numero', 'id_empresa', 'fornecedor_id', 'deposito_id', 'status',
        'previsao_entrega', 'subtotal', 'frete', 'desconto', 'total',
        'condicao_pagamento', 'observacoes', 'criado_por', 'enviado_em', 'cancelado_em',
    ];

    protected $casts = [
        'previsao_entrega' => 'date',
        'subtotal' => 'decimal:2',
        'frete' => 'decimal:2',
        'desconto' => 'decimal:2',
        'total' => 'decimal:2',
        'enviado_em' => 'datetime',
        'cancelado_em' => 'datetime',
    ];

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Fornecedor::class, 'fornecedor_id', 'id_fornecedor');
    }

    public function deposito(): BelongsTo
    {
        return $this->belongsTo(Deposito::class);
    }

    public function itens(): HasMany
    {
        return $this->hasMany(PedidoCompraItem::class);
    }

    public function recebimentos(): HasMany
    {
        return $this->hasMany(RecebimentoCompra::class);
    }

    public function criadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }
}
