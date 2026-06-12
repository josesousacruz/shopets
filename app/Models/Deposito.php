<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Deposito extends Model
{
    use HasFactory;

    protected $table = 'depositos';

    protected $fillable = ['id_empresa', 'ponto_venda_id', 'nome', 'default', 'ativo'];

    protected $casts = [
        'default' => 'boolean',
        'ativo' => 'boolean',
    ];

    public function pontoVenda(): BelongsTo
    {
        return $this->belongsTo(PontoVenda::class, 'ponto_venda_id');
    }

    public function saldos(): HasMany
    {
        return $this->hasMany(EstoqueSaldo::class);
    }
}
