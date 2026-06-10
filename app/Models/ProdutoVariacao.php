<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProdutoVariacao extends Model
{
    use HasFactory;

    protected $table = 'produto_variacoes';
    protected $primaryKey = 'id_variacao';

    protected $fillable = [
        'id_produto', 'sku', 'nome_variacao', 'atributos',
        'preco_venda', 'preco_promocional',
        'estoque_atual', 'estoque_minimo',
        'peso_gramas', 'altura_cm', 'largura_cm', 'comprimento_cm',
        'ativo',
    ];

    protected $casts = [
        'atributos' => 'array',
        'preco_venda' => 'decimal:2',
        'preco_promocional' => 'decimal:2',
        'estoque_atual' => 'decimal:3',
        'estoque_minimo' => 'decimal:3',
        'ativo' => 'boolean',
    ];

    public function produto()
    {
        return $this->belongsTo(Produto::class, 'id_produto', 'id_produto');
    }

    public function scopeAtivas($query)
    {
        return $query->where('ativo', true);
    }

    public function precoEfetivo(): float
    {
        return (float) ($this->preco_promocional ?? $this->preco_venda);
    }
}
