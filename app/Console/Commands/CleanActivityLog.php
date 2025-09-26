<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Activitylog\Models\Activity;
use Carbon\Carbon;

class CleanActivityLog extends Command
{
    protected $signature = 'activitylog:clean {--days=90 : Número de dias para manter os logs}';
    protected $description = 'Remove logs de atividade antigos para evitar inchaço do banco';

    public function handle()
    {
        $days = $this->option('days');
        $cutoffDate = Carbon::now()->subDays($days);
        
        $deletedCount = Activity::where('created_at', '<', $cutoffDate)->delete();
        
        $this->info("Removidos {$deletedCount} logs de atividade anteriores a {$cutoffDate->format('d/m/Y')}");
        
        return 0;
    }
}