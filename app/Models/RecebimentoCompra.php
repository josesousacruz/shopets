<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecebimentoCompra extends Model
{
    protected $table = 'recebimentos_compra';

    protected $fillable = [
        'pedido_compra_id', 'data', 'nota_fiscal', 'observacoes', 'recebido_por',
    ];

    protected $casts = [
        'data' => 'date',
    ];

    public function pedidoCompra(): BelongsTo
    {
        return $this->belongsTo(PedidoCompra::class);
    }

    public function itens(): HasMany
    {
        return $this->hasMany(RecebimentoCompraItem::class, 'recebimento_id');
    }

    public function recebidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recebido_por');
    }
}
