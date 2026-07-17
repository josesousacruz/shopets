<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Domain\Shipping\MelhorEnvioTokenManager;
use App\Http\Controllers\Controller;
use App\Models\ConfiguracaoEmpresa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use NFePHP\Common\Certificate;
use Throwable;

class ConfiguracaoController extends Controller
{
    public function show(): JsonResponse
    {
        $config = ConfiguracaoEmpresa::first();

        return response()->json([
            'data' => [
                'loja' => [
                    'nome_empresa' => $config?->nome_empresa,
                    'cnpj' => $config?->cnpj,
                    'endereco' => $config?->endereco,
                    'telefone' => $config?->telefone,
                    'email' => $config?->email,
                    'logo_path' => $config?->logo_path,
                    'taxa_entrega' => (float) ($config?->taxa_entrega ?? 0),
                    'valor_minimo_entrega' => (float) ($config?->valor_minimo_entrega ?? 0),
                    // Endereço estruturado — usado na compra de etiqueta real e na nota fiscal.
                    'endereco_cep' => $config?->endereco_cep,
                    'endereco_logradouro' => $config?->endereco_logradouro,
                    'endereco_numero' => $config?->endereco_numero,
                    'endereco_complemento' => $config?->endereco_complemento,
                    'endereco_bairro' => $config?->endereco_bairro,
                    'endereco_cidade' => $config?->endereco_cidade,
                    'endereco_uf' => $config?->endereco_uf,
                    'endereco_codigo_ibge' => $config?->endereco_codigo_ibge,
                    'caixa_modo_sessao' => (bool) ($config?->caixa_modo_sessao ?? false),
                ],
                'seo' => [
                    'seo_titulo' => $config?->seo_titulo,
                    'seo_descricao' => $config?->seo_descricao,
                    'og_image_path' => $config?->og_image_path,
                ],
                'fiscal' => [
                    'ambiente_nfce' => (int) ($config?->ambiente_nfce ?? 2),
                    'csc_nfce' => $config?->csc_nfce,
                    'csc_id_nfce' => $config?->csc_id_nfce,
                    'certificado_path' => $config?->certificado_path,
                    // Nunca devolver a senha do certificado; apenas se está definida.
                    'certificado_definido' => ! empty($config?->certificado_senha),
                    'certificado_validade' => optional($config?->certificado_validade)->toIso8601String(),
                    'inscricao_estadual' => $config?->inscricao_estadual,
                    'regime_tributario' => $config?->regime_tributario ?: '1',
                    'nfe_serie' => $config?->nfe_serie ?: '1',
                    'nfe_proximo_numero' => (int) ($config?->nfe_proximo_numero ?: 1),
                ],
                'integracoes' => [
                    'payment_driver' => $config?->payment_driver ?: 'fake',
                    'yapay_sandbox' => (bool) ($config?->yapay_sandbox ?? true),
                    // Nunca devolver tokens/secrets; apenas se estão definidos.
                    'yapay_configurado' => ! empty($config?->yapay_token_account),
                    'mercadopago_sandbox' => (bool) ($config?->mercadopago_sandbox ?? true),
                    'mercadopago_configurado' => ! empty($config?->mercadopago_access_token),
                    'mercadopago_webhook_configurado' => ! empty($config?->mercadopago_webhook_secret),
                    'shipping_driver' => $config?->shipping_driver ?: 'stub',
                    'melhor_envio_sandbox' => (bool) ($config?->melhor_envio_sandbox ?? true),
                    // Credenciais do app ME por ambiente: client_id é público (volta);
                    // secret é write-only (só a flag).
                    'melhor_envio_sandbox_client_id' => $config?->melhor_envio_sandbox_client_id,
                    'melhor_envio_sandbox_secret_configurado' => ! empty($config?->melhor_envio_sandbox_client_secret),
                    'melhor_envio_prod_client_id' => $config?->melhor_envio_prod_client_id,
                    'melhor_envio_prod_secret_configurado' => ! empty($config?->melhor_envio_prod_client_secret),
                    // URL que precisa estar registrada no app do ME (read-only na tela).
                    'melhor_envio_callback_url' => app(MelhorEnvioTokenManager::class)->redirectUri(),
                ],
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nome_empresa' => ['nullable', 'string', 'max:100'],
            'cnpj' => ['nullable', 'string', 'max:18'],
            'endereco' => ['nullable', 'string', 'max:200'],
            'telefone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:100'],
            'logo_path' => ['nullable', 'string', 'max:255'],
            'taxa_entrega' => ['nullable', 'numeric', 'min:0'],
            'valor_minimo_entrega' => ['nullable', 'numeric', 'min:0'],
            'endereco_cep' => ['nullable', 'string', 'max:9'],
            'endereco_logradouro' => ['nullable', 'string', 'max:150'],
            'endereco_numero' => ['nullable', 'string', 'max:20'],
            'endereco_complemento' => ['nullable', 'string', 'max:100'],
            'endereco_bairro' => ['nullable', 'string', 'max:100'],
            'endereco_cidade' => ['nullable', 'string', 'max:100'],
            'endereco_uf' => ['nullable', 'string', 'size:2'],
            'endereco_codigo_ibge' => ['nullable', 'string', 'max:7'],
            'caixa_modo_sessao' => ['nullable', 'boolean'],
            'seo_titulo' => ['nullable', 'string', 'max:70'],
            'seo_descricao' => ['nullable', 'string', 'max:200'],
            'og_image_path' => ['nullable', 'string', 'max:255'],
            'ambiente_nfce' => ['nullable', 'integer', 'in:1,2'],
            'csc_nfce' => ['nullable', 'string', 'max:60'],
            'csc_id_nfce' => ['nullable', 'string', 'max:10'],
            'inscricao_estadual' => ['nullable', 'string', 'max:20'],
            'regime_tributario' => ['nullable', 'string', 'in:1,2,3'],
            'nfe_serie' => ['nullable', 'string', 'max:10'],
            'nfe_proximo_numero' => ['nullable', 'integer', 'min:1'],
            'payment_driver' => ['nullable', 'string', 'in:fake,yapay,mercadopago'],
            'yapay_token_account' => ['nullable', 'string', 'max:255'],
            'yapay_sandbox' => ['nullable', 'boolean'],
            'mercadopago_access_token' => ['nullable', 'string', 'max:255'],
            'mercadopago_sandbox' => ['nullable', 'boolean'],
            'mercadopago_webhook_secret' => ['nullable', 'string', 'max:255'],
            'shipping_driver' => ['nullable', 'string', 'in:stub,melhorenvio'],
            'melhor_envio_sandbox' => ['nullable', 'boolean'],
            'melhor_envio_sandbox_client_id' => ['nullable', 'string', 'max:191'],
            'melhor_envio_sandbox_client_secret' => ['nullable', 'string', 'max:255'],
            'melhor_envio_prod_client_id' => ['nullable', 'string', 'max:191'],
            'melhor_envio_prod_client_secret' => ['nullable', 'string', 'max:255'],
        ]);

        // Campos write-only: reenviar em branco não apaga o valor já salvo (a
        // tela nunca mostra o valor atual, só se está "configurado"). Checa
        // vazio/null porque o middleware global converte '' em null antes daqui.
        $writeOnlyFields = [
            'yapay_token_account',
            'mercadopago_access_token',
            'mercadopago_webhook_secret',
            'melhor_envio_sandbox_client_secret',
            'melhor_envio_prod_client_secret',
        ];
        foreach ($writeOnlyFields as $writeOnly) {
            if (array_key_exists($writeOnly, $data) && empty($data[$writeOnly])) {
                unset($data[$writeOnly]);
            }
        }

        $config = ConfiguracaoEmpresa::first();

        // Sandbox e produção do Melhor Envio são AMBIENTES SEPARADOS (contas e apps
        // distintos): trocar de ambiente invalida os tokens OAuth conectados, então
        // a troca desconecta a conta — a tela avisa que é preciso reconectar.
        $sandboxAtual = (bool) ($config?->melhor_envio_sandbox ?? true);
        $sandboxNovo = array_key_exists('melhor_envio_sandbox', $data) && $data['melhor_envio_sandbox'] !== null
            ? (bool) $data['melhor_envio_sandbox']
            : $sandboxAtual;

        $trocouAmbiente = $sandboxNovo !== $sandboxAtual;

        // Trocar as credenciais do app do ambiente ATIVO também desconecta: os
        // tokens da conta foram emitidos pro app antigo — o refresh com o app novo
        // falharia de forma críptica. Reconectar emite tokens válidos pro app novo.
        $parAtivo = $sandboxNovo
            ? ['melhor_envio_sandbox_client_id', 'melhor_envio_sandbox_client_secret']
            : ['melhor_envio_prod_client_id', 'melhor_envio_prod_client_secret'];
        $trocouCredencialAtiva = collect($parAtivo)->contains(
            fn (string $campo) => array_key_exists($campo, $data) && $data[$campo] !== $config?->{$campo}
        );

        if ($trocouAmbiente || $trocouCredencialAtiva) {
            $data['melhor_envio_access_token'] = null;
            $data['melhor_envio_refresh_token'] = null;
            $data['melhor_envio_token_expira_em'] = null;
        }

        if ($config) {
            $config->update($data);
        } else {
            $config = ConfiguracaoEmpresa::create($data);
        }

        return $this->show();
    }

    /**
     * POST /painel/configuracoes/certificado — upload do certificado A1 (.pfx).
     *
     * Valida a senha na hora (Certificate::readPfx — rejeita se a senha estiver
     * errada ou o arquivo não for um .pfx válido) antes de gravar qualquer coisa.
     * Guardado fora do disco público (storage/app/certificados), nunca acessível
     * por URL direta.
     */
    public function uploadCertificado(Request $request): JsonResponse
    {
        $data = $request->validate([
            'certificado' => ['required', 'file', 'max:5120'],
            'senha' => ['required', 'string'],
        ]);

        $conteudo = file_get_contents($data['certificado']->getRealPath());

        try {
            $cert = Certificate::readPfx($conteudo, $data['senha']);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Certificado inválido ou senha incorreta.',
                'errors' => ['certificado' => ['Não foi possível abrir o arquivo com a senha informada.']],
            ], 422);
        }

        $config = ConfiguracaoEmpresa::first() ?? ConfiguracaoEmpresa::create(['nome_empresa' => 'Loja']);

        $caminho = 'certificados/'.$config->id.'.pfx';
        Storage::disk('local')->put($caminho, $conteudo);

        $config->update([
            'certificado_path' => $caminho,
            'certificado_senha' => $data['senha'],
            'certificado_validade' => $cert->getValidTo(),
        ]);

        return response()->json([
            'message' => 'Certificado enviado com sucesso.',
            'data' => [
                'certificado_definido' => true,
                'certificado_validade' => $cert->getValidTo()?->format('c'),
                'expirado' => $cert->isExpired(),
            ],
        ]);
    }
}
