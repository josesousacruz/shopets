<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PedidoMensagem extends Model
{
    protected $table = 'pedido_mensagens';

    protected $fillable = [
        'id_pedido', 'autor_tipo', 'user_id', 'cliente_id', 'texto', 'lida_em',
    ];

    protected $casts = ['lida_em' => 'datetime'];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'id_pedido', 'id_pedido');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
