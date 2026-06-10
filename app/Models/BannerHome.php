<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BannerHome extends Model
{
    use HasFactory, BelongsToEmpresa;

    protected $table = 'banners_home';
    protected $primaryKey = 'id_banner';

    protected $fillable = [
        'id_empresa',
        'titulo',
        'subtitulo',
        'imagem_path',
        'link',
        'ordem',
        'ativo',
        'vigencia_de',
        'vigencia_ate',
    ];

    protected $casts = [
        'ordem' => 'integer',
        'ativo' => 'boolean',
        'vigencia_de' => 'datetime',
        'vigencia_ate' => 'datetime',
    ];

    /**
     * Banners ativos cuja vigência cobre o momento atual.
     */
    public function scopeVigentes(Builder $query): Builder
    {
        $agora = now();

        return $query->where('ativo', true)
            ->where(function (Builder $q) use ($agora) {
                $q->whereNull('vigencia_de')->orWhere('vigencia_de', '<=', $agora);
            })
            ->where(function (Builder $q) use ($agora) {
                $q->whereNull('vigencia_ate')->orWhere('vigencia_ate', '>=', $agora);
            });
    }
}
