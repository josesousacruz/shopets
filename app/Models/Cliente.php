<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Cliente extends Authenticatable
{
    use HasFactory, LogsActivity, BelongsToEmpresa, HasApiTokens, Notifiable;

    protected $table = 'clientes';
    protected $primaryKey = 'id_cliente';

    protected $fillable = [
        'nome',
        'cpf_cnpj',
        'email',
        'telefone',
        'endereco',
        'data_nascimento',
        'tipo_pessoa',
        'pontos_fidelidade',
        'limite_credito',
        'credito_utilizado',
        'ativo',
        'observacoes',
        'id_empresa',
        'password',
        'origem',
        'aceita_marketing',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'ativo' => 'boolean',
        'pontos_fidelidade' => 'decimal:2',
        'limite_credito' => 'decimal:2',
        'credito_utilizado' => 'decimal:2',
        'data_nascimento' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'password' => 'hashed',
        'email_verified_at' => 'datetime',
        'aceita_marketing' => 'boolean',
    ];

    public function getAuthIdentifierName()
    {
        return 'id_cliente';
    }

    /**
     * Configure activity logging options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nome', 'cpf_cnpj', 'email', 'telefone', 'pontos_fidelidade', 'ativo'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relacionamento com vendas
     */
    public function vendas()
    {
        return $this->hasMany(Venda::class, 'id_cliente', 'id_cliente');
    }

    /**
     * Scope para clientes ativos
     */
    public function scopeAtivos($query)
    {
        return $query->where('ativo', true);
    }

    /**
     * Scope para clientes por tipo de pessoa
     */
    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo_pessoa', $tipo);
    }

    /**
     * Accessor para calcular o nível de fidelidade baseado nos pontos
     */
    public function getLoyaltyLevelAttribute()
    {
        $pontos = $this->pontos_fidelidade;
        
        if ($pontos >= 3000) return 'diamante';
        if ($pontos >= 1500) return 'ouro';
        if ($pontos >= 500) return 'prata';
        return 'bronze';
    }

    /**
     * Accessor para calcular o total gasto (baseado nas vendas)
     */
    public function getTotalSpentAttribute()
    {
        return $this->vendas()->sum('valor_total') ?? 0;
    }

    /**
     * Accessor para última compra
     */
    public function getLastPurchaseAttribute()
    {
        $ultimaVenda = $this->vendas()->latest('data_venda')->first();
        return $ultimaVenda ? $ultimaVenda->data_venda : null;
    }

    /**
     * Método para adicionar pontos de fidelidade
     */
    public function adicionarPontos($pontos, $descricao = null)
    {
        $this->increment('pontos_fidelidade', $pontos);
        
        // Aqui você pode adicionar lógica para registrar a transação de pontos
        // em uma tabela separada se necessário
        
        return $this;
    }

    /**
     * Método para resgatar pontos de fidelidade
     */
    public function resgatarPontos($pontos, $descricao = null)
    {
        if ($this->pontos_fidelidade < $pontos) {
            throw new \Exception('Pontos insuficientes para resgate');
        }
        
        $this->decrement('pontos_fidelidade', $pontos);
        
        return $this;
    }
}