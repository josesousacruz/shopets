<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DevolucaoPedido extends Model
{
    protected $table = 'devolucoes_pedido';
    protected $primaryKey = 'id_devolucao';

    protected $fillable = [
        'id_pedido',
        'id_cliente',
        'motivo',
        'status',
        'valor_reembolso',
        'observacao_admin',
    ];

    protected $casts = [
        'valor_reembolso' => 'decimal:2',
    ];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'id_pedido', 'id_pedido');
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'id_cliente', 'id_cliente');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(DevolucaoItem::class, 'id_devolucao', 'id_devolucao');
    }
}
