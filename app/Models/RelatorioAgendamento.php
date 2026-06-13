<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RelatorioAgendamento extends Model
{
    protected $table = 'relatorios_agendamentos';

    protected $fillable = [
        'user_id', 'favorito_id', 'slug', 'filtros', 'frequencia',
        'emails', 'formato', 'proxima_execucao', 'ativo',
    ];

    protected $casts = [
        'filtros' => 'array',
        'proxima_execucao' => 'date',
        'ativo' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
