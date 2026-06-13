<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RelatorioFavorito extends Model
{
    protected $table = 'relatorios_favoritos';

    protected $fillable = ['user_id', 'slug', 'nome', 'filtros'];

    protected $casts = ['filtros' => 'array'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
