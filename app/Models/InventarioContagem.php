<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventarioContagem extends Model
{
    use HasFactory;

    protected $table = 'inventario_contagens';

    protected $fillable = [
        'inventario_id', 'produto_variacao_id', 'saldo_sistema',
        'saldo_contado', 'diferenca', 'observacoes',
    ];

    protected $casts = [
        'saldo_sistema' => 'integer',
        'saldo_contado' => 'integer',
        'diferenca' => 'integer',
    ];

    public function inventario(): BelongsTo
    {
        return $this->belongsTo(Inventario::class);
    }

    public function variacao(): BelongsTo
    {
        return $this->belongsTo(ProdutoVariacao::class, 'produto_variacao_id', 'id_variacao');
    }
}
