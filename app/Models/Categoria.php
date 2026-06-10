<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Categoria extends Model
{
    use HasFactory, LogsActivity, BelongsToEmpresa;

    protected $primaryKey = 'id_categoria';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'nome',
        'descricao',
        'icone',
        'ativo',
        'id_empresa',
    ];

    protected $casts = [
        'ativo' => 'boolean',
    ];

    /**
     * Configure activity logging options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nome', 'descricao', 'icone', 'ativo'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relacionamento com produtos
     */
    public function produtos()
    {
        return $this->hasMany(Produto::class, 'id_categoria', 'id_categoria');
    }

    /**
     * Scope para categorias ativas
     */
    public function scopeAtivas($query)
    {
        return $query->where('ativo', true);
    }
}
