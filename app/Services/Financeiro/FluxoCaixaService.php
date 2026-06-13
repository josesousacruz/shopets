<?php

namespace App\Services\Financeiro;

use App\Models\ContaPagar;
use App\Models\ContaReceber;
use Illuminate\Support\Carbon;

class FluxoCaixaService
{
    /**
     * Retorna o fluxo de caixa agrupado por dia.
     *
     * @param 'realizado'|'previsto'|'consolidado' $modo
     * @return array{
     *   linhas: array<int, array{data:string, entradas:float, saidas:float, saldo:float}>,
     *   totais: array{entradas:float, saidas:float, saldo:float}
     * }
     */
    public function porDia(string $modo, ?string $de = null, ?string $ate = null, ?int $contaBancariaId = null): array
    {
        $de ??= Carbon::now()->startOfMonth()->toDateString();
        $ate ??= Carbon::now()->endOfMonth()->toDateString();

        $entradas = $this->lancamentos('receber', $modo, $de, $ate, $contaBancariaId);
        $saidas = $this->lancamentos('pagar', $modo, $de, $ate, $contaBancariaId);

        $porData = [];
        foreach ($entradas as $data => $valor) {
            $porData[$data]['entradas'] = ($porData[$data]['entradas'] ?? 0) + $valor;
        }
        foreach ($saidas as $data => $valor) {
            $porData[$data]['saidas'] = ($porData[$data]['saidas'] ?? 0) + $valor;
        }
        ksort($porData);

        $linhas = [];
        $acumulado = 0.0;
        $totEnt = 0.0;
        $totSai = 0.0;
        foreach ($porData as $data => $vals) {
            $ent = round($vals['entradas'] ?? 0, 2);
            $sai = round($vals['saidas'] ?? 0, 2);
            $acumulado += $ent - $sai;
            $totEnt += $ent;
            $totSai += $sai;
            $linhas[] = [
                'data' => $data,
                'entradas' => $ent,
                'saidas' => $sai,
                'saldo' => round($acumulado, 2),
            ];
        }

        return [
            'linhas' => $linhas,
            'totais' => [
                'entradas' => round($totEnt, 2),
                'saidas' => round($totSai, 2),
                'saldo' => round($totEnt - $totSai, 2),
            ],
        ];
    }

    /**
     * @return array<string,float> data => soma de valor
     */
    private function lancamentos(string $tipo, string $modo, string $de, string $ate, ?int $contaBancariaId): array
    {
        if ($tipo === 'receber') {
            $q = ContaReceber::query()->where('ativo', true);
            $colData = $modo === 'realizado' ? 'data_recebimento' : ($modo === 'previsto' ? 'data_vencimento' : null);
            $colValor = $modo === 'previsto' ? 'valor_original' : 'valor_recebido';
            $statusRealizado = 'recebido';
        } else {
            $q = ContaPagar::query()->where('ativo', true);
            $colData = $modo === 'realizado' ? 'data_pagamento' : ($modo === 'previsto' ? 'data_vencimento' : null);
            $colValor = $modo === 'previsto' ? 'valor_original' : 'valor_pago';
            $statusRealizado = 'pago';
        }

        if ($contaBancariaId) {
            $q->where('conta_bancaria_id', $contaBancariaId);
        }

        if ($modo === 'consolidado') {
            // Realizado (por data efetiva) + previsto pendente (por vencimento), unificados.
            $real = $this->coletar((clone $q)->where('status', $statusRealizado),
                $tipo === 'receber' ? 'data_recebimento' : 'data_pagamento',
                $tipo === 'receber' ? 'valor_recebido' : 'valor_pago', $de, $ate);
            $prev = $this->coletar((clone $q)->where('status', 'pendente'),
                'data_vencimento', 'valor_original', $de, $ate);

            $merged = $real;
            foreach ($prev as $d => $v) {
                $merged[$d] = ($merged[$d] ?? 0) + $v;
            }

            return $merged;
        }

        if ($modo === 'realizado') {
            $q->where('status', $statusRealizado);
        } else {
            $q->where('status', 'pendente');
        }

        return $this->coletar($q, $colData, $colValor, $de, $ate);
    }

    private function coletar($query, string $colData, string $colValor, string $de, string $ate): array
    {
        $rows = $query
            ->whereNotNull($colData)
            ->whereBetween($colData, [$de, $ate])
            ->get([$colData, $colValor]);

        $out = [];
        foreach ($rows as $r) {
            $data = Carbon::parse($r->{$colData})->toDateString();
            $out[$data] = ($out[$data] ?? 0) + (float) $r->{$colValor};
        }

        return $out;
    }
}
