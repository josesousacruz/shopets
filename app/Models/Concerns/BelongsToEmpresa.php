<?php

namespace App\Models\Concerns;

use App\Models\ConfiguracaoEmpresa;
use Illuminate\Database\Eloquent\Builder;

trait BelongsToEmpresa
{
    public static function bootBelongsToEmpresa(): void
    {
        static::creating(function ($model) {
            if (empty($model->id_empresa)) {
                $model->id_empresa = static::resolveCurrentEmpresaId();
            }
        });

        static::addGlobalScope('empresa', function (Builder $builder) {
            $builder->where($builder->getModel()->getTable().'.id_empresa', static::resolveCurrentEmpresaId());
        });
    }

    public function empresa()
    {
        return $this->belongsTo(ConfiguracaoEmpresa::class, 'id_empresa');
    }

    protected static function resolveCurrentEmpresaId(): int
    {
        return (int) config('app.current_empresa_id', 1);
    }
}
