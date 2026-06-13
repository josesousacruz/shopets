<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PedidoCompraItem extends Model
{
    protected $table = 'pedidos_compra_itens';

    protected $fillable = [
        'pedido_compra_id', 'produto_variacao_id', 'qtd', 'qtd_recebida', 'custo_unit', 'total',
    ];

    protected $casts = [
        'qtd' => 'integer',
        'qtd_recebida' => 'integer',
        'custo_unit' => 'decimal:4',
        'total' => 'decimal:2',
    ];

    public function pedidoCompra(): BelongsTo
    {
        return $this->belongsTo(PedidoCompra::class);
    }

    public function variacao(): BelongsTo
    {
        return $this->belongsTo(ProdutoVariacao::class, 'produto_variacao_id', 'id_variacao');
    }

    public function getPendenteAttribute(): int
    {
        return max(0, $this->qtd - $this->qtd_recebida);
    }
}
