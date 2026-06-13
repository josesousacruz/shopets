<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExtratoBancarioLinha extends Model
{
    protected $table = 'extratos_bancarios_linhas';

    protected $fillable = [
        'conta_bancaria_id', 'data', 'valor', 'memo', 'fitid', 'tipo_ofx',
        'reconciliada_com_pagar_id', 'reconciliada_com_receber_id', 'reconciliada_em',
    ];

    protected $casts = [
        'data' => 'date',
        'valor' => 'decimal:2',
        'reconciliada_em' => 'datetime',
    ];

    public function contaBancaria(): BelongsTo
    {
        return $this->belongsTo(ContaBancaria::class);
    }

    public function getConciliadaAttribute(): bool
    {
        return $this->reconciliada_em !== null;
    }
}
