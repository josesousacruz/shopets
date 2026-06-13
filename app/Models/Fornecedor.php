<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Fornecedor extends Model implements HasMedia
{
    use HasFactory, LogsActivity, InteractsWithMedia;

    protected $table = 'fornecedores';
    protected $primaryKey = 'id_fornecedor';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'nome',
        'cnpj',
        'endereco',
        'telefone',
        'email',
        'contato_principal',
        'observacoes',
        'prazo_medio_dias',
        'condicao_pagamento_padrao',
        'desconto_padrao',
        'ativo',
    ];

    protected $casts = [
        'ativo' => 'boolean',
        'prazo_medio_dias' => 'integer',
        'desconto_padrao' => 'decimal:2',
    ];

    /**
     * Configure activity logging options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nome', 'cnpj', 'telefone', 'email', 'contato_principal', 'ativo'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relacionamento com produtos
     */
    public function produtos()
    {
        return $this->belongsToMany(Produto::class, 'produtos_fornecedores', 'id_fornecedor', 'id_produto')
                    ->withPivot('preco_custo_fornecedor', 'codigo_fornecedor', 'codigo_no_fornecedor', 'prazo_entrega_dias', 'quantidade_minima_pedido', 'fornecedor_principal', 'ativo')
                    ->withTimestamps();
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('documentos');
    }

    /**
     * Pedidos de compra do fornecedor
     */
    public function pedidosCompra()
    {
        return $this->hasMany(PedidoCompra::class, 'fornecedor_id', 'id_fornecedor');
    }

    /**
     * Scope para fornecedores ativos
     */
    public function scopeAtivos($query)
    {
        return $query->where('ativo', true);
    }
}
