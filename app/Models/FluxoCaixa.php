<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class FluxoCaixa extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'fluxo_caixa';

    protected $fillable = [
        'user_id',
        'id_pdv',
        'tipo_operacao',
        'valor',
        'descricao',
        'categoria',
    ];

    protected $casts = [
        'valor' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Configure activity logging options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['tipo_operacao', 'valor', 'descricao', 'categoria'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relacionamento com ponto de venda
     */
    public function pontoVenda()
    {
        return $this->belongsTo(PontoVenda::class, 'id_pdv', 'id_pdv');
    }

    /**
     * Relacionamento com usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope para entradas
     */
    public function scopeEntradas($query)
    {
        return $query->where('tipo_operacao', 'entrada');
    }

    /**
     * Scope para saídas
     */
    public function scopeSaidas($query)
    {
        return $query->where('tipo_operacao', 'saida');
    }

    /**
     * Scope para movimentações por período
     */
    public function scopePorPeriodo($query, $dataInicio, $dataFim)
    {
        return $query->whereBetween('created_at', [$dataInicio, $dataFim]);
    }

    /**
     * Scope para movimentações por ponto de venda
     */
    public function scopePorPontoVenda($query, $pontoVendaId)
    {
        return $query->where('id_pdv', $pontoVendaId);
    }

    /**
     * Scope para movimentações por categoria
     */
    public function scopePorCategoria($query, $categoria)
    {
        return $query->where('categoria', $categoria);
    }
}
