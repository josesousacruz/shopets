<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DevolucaoItem extends Model
{
    protected $table = 'devolucao_itens';
    protected $primaryKey = 'id_devolucao_item';

    protected $fillable = [
        'id_devolucao',
        'id_pedido_item',
        'quantidade',
    ];

    protected $casts = [
        'quantidade' => 'decimal:2',
    ];

    public function devolucao(): BelongsTo
    {
        return $this->belongsTo(DevolucaoPedido::class, 'id_devolucao', 'id_devolucao');
    }

    public function pedidoItem(): BelongsTo
    {
        return $this->belongsTo(PedidoItem::class, 'id_pedido_item', 'id_pedido_item');
    }
}
