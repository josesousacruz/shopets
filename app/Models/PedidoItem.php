<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PedidoItem extends Model
{
    protected $table = 'pedido_itens';
    protected $primaryKey = 'id_pedido_item';

    protected $fillable = [
        'id_pedido',
        'id_produto',
        'id_variacao',
        'nome',
        'sku',
        'preco_unit',
        'quantidade',
        'subtotal',
    ];

    protected $casts = [
        'preco_unit' => 'decimal:2',
        'quantidade' => 'integer',
        'subtotal' => 'decimal:2',
    ];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'id_pedido', 'id_pedido');
    }
}
