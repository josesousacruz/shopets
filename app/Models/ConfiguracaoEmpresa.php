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
        'cnpj',
        'endereco',
        'telefone',
        'email',
        'logo_path',
        'taxa_entrega',
        'valor_minimo_entrega',
        'seo_titulo',
        'seo_descricao',
        'og_image_path',
        'ambiente_nfce',
        'csc_nfce',
        'csc_id_nfce',
        'certificado_path',
        'certificado_senha',
    ];

    protected $casts = [
        'taxa_entrega' => 'decimal:2',
        'valor_minimo_entrega' => 'decimal:2',
        'ambiente_nfce' => 'integer',
        'certificado_senha' => 'encrypted',
    ];

    /**
     * Configure activity logging options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nome_empresa', 'cnpj', 'telefone', 'email', 'taxa_entrega', 'valor_minimo_entrega'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
