<?php

namespace App\Providers;

use App\Domain\Payment\FakePaymentGateway;
use App\Domain\Payment\MercadoPagoGateway;
use App\Domain\Payment\PaymentGatewayInterface;
use App\Domain\Shipping\MelhorEnvioService;
use App\Domain\Shipping\ShippingQuoteInterface;
use App\Domain\Shipping\StubShippingService;
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
            $driver = config('services.shipping.driver', 'stub');

            return match ($driver) {
                'melhorenvio', 'melhor_envio' => new MelhorEnvioService(
                    config('services.shipping.melhorenvio.token') ?? config('services.shipping.melhor_envio.token'),
                    (bool) config('services.shipping.melhorenvio.sandbox', true),
                ),
                default => new StubShippingService(),
            };
        });

        $this->app->singleton(PaymentGatewayInterface::class, function ($app) {
            $driver = config('services.payment.driver', 'fake');

            return match ($driver) {
                'mercadopago' => new MercadoPagoGateway(config('services.payment.mercadopago.token')),
                default => new FakePaymentGateway(),
            };
        });
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
