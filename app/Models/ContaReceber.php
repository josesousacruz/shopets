<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class ContaReceber extends Model
{
    use LogsActivity;

    protected $table = 'contas_receber';
    protected $primaryKey = 'id_conta_receber';

    protected $fillable = [
        'numero_documento',
        'descricao',
        'id_cliente',
        'id_venda',
        'id_pdv',
        'user_id',
        'valor_original',
        'valor_recebido',
        'valor_desconto',
        'valor_juros',
        'valor_multa',
        'data_vencimento',
        'data_recebimento',
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
        'valor_recebido' => 'decimal:2',
        'valor_desconto' => 'decimal:2',
        'valor_juros' => 'decimal:2',
        'valor_multa' => 'decimal:2',
        'data_vencimento' => 'date',
        'data_recebimento' => 'date',
        'ativo' => 'boolean',
        'numero_parcela' => 'integer',
        'total_parcelas' => 'integer'
    ];

    protected $dates = [
        'data_vencimento',
        'data_recebimento',
        'created_at',
        'updated_at'
    ];

    // Relacionamentos
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'id_cliente', 'id_cliente');
    }

    public function venda(): BelongsTo
    {
        return $this->belongsTo(Venda::class, 'id_venda', 'id_venda');
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
        return $this->belongsTo(ContaReceber::class, 'id_conta_origem', 'id_conta_receber');
    }

    public function parcelas(): HasMany
    {
        return $this->hasMany(ContaReceber::class, 'id_conta_origem', 'id_conta_receber');
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

    public function scopePorCliente($query, $idCliente)
    {
        return $query->where('id_cliente', $idCliente);
    }

    public function scopePorPdv($query, $idPdv)
    {
        return $query->where('id_pdv', $idPdv);
    }

    // Accessors
    public function getValorSaldoAttribute()
    {
        return $this->valor_original + $this->valor_juros + $this->valor_multa - $this->valor_desconto - $this->valor_recebido;
    }

    public function getStatusFormatadoAttribute()
    {
        $status = [
            'pendente' => 'Pendente',
            'recebido' => 'Recebido',
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

    public function setDataRecebimentoAttribute($value)
    {
        $this->attributes['data_recebimento'] = $value ? date('Y-m-d', strtotime($value)) : null;
    }

    // Activity Log
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'numero_documento',
                'descricao',
                'id_cliente',
                'id_venda',
                'valor_original',
                'valor_recebido',
                'data_vencimento',
                'data_recebimento',
                'status',
                'categoria'
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    // Métodos auxiliares
    public function marcarComoRecebido($valorRecebido = null, $dataRecebimento = null)
    {
        $this->update([
            'status' => 'recebido',
            'valor_recebido' => $valorRecebido ?? $this->valor_original,
            'data_recebimento' => $dataRecebimento ?? now()->toDateString()
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
