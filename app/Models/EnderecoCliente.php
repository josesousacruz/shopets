<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnderecoCliente extends Model
{
    use HasFactory;

    protected $table = 'enderecos_cliente';
    protected $primaryKey = 'id_endereco';

    protected $fillable = [
        'id_cliente',
        'apelido',
        'cep',
        'logradouro',
        'numero',
        'complemento',
        'bairro',
        'cidade',
        'uf',
        'tipo',
        'principal',
    ];

    protected $casts = [
        'principal' => 'boolean',
    ];

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'id_cliente', 'id_cliente');
    }
}
