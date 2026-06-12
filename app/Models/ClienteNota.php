<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClienteNota extends Model
{
    use HasFactory;

    protected $table = 'cliente_notas';

    protected $fillable = ['id_cliente', 'user_id', 'texto'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'id_cliente', 'id_cliente');
    }
}
