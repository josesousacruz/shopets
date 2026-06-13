<?php

use App\Jobs\EnviarRelatorioAgendado;
use App\Jobs\LimparReservasExpiradas;
use App\Models\RelatorioAgendamento;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new LimparReservasExpiradas())->everyMinute();

// Dispara relatórios agendados cuja próxima execução chegou.
Schedule::call(function () {
    RelatorioAgendamento::where('ativo', true)
        ->whereDate('proxima_execucao', '<=', now()->toDateString())
        ->pluck('id')
        ->each(fn ($id) => EnviarRelatorioAgendado::dispatch($id));
})->dailyAt('06:00');
