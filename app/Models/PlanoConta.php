<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanoConta extends Model
{
    protected $table = 'planos_contas';

    protected $fillable = [
        'id_empresa', 'parent_id', 'tipo', 'codigo', 'nome', 'ativo',
    ];

    protected $casts = [
        'ativo' => 'boolean',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(PlanoConta::class, 'parent_id');
    }

    public function filhos(): HasMany
    {
        return $this->hasMany(PlanoConta::class, 'parent_id');
    }

    public function scopeRaizes($query)
    {
        return $query->whereNull('parent_id');
    }
}
