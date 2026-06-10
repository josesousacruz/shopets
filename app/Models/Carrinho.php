<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Carrinho extends Model
{
    use HasFactory;

    protected $table = 'carrinhos';
    protected $primaryKey = 'id_carrinho';

    protected $fillable = [
        'token',
        'id_cliente',
        'expira_em',
    ];

    protected $casts = [
        'expira_em' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Carrinho $carrinho) {
            if (empty($carrinho->token)) {
                $carrinho->token = (string) Str::uuid();
            }
        });
    }

    public function itens(): HasMany
    {
        return $this->hasMany(CarrinhoItem::class, 'id_carrinho', 'id_carrinho');
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'id_cliente', 'id_cliente');
    }

    public function subtotal(): float
    {
        return (float) $this->itens->sum(fn (CarrinhoItem $item) => $item->subtotal());
    }

    public function quantidadeTotal(): int
    {
        return (int) $this->itens->sum('quantidade');
    }
}
