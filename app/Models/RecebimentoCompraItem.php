<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecebimentoCompraItem extends Model
{
    protected $table = 'recebimentos_compra_itens';

    protected $fillable = [
        'recebimento_id', 'item_id', 'qtd_recebida',
    ];

    protected $casts = [
        'qtd_recebida' => 'integer',
    ];

    public function recebimento(): BelongsTo
    {
        return $this->belongsTo(RecebimentoCompra::class, 'recebimento_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(PedidoCompraItem::class, 'item_id');
    }
}
