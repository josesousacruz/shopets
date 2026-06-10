<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReservaEstoque extends Model
{
    protected $table = 'reservas_estoque';
    protected $primaryKey = 'id_reserva';

    protected $fillable = [
        'id_carrinho',
        'id_pedido',
        'id_produto',
        'id_variacao',
        'quantidade',
        'expira_em',
        'consumida_em',
    ];

    protected $casts = [
        'quantidade' => 'decimal:3',
        'expira_em' => 'datetime',
        'consumida_em' => 'datetime',
    ];

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class, 'id_produto', 'id_produto');
    }

    public function variacao(): BelongsTo
    {
        return $this->belongsTo(ProdutoVariacao::class, 'id_variacao', 'id_variacao');
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'id_pedido', 'id_pedido');
    }

    /**
     * Reserva ativa: não consumida e não expirada.
     */
    public function scopeAtivas($query)
    {
        return $query->whereNull('consumida_em')->where('expira_em', '>', now());
    }
}
