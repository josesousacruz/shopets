<?php

namespace App\Domain\Shipping;

use App\Models\ConfiguracaoEmpresa;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Gerencia o ciclo OAuth2 do Melhor Envio para a loja (single-tenant).
 *
 * O aplicativo é registrado no Melhor Envio (um app POR AMBIENTE — sandbox e
 * produção são separados) e o client_id/secret de cada ambiente é configurado
 * pela tela do admin (banco, com fallback pro .env). O lojista autoriza a
 * própria conta ME e os tokens ficam na ConfiguracaoEmpresa, criptografados.
 * `validToken()` renova via refresh_token quando expirado.
 */
class MelhorEnvioTokenManager
{
    private const SANDBOX_URL = 'https://sandbox.melhorenvio.com.br';

    private const PROD_URL = 'https://www.melhorenvio.com.br';

    /** Margem de segurança para considerar o token expirado (segundos). */
    private const MARGEM_EXPIRACAO = 60;

    /** Escopos necessários para cotação, compra, etiqueta e rastreio. */
    private const SCOPES = 'shipping-calculate shipping-checkout shipping-generate '
        .'shipping-preview shipping-print shipping-tracking cart-read cart-write';

    public function isConnected(): bool
    {
        $config = ConfiguracaoEmpresa::first();

        return $config !== null && ! empty($config->melhor_envio_access_token);
    }

    public function authorizeUrl(string $state): string
    {
        $params = http_build_query([
            'client_id' => $this->clientId(),
            'redirect_uri' => $this->redirectUri(),
            'response_type' => 'code',
            'state' => $state,
            'scope' => self::SCOPES,
        ]);

        return $this->baseUrl().'/oauth/authorize?'.$params;
    }

    /**
     * O app do ambiente ativo está configurado (client_id + secret presentes)?
     */
    public function appConfigurado(): bool
    {
        return $this->clientId() !== '' && $this->clientSecret() !== '';
    }

    /**
     * URL de callback que precisa estar registrada no app do Melhor Envio.
     * Derivada de APP_URL; MELHORENVIO_REDIRECT_URI no .env sobrepõe (útil em
     * dev com túnel ngrok, onde a URL pública difere do APP_URL local).
     */
    public function redirectUri(): string
    {
        $override = (string) config('services.shipping.melhorenvio.redirect_uri', '');

        if ($override !== '') {
            return $override;
        }

        return rtrim((string) config('app.url'), '/').'/painel/integracoes/melhor-envio/callback';
    }

    /**
     * Troca o authorization code por tokens e os persiste na loja.
     */
    public function exchangeCode(string $code): void
    {
        $tokens = $this->requestTokens([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $this->redirectUri(),
        ]);

        $this->store($tokens);
    }

    /**
     * Retorna um access token válido, renovando via refresh_token se expirado.
     */
    public function validToken(): string
    {
        $config = ConfiguracaoEmpresa::first();

        if ($config === null || empty($config->melhor_envio_access_token)) {
            throw new RuntimeException('Melhor Envio não conectado. Conecte a conta no painel.');
        }

        $expira = $config->melhor_envio_token_expira_em;
        if ($expira !== null && $expira->subSeconds(self::MARGEM_EXPIRACAO)->isPast()) {
            return $this->refresh($config);
        }

        return $config->melhor_envio_access_token;
    }

    public function disconnect(): void
    {
        $config = ConfiguracaoEmpresa::first();

        $config?->update([
            'melhor_envio_access_token' => null,
            'melhor_envio_refresh_token' => null,
            'melhor_envio_token_expira_em' => null,
        ]);
    }

    private function refresh(ConfiguracaoEmpresa $config): string
    {
        $tokens = $this->requestTokens([
            'grant_type' => 'refresh_token',
            'refresh_token' => $config->melhor_envio_refresh_token,
        ]);

        $this->store($tokens);

        return $tokens['access_token'];
    }

    /**
     * @return array{access_token:string, refresh_token:string, expires_in:int}
     */
    private function requestTokens(array $extra): array
    {
        return Http::asJson()
            ->acceptJson()
            ->post($this->baseUrl().'/oauth/token', array_merge([
                'client_id' => $this->clientId(),
                'client_secret' => $this->clientSecret(),
            ], $extra))
            ->throw()
            ->json();
    }

    /**
     * client_id do app do ambiente ativo — tela do admin (banco) primeiro,
     * .env como fallback (modelo "plataforma configura por env").
     */
    private function clientId(): string
    {
        $config = ConfiguracaoEmpresa::first();
        $doBanco = $this->sandbox()
            ? $config?->melhor_envio_sandbox_client_id
            : $config?->melhor_envio_prod_client_id;

        return (string) ($doBanco ?: config('services.shipping.melhorenvio.client_id', ''));
    }

    private function clientSecret(): string
    {
        $config = ConfiguracaoEmpresa::first();
        $doBanco = $this->sandbox()
            ? $config?->melhor_envio_sandbox_client_secret
            : $config?->melhor_envio_prod_client_secret;

        return (string) ($doBanco ?: config('services.shipping.melhorenvio.client_secret', ''));
    }

    private function sandbox(): bool
    {
        return (bool) (ConfiguracaoEmpresa::first()?->melhor_envio_sandbox ?? true);
    }

    private function store(array $tokens): void
    {
        $config = ConfiguracaoEmpresa::firstOrNew([]);

        $config->melhor_envio_access_token = $tokens['access_token'];
        $config->melhor_envio_refresh_token = $tokens['refresh_token'];
        $config->melhor_envio_token_expira_em = Carbon::now()->addSeconds((int) $tokens['expires_in']);
        $config->save();
    }

    private function baseUrl(): string
    {
        // Ambiente vem da tela Configurações (banco), não mais do .env. Sandbox e
        // produção são ambientes SEPARADOS (contas/apps distintos) — trocar o toggle
        // desconecta os tokens salvos (ver ConfiguracaoController::update).
        return $this->sandbox() ? self::SANDBOX_URL : self::PROD_URL;
    }
}
