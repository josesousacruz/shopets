<?php

namespace App\Jobs;

use App\Models\RelatorioAgendamento;
use App\Services\Relatorios\RelatorioBuilder;
use App\Services\Relatorios\RelatorioExportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

class EnviarRelatorioAgendado implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $agendamentoId)
    {
    }

    public function handle(RelatorioBuilder $builder, RelatorioExportService $exporter): void
    {
        $ag = RelatorioAgendamento::find($this->agendamentoId);
        if (! $ag || ! $ag->ativo) {
            return;
        }

        $resultado = $builder->dados($ag->slug, $ag->filtros ?? []);
        $arquivo = $exporter->exportar($resultado['definicao'], $resultado['linhas'], $ag->formato);

        $emails = array_filter(array_map('trim', explode(',', $ag->emails)));
        if ($emails !== []) {
            Mail::raw("Segue em anexo o relatório \"{$resultado['definicao']['nome']}\".", function ($m) use ($emails, $arquivo) {
                $m->to($emails)
                    ->subject('Relatório agendado: '.$arquivo['filename'])
                    ->attachData($arquivo['conteudo'], $arquivo['filename'], ['mime' => $arquivo['content_type']]);
            });
        }

        $ag->update(['proxima_execucao' => $this->proxima($ag->frequencia)]);
    }

    private function proxima(string $frequencia): string
    {
        return match ($frequencia) {
            'diaria' => Carbon::now()->addDay()->toDateString(),
            'semanal' => Carbon::now()->addWeek()->toDateString(),
            default => Carbon::now()->addMonth()->toDateString(),
        };
    }
}
