<?php

namespace App\Services\Financeiro;

use App\Models\ContaPagar;
use App\Models\ContaReceber;
use App\Models\PlanoConta;
use Illuminate\Support\Carbon;

class DREService
{
    /**
     * Demonstrativo de resultado por período (regime de caixa: contas baixadas).
     *
     * @return array{
     *   periodo: array{de:string, ate:string},
     *   receitas: array<int, array{plano:string, total:float}>,
     *   despesas: array<int, array{plano:string, total:float}>,
     *   total_receitas: float, total_despesas: float, lucro_liquido: float
     * }
     */
    public function gerar(?string $de = null, ?string $ate = null): array
    {
        $de ??= Carbon::now()->startOfMonth()->toDateString();
        $ate ??= Carbon::now()->endOfMonth()->toDateString();

        $planos = PlanoConta::pluck('nome', 'id');

        $receitas = $this->agrupar(
            ContaReceber::query()->where('ativo', true)->where('status', 'recebido')
                ->whereNotNull('data_recebimento')
                ->whereBetween('data_recebimento', [$de, $ate])
                ->get(['plano_conta_id', 'categoria', 'valor_recebido as valor']),
            $planos,
        );

        $despesas = $this->agrupar(
            ContaPagar::query()->where('ativo', true)->where('status', 'pago')
                ->whereNotNull('data_pagamento')
                ->whereBetween('data_pagamento', [$de, $ate])
                ->get(['plano_conta_id', 'categoria', 'valor_pago as valor']),
            $planos,
        );

        $totalReceitas = round(array_sum(array_column($receitas, 'total')), 2);
        $totalDespesas = round(array_sum(array_column($despesas, 'total')), 2);

        return [
            'periodo' => ['de' => $de, 'ate' => $ate],
            'receitas' => $receitas,
            'despesas' => $despesas,
            'total_receitas' => $totalReceitas,
            'total_despesas' => $totalDespesas,
            'lucro_liquido' => round($totalReceitas - $totalDespesas, 2),
        ];
    }

    private function agrupar($rows, $planos): array
    {
        $grupos = [];
        foreach ($rows as $r) {
            $label = $r->plano_conta_id && isset($planos[$r->plano_conta_id])
                ? $planos[$r->plano_conta_id]
                : ($r->categoria ?? 'Sem classificação');
            $grupos[$label] = ($grupos[$label] ?? 0) + (float) $r->valor;
        }
        $out = [];
        foreach ($grupos as $plano => $total) {
            $out[] = ['plano' => $plano, 'total' => round($total, 2)];
        }
        usort($out, fn ($a, $b) => $b['total'] <=> $a['total']);

        return $out;
    }
}
