<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

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
        'certificado_validade',
        'melhor_envio_access_token',
        'melhor_envio_refresh_token',
        'melhor_envio_token_expira_em',
        'melhor_envio_sandbox',
        'melhor_envio_sandbox_client_id',
        'melhor_envio_sandbox_client_secret',
        'melhor_envio_prod_client_id',
        'melhor_envio_prod_client_secret',
        'payment_driver',
        'yapay_token_account',
        'yapay_sandbox',
        'mercadopago_access_token',
        'mercadopago_sandbox',
        'mercadopago_webhook_secret',
        'shipping_driver',
        'endereco_cep',
        'endereco_logradouro',
        'endereco_numero',
        'endereco_complemento',
        'endereco_bairro',
        'endereco_cidade',
        'endereco_uf',
        'endereco_codigo_ibge',
        'inscricao_estadual',
        'regime_tributario',
        'nfe_serie',
        'nfe_proximo_numero',
        'caixa_modo_sessao',
    ];

    protected $casts = [
        'taxa_entrega' => 'decimal:2',
        'valor_minimo_entrega' => 'decimal:2',
        'ambiente_nfce' => 'integer',
        'certificado_senha' => 'encrypted',
        'melhor_envio_access_token' => 'encrypted',
        'melhor_envio_refresh_token' => 'encrypted',
        'melhor_envio_token_expira_em' => 'datetime',
        'melhor_envio_sandbox' => 'boolean',
        'melhor_envio_sandbox_client_secret' => 'encrypted',
        'melhor_envio_prod_client_secret' => 'encrypted',
        'yapay_token_account' => 'encrypted',
        'yapay_sandbox' => 'boolean',
        'mercadopago_access_token' => 'encrypted',
        'mercadopago_sandbox' => 'boolean',
        'mercadopago_webhook_secret' => 'encrypted',
        'nfe_proximo_numero' => 'integer',
        'certificado_validade' => 'datetime',
        'caixa_modo_sessao' => 'boolean',
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
