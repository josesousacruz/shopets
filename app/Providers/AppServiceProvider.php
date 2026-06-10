<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
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
    }
}
