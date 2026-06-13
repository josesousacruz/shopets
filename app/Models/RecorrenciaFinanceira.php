<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecorrenciaFinanceira extends Model
{
    protected $table = 'recorrencias_financeiras';

    protected $fillable = [
        'id_empresa', 'tipo', 'plano_conta_id', 'descricao', 'valor',
        'frequencia', 'proxima_geracao', 'ate', 'ativo',
    ];

    protected $casts = [
        'valor' => 'decimal:2',
        'proxima_geracao' => 'date',
        'ate' => 'date',
        'ativo' => 'boolean',
    ];

    public function planoConta(): BelongsTo
    {
        return $this->belongsTo(PlanoConta::class);
    }
}
