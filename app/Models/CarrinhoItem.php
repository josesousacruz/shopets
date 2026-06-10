<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CarrinhoItem extends Model
{
    use HasFactory;

    protected $table = 'carrinho_itens';
    protected $primaryKey = 'id_carrinho_item';

    protected $fillable = [
        'id_carrinho',
        'id_produto',
        'id_variacao',
        'quantidade',
        'preco_unit_snapshot',
    ];

    protected $casts = [
        'quantidade' => 'integer',
        'preco_unit_snapshot' => 'decimal:2',
    ];

    public function carrinho(): BelongsTo
    {
        return $this->belongsTo(Carrinho::class, 'id_carrinho', 'id_carrinho');
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class, 'id_produto', 'id_produto');
    }

    public function variacao(): BelongsTo
    {
        return $this->belongsTo(ProdutoVariacao::class, 'id_variacao', 'id_variacao');
    }

    public function subtotal(): float
    {
        return (float) $this->preco_unit_snapshot * (int) $this->quantidade;
    }
}
