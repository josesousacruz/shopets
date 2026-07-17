<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PontoVenda extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'pontos_venda';

    protected $primaryKey = 'id_pdv';

    protected $fillable = [
        'nome_pdv',
        'descricao',
        'endereco',
        'responsavel',
        'telefone',
        'ativo',
        'permite_retirada',
        'configuracoes_pdv',
        'deposito_id',
        'serie_fiscal_default',
        'regime_tributario',
        'nfce_proximo_numero',
    ];

    protected $casts = [
        'ativo' => 'boolean',
        'permite_retirada' => 'boolean',
        'nfce_proximo_numero' => 'integer',
    ];

    public function deposito()
    {
        return $this->belongsTo(Deposito::class, 'deposito_id');
    }

    /**
     * Configure activity logging options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nome', 'endereco', 'telefone', 'email', 'ativo'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relacionamento com usuários (muitos para muitos)
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'users_pdvs', 'id_pdv', 'user_id')
            ->withTimestamps();
    }

    /**
     * Relacionamento com vendas
     */
    public function vendas()
    {
        return $this->hasMany(Venda::class);
    }

    /**
     * Relacionamento com movimentações do fluxo de caixa
     */
    public function fluxoCaixa()
    {
        return $this->hasMany(FluxoCaixa::class);
    }

    /**
     * Scope para pontos de venda ativos
     */
    public function scopeAtivos($query)
    {
        return $query->where('ativo', true);
    }
}
