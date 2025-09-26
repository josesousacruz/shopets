<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class MovimentacaoEstoque extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'movimentacoes_estoque';

    protected $fillable = [
        'id_produto',
        'id_usuario',
        'id_item_venda',
        'tipo_movimentacao',
        'quantidade',
        'valor_unitario',
        'numero_documento',
        'observacoes',
        'data_movimentacao',
    ];

    protected $casts = [
        'quantidade' => 'integer',
        'data_movimentacao' => 'datetime',
    ];

    /**
     * Configure activity logging options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['produto_id', 'tipo_movimentacao', 'quantidade', 'motivo'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relacionamento com produto
     */
    public function produto()
    {
        return $this->belongsTo(Produto::class, 'id_produto', 'id_produto');
    }

    /**
     * Relacionamento com usuário
     */
    public function usuario()
    {
        return $this->belongsTo(User::class, 'id_usuario');
    }

    /**
     * Scope para movimentações de entrada
     */
    public function scopeEntradas($query)
    {
        return $query->where('tipo_movimentacao', 'entrada');
    }

    /**
     * Scope para movimentações de saída
     */
    public function scopeSaidas($query)
    {
        return $query->where('tipo_movimentacao', 'saida');
    }

    /**
     * Scope para movimentações por período
     */
    public function scopePorPeriodo($query, $dataInicio, $dataFim)
    {
        return $query->whereBetween('data_movimentacao', [$dataInicio, $dataFim]);
    }
}
