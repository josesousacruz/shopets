<?php

namespace App\Providers;

use App\Domain\Payment\FakePaymentGateway;
use App\Domain\Payment\MercadoPagoGateway;
use App\Domain\Payment\PaymentGatewayInterface;
use App\Domain\Payment\YapayGateway;
use App\Domain\Shipping\MelhorEnvioService;
use App\Domain\Shipping\MelhorEnvioTokenManager;
use App\Domain\Shipping\ShippingQuoteInterface;
use App\Domain\Shipping\StubShippingService;
use App\Models\ConfiguracaoEmpresa;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(ShippingQuoteInterface::class, function ($app) {
            // Driver e ambiente vêm da tela Configurações → Pagamento/Frete (não mais
            // do .env) — sem linha em configuracoes_empresa (banco recém-criado),
            // cai em 'stub' / sandbox.
            $config = ConfiguracaoEmpresa::first();
            $driver = $config?->shipping_driver ?: 'stub';

            return match ($driver) {
                'melhorenvio', 'melhor_envio' => new MelhorEnvioService(
                    $this->melhorEnvioToken($app),
                    (bool) ($config?->melhor_envio_sandbox ?? true),
                ),
                default => new StubShippingService,
            };
        });

        $this->app->singleton(PaymentGatewayInterface::class, function ($app) {
            // Driver e credenciais vêm da tela de Configurações (não mais do .env) —
            // sem linha em configuracoes_empresa (banco recém-criado), cai em 'fake'.
            $config = ConfiguracaoEmpresa::first();
            $driver = $config?->payment_driver ?: 'fake';

            return match ($driver) {
                'mercadopago' => new MercadoPagoGateway($config?->mercadopago_access_token),
                'yapay' => new YapayGateway(
                    $config?->yapay_token_account,
                    // Homologação por padrão mesmo sem config explícita.
                    (bool) ($config?->yapay_sandbox ?? true),
                ),
                default => new FakePaymentGateway,
            };
        });
    }

    /**
     * Resolve o access token do Melhor Envio.
     *
     * Com o app OAuth configurado (client_id/secret na tela do admin, ou .env como
     * fallback), o token vem da conta conectada pelo lojista (renovado sob demanda).
     * Sem OAuth, usa o token estático do .env.
     * Não conectado ainda → null (o service lança ao ser efetivamente usado).
     */
    private function melhorEnvioToken($app): ?string
    {
        $manager = $app->make(MelhorEnvioTokenManager::class);

        if ($manager->appConfigurado()) {
            return $manager->isConnected() ? $manager->validToken() : null;
        }

        return config('services.shipping.melhorenvio.token')
            ?? config('services.shipping.melhor_envio.token');
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force HTTPS only in production environment
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        // Link de redefinição de senha aponta para o storefront (Remix).
        ResetPassword::createUrlUsing(function ($notifiable, string $token) {
            $base = rtrim(env('STOREFRONT_URL', 'http://localhost:3000'), '/');

            return $base.'/redefinir-senha/'.$token.'?email='.urlencode($notifiable->getEmailForPasswordReset());
        });

        // Hook financeiro: pedido pago gera Conta a Receber (Fluxo/DRE).
        \App\Models\Pedido::observe(\App\Observers\PedidoObserver::class);

        // RBAC: papel "super-admin" tem todas as permissões automaticamente.
        // Retornar null deixa a checagem normal seguir; retornar true autoriza.
        Gate::before(function ($user, $ability) {
            if ($user && method_exists($user, 'hasRole') && $user->hasRole('super-admin')) {
                return true;
            }

            return null;
        });
    }
}
