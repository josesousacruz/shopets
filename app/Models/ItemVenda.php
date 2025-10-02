<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ItemVenda extends Model
{
    use HasFactory;

    protected $table = 'itens_venda';
    protected $primaryKey = 'id_item';

    protected $fillable = [
        'id_venda',
        'id_produto',
        'quantidade',
        'preco_unitario',
        'desconto_item',
        'valor_total_item',
        'observacoes',
    ];

    protected $casts = [
        'quantidade' => 'decimal:3',
        'preco_unitario' => 'decimal:2',
        'desconto_item' => 'decimal:2',
        'valor_total_item' => 'decimal:2',
    ];

    /**
     * Relacionamento com venda
     */
    public function venda()
    {
        return $this->belongsTo(Venda::class, 'id_venda', 'id_venda');
    }

    /**
     * Relacionamento com produto
     */
    public function produto()
    {
        return $this->belongsTo(Produto::class, 'id_produto', 'id_produto');
    }
}
