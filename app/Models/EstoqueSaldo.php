<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstoqueSaldo extends Model
{
    use HasFactory;

    protected $table = 'estoque_saldos';

    protected $fillable = [
        'produto_variacao_id', 'deposito_id', 'saldo', 'reservado', 'minimo', 'custo_medio',
    ];

    protected $casts = [
        'saldo' => 'integer',
        'reservado' => 'integer',
        'minimo' => 'integer',
        'custo_medio' => 'decimal:4',
    ];

    public function variacao(): BelongsTo
    {
        return $this->belongsTo(ProdutoVariacao::class, 'produto_variacao_id');
    }

    public function deposito(): BelongsTo
    {
        return $this->belongsTo(Deposito::class);
    }

    public function getDisponivelAttribute(): int
    {
        return max(0, $this->saldo - $this->reservado);
    }
}
