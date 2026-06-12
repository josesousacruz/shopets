<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SegmentoCliente extends Model
{
    use HasFactory;

    protected $table = 'segmentos_clientes';

    protected $fillable = ['id_empresa', 'user_id', 'nome', 'filtros'];

    protected $casts = [
        'filtros' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
