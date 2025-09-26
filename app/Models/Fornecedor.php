<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Fornecedor extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'fornecedores';
    protected $primaryKey = 'id_fornecedor';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'nome',
        'razao_social',
        'cnpj',
        'endereco',
        'telefone',
        'email',
        'contato',
        'ativo',
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
            ->logOnly(['nome', 'razao_social', 'cnpj', 'telefone', 'email', 'ativo'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relacionamento com produtos
     */
    public function produtos()
    {
        return $this->belongsToMany(Produto::class, 'produtos_fornecedores', 'id_fornecedor', 'id_produto')
                    ->withPivot('preco_custo_fornecedor', 'codigo_fornecedor', 'prazo_entrega_dias', 'quantidade_minima_pedido', 'fornecedor_principal', 'ativo')
                    ->withTimestamps();
    }

    /**
     * Scope para fornecedores ativos
     */
    public function scopeAtivos($query)
    {
        return $query->where('ativo', true);
    }
}
