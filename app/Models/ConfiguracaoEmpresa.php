<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class ConfiguracaoEmpresa extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'configuracoes_empresa';

    protected $fillable = [
        'nome_empresa',
        'razao_social',
        'cnpj',
        'endereco',
        'telefone',
        'email',
        'logo',
        'configuracoes_sistema',
    ];

    protected $casts = [
        'configuracoes_sistema' => 'array',
    ];

    /**
     * Configure activity logging options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nome_empresa', 'razao_social', 'cnpj', 'telefone', 'email', 'configuracoes_sistema'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
