<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class FormaPagamento extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'formas_pagamento';
    protected $primaryKey = 'id_forma_pagamento';

    protected $fillable = [
        'nome',
        'descricao',
        'tipo',
        'permite_parcelamento',
        'max_parcelas',
        'taxa_juros',
        'taxa_desconto',
        'ativo',
        'ordem_exibicao'
    ];

    protected $casts = [
        'permite_parcelamento' => 'boolean',
        'max_parcelas' => 'integer',
        'taxa_juros' => 'decimal:2',
        'taxa_desconto' => 'decimal:2',
        'ativo' => 'boolean',
        'ordem_exibicao' => 'integer'
    ];

    /**
     * Configuração do log de atividades
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nome', 'tipo', 'ativo'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    

    /**
     * Relacionamento com pagamentos de venda
     */
    public function pagamentosVenda()
    {
        return $this->hasMany(PagamentoVenda::class, 'id_forma_pagamento', 'id_forma_pagamento');
    }

    /**
     * Scope para formas de pagamento ativas
     */
    public function scopeAtivas($query)
    {
        return $query->where('ativo', true);
    }

    /**
     * Scope para ordenar por ordem de exibição
     */
    public function scopeOrdenadas($query)
    {
        return $query->orderBy('ordem_exibicao')->orderBy('nome');
    }

    /**
     * Scope para filtrar por tipo
     */
    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    /**
     * Verifica se permite parcelamento
     */
    public function permiteParcelamento(): bool
    {
        return $this->permite_parcelamento && $this->max_parcelas > 1;
    }

    /**
     * Calcula valor com desconto aplicado
     */
    public function calcularValorComDesconto($valor): float
    {
        if ($this->taxa_desconto > 0) {
            return $valor * (1 - ($this->taxa_desconto / 100));
        }
        return $valor;
    }

    /**
     * Calcula valor com juros aplicado
     */
    public function calcularValorComJuros($valor): float
    {
        if ($this->taxa_juros > 0) {
            return $valor * (1 + ($this->taxa_juros / 100));
        }
        return $valor;
    }

    /**
     * Retorna as opções de tipos disponíveis
     */
    public static function getTipos(): array
    {
        return [
            'dinheiro' => 'Dinheiro',
            'cartao_credito' => 'Cartão de Crédito',
            'cartao_debito' => 'Cartão de Débito',
            'pix' => 'PIX',
            'transferencia' => 'Transferência',
            'cheque' => 'Cheque',
            'crediario' => 'Crediário',
            'outros' => 'Outros'
        ];
    }

    /**
     * Retorna o nome do tipo formatado
     */
    public function getTipoFormatadoAttribute(): string
    {
        $tipos = self::getTipos();
        return $tipos[$this->tipo] ?? $this->tipo;
    }
}