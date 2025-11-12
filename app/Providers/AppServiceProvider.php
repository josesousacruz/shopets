<?php

namespace App\Providers;

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
    // if (app()->runningInConsole()) {
    //     return; // evita rodar durante composer install
    // }
    // if (config('app.env') === 'production') {
        URL::forceScheme('https');
    // }
    }
}
