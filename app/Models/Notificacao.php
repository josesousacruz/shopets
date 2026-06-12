<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notificacao extends Model
{
    use HasFactory;

    protected $table = 'notificacoes';

    protected $fillable = [
        'id_empresa',
        'user_id',
        'tipo',
        'titulo',
        'mensagem',
        'payload',
        'link',
        'lida_em',
    ];

    protected $casts = [
        'payload' => 'array',
        'lida_em' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeNaoLidas($q)
    {
        return $q->whereNull('lida_em');
    }
}
