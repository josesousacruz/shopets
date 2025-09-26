<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

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
        'configuracoes_pdv',
    ];

    protected $casts = [
        'ativo' => 'boolean',
    ];

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
        return $this->belongsToMany(User::class, 'users_pontos_venda')
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
