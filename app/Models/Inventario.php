<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Inventario extends Model
{
    use HasFactory;

    protected $table = 'inventarios';

    protected $fillable = [
        'deposito_id', 'aberto_por', 'aberto_em', 'finalizado_em', 'status', 'observacoes',
    ];

    protected $casts = [
        'aberto_em' => 'datetime',
        'finalizado_em' => 'datetime',
    ];

    public function deposito(): BelongsTo
    {
        return $this->belongsTo(Deposito::class);
    }

    public function abertoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aberto_por');
    }

    public function contagens(): HasMany
    {
        return $this->hasMany(InventarioContagem::class);
    }
}
