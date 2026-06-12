<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ClienteTag extends Model
{
    use HasFactory;

    protected $table = 'cliente_tags';

    protected $fillable = ['id_empresa', 'nome', 'cor'];

    public function clientes(): BelongsToMany
    {
        return $this->belongsToMany(Cliente::class, 'cliente_tag', 'tag_id', 'id_cliente');
    }
}
