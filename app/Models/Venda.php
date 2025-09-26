<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Venda extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'numero_venda',
        'data_venda',
        'valor_subtotal',
        'valor_desconto',
        'valor_acrescimo',
        'valor_total',
        'pontos_fidelidade_utilizados',
        'pontos_fidelidade_gerados',
        'status',
        'observacoes',
        'id_cliente',
        'id_usuario',
        'id_pdv',
    ];

    protected $casts = [
        'data_venda' => 'datetime',
        'valor_subtotal' => 'decimal:2',
        'valor_desconto' => 'decimal:2',
        'valor_acrescimo' => 'decimal:2',
        'valor_total' => 'decimal:2',
        'pontos_fidelidade_utilizados' => 'decimal:2',
        'pontos_fidelidade_gerados' => 'decimal:2',
    ];

    /**
     * Configure activity logging options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['numero_venda', 'valor_subtotal', 'valor_desconto', 'valor_acrescimo', 'valor_total', 'status'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relacionamento com usuário (vendedor)
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'id_usuario');
    }

    /**
     * Relacionamento com cliente
     */
    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'id_cliente', 'id_cliente');
    }

    /**
     * Relacionamento com ponto de venda
     */
    public function pontoVenda()
    {
        return $this->belongsTo(PontoVenda::class, 'id_pdv', 'id_pdv');
    }

    /**
     * Relacionamento com itens da venda
     */
    public function itens()
    {
        return $this->hasMany(ItemVenda::class);
    }

    /**
     * Relacionamento com movimentações do fluxo de caixa
     */
    public function fluxoCaixa()
    {
        return $this->hasMany(FluxoCaixa::class);
    }

    /**
     * Scope para vendas por período
     */
    public function scopePorPeriodo($query, $dataInicio, $dataFim)
    {
        return $query->whereBetween('data_venda', [$dataInicio, $dataFim]);
    }

    /**
     * Scope para vendas por status
     */
    public function scopePorStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope para vendas por ponto de venda
     */
    public function scopePorPontoVenda($query, $pontoVendaId)
    {
        return $query->where('ponto_venda_id', $pontoVendaId);
    }
}
