<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ItemVenda extends Model
{
    use HasFactory;

    protected $table = 'itens_venda';

    protected $fillable = [
        'venda_id',
        'produto_id',
        'quantidade',
        'preco_unitario',
        'subtotal',
    ];

    protected $casts = [
        'quantidade' => 'integer',
        'preco_unitario' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    /**
     * Relacionamento com venda
     */
    public function venda()
    {
        return $this->belongsTo(Venda::class);
    }

    /**
     * Relacionamento com produto
     */
    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }
}
