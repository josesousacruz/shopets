<?php

namespace App\Jobs;

use App\Models\ReservaEstoque;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Remove reservas de estoque expiradas e ainda não consumidas, liberando o soft-hold.
 * Agendado a cada 1 minuto.
 */
class LimparReservasExpiradas implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): int
    {
        return ReservaEstoque::query()
            ->whereNull('consumida_em')
            ->where('expira_em', '<', now())
            ->delete();
    }
}
