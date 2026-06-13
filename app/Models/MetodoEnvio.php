<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MetodoEnvio extends Model
{
    protected $table = 'metodos_envio';

    protected $fillable = ['nome', 'tipo', 'config', 'ativo', 'ordem'];

    protected $casts = [
        'config' => 'array',
        'ativo' => 'boolean',
        'ordem' => 'integer',
    ];
}
