<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class ContaPagar extends Model
{
    use LogsActivity;

    protected $table = 'contas_pagar';
    protected $primaryKey = 'id_conta_pagar';

    protected $fillable = [
        'numero_documento',
        'descricao',
        'id_fornecedor',
        'id_pdv',
        'user_id',
        'valor_original',
        'valor_pago',
        'valor_desconto',
        'valor_juros',
        'valor_multa',
        'data_vencimento',
        'data_pagamento',
        'status',
        'categoria',
        'tipo_documento',
        'observacoes',
        'numero_parcela',
        'total_parcelas',
        'id_conta_origem',
        'ativo'
    ];

    protected $casts = [
        'valor_original' => 'decimal:2',
        'valor_pago' => 'decimal:2',
        'valor_desconto' => 'decimal:2',
        'valor_juros' => 'decimal:2',
        'valor_multa' => 'decimal:2',
        'data_vencimento' => 'date',
        'data_pagamento' => 'date',
        'ativo' => 'boolean',
        'numero_parcela' => 'integer',
        'total_parcelas' => 'integer'
    ];

    protected $dates = [
        'data_vencimento',
        'data_pagamento',
        'created_at',
        'updated_at'
    ];

    // Relacionamentos
    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Fornecedor::class, 'id_fornecedor', 'id_fornecedor');
    }

    public function pontoVenda(): BelongsTo
    {
        return $this->belongsTo(PontoVenda::class, 'id_pdv', 'id_pdv');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function contaOrigem(): BelongsTo
    {
        return $this->belongsTo(ContaPagar::class, 'id_conta_origem', 'id_conta_pagar');
    }

    public function parcelas(): HasMany
    {
        return $this->hasMany(ContaPagar::class, 'id_conta_origem', 'id_conta_pagar');
    }

    // Scopes
    public function scopePendentes($query)
    {
        return $query->where('status', 'pendente');
    }

    public function scopeVencidas($query)
    {
        return $query->where('status', 'vencido')
                    ->orWhere(function($q) {
                        $q->where('status', 'pendente')
                          ->where('data_vencimento', '<', now()->toDateString());
                    });
    }

    public function scopePorPeriodo($query, $dataInicio, $dataFim)
    {
        return $query->whereBetween('data_vencimento', [$dataInicio, $dataFim]);
    }

    public function scopePorFornecedor($query, $idFornecedor)
    {
        return $query->where('id_fornecedor', $idFornecedor);
    }

    public function scopePorPdv($query, $idPdv)
    {
        return $query->where('id_pdv', $idPdv);
    }

    // Accessors
    public function getValorSaldoAttribute()
    {
        return $this->valor_original + $this->valor_juros + $this->valor_multa - $this->valor_desconto - $this->valor_pago;
    }

    public function getStatusFormatadoAttribute()
    {
        $status = [
            'pendente' => 'Pendente',
            'pago' => 'Pago',
            'vencido' => 'Vencido',
            'cancelado' => 'Cancelado'
        ];

        return $status[$this->status] ?? $this->status;
    }

    public function getDiasVencimentoAttribute()
    {
        if (!$this->data_vencimento) return null;
        
        return now()->diffInDays($this->data_vencimento, false);
    }

    // Mutators
    public function setDataVencimentoAttribute($value)
    {
        $this->attributes['data_vencimento'] = $value ? date('Y-m-d', strtotime($value)) : null;
    }

    public function setDataPagamentoAttribute($value)
    {
        $this->attributes['data_pagamento'] = $value ? date('Y-m-d', strtotime($value)) : null;
    }

    // Activity Log
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'numero_documento',
                'descricao',
                'id_fornecedor',
                'valor_original',
                'valor_pago',
                'data_vencimento',
                'data_pagamento',
                'status',
                'categoria'
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    // Métodos auxiliares
    public function marcarComoPago($valorPago = null, $dataPagamento = null)
    {
        $this->update([
            'status' => 'pago',
            'valor_pago' => $valorPago ?? $this->valor_original,
            'data_pagamento' => $dataPagamento ?? now()->toDateString()
        ]);
    }

    public function cancelar()
    {
        $this->update(['status' => 'cancelado']);
    }

    public function verificarVencimento()
    {
        if ($this->status === 'pendente' && $this->data_vencimento < now()->toDateString()) {
            $this->update(['status' => 'vencido']);
        }
    }
}
