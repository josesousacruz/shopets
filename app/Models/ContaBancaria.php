<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContaBancaria extends Model
{
    protected $table = 'contas_bancarias';

    protected $fillable = [
        'id_empresa', 'tipo', 'nome', 'banco', 'agencia', 'conta',
        'saldo_inicial', 'data_saldo_inicial', 'ativo',
    ];

    protected $casts = [
        'saldo_inicial' => 'decimal:2',
        'data_saldo_inicial' => 'date',
        'ativo' => 'boolean',
    ];

    public function linhasExtrato(): HasMany
    {
        return $this->hasMany(ExtratoBancarioLinha::class);
    }
}
