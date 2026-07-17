<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Domain\Shipping\MelhorEnvioTokenManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Throwable;

/**
 * Conexão OAuth2 do lojista com a própria conta do Melhor Envio.
 *
 * connect/status/disconnect são chamados pelo painel (autenticados). O callback
 * é uma navegação do browser vinda do Melhor Envio — protegido por `state`.
 */
class MelhorEnvioIntegracaoController extends Controller
{
    private const STATE_KEY = 'melhor_envio_oauth_state';

    public function __construct(private readonly MelhorEnvioTokenManager $tokens) {}

    public function status(): JsonResponse
    {
        return response()->json(['data' => ['conectado' => $this->tokens->isConnected()]]);
    }

    public function connect(): JsonResponse
    {
        // Sem o app registrado no Melhor Envio, a URL de autorização sairia com
        // client_id vazio e o ME devolve um erro OAuth confuso
        // ("unsupported_grant_type"). Falha aqui com instrução clara.
        if (! $this->tokens->appConfigurado()) {
            return response()->json([
                'message' => 'Aplicativo do Melhor Envio não configurado para este ambiente. Registre um aplicativo no painel do '
                    .'Melhor Envio (sandbox e produção são apps separados) e preencha o Client ID e o Client Secret no card '
                    .'Melhor Envio desta tela.',
            ], 422);
        }

        $state = Str::random(40);
        Cache::put(self::STATE_KEY, $state, now()->addMinutes(10));

        return response()->json(['data' => ['url' => $this->tokens->authorizeUrl($state)]]);
    }

    public function disconnect(): JsonResponse
    {
        $this->tokens->disconnect();

        return response()->json(['data' => ['conectado' => false]]);
    }

    public function callback(Request $request): RedirectResponse
    {
        $esperado = Cache::pull(self::STATE_KEY);
        $code = (string) $request->query('code');

        if (empty($esperado) || $request->query('state') !== $esperado || $code === '') {
            return redirect()->away($this->painelUrl('erro'));
        }

        try {
            $this->tokens->exchangeCode($code);
        } catch (Throwable $e) {
            return redirect()->away($this->painelUrl('erro'));
        }

        return redirect()->away($this->painelUrl('conectado'));
    }

    private function painelUrl(string $status): string
    {
        $base = rtrim((string) env('STOREFRONT_URL', 'http://localhost:3000'), '/');

        return $base.'/painel/configuracoes?melhor_envio='.$status;
    }
}
