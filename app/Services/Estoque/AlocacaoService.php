<?php

namespace App\Services\Estoque;

use App\Models\Deposito;
use App\Models\EstoqueSaldo;
use RuntimeException;

class StockUnavailableException extends RuntimeException {}

class AlocacaoService
{
    /**
     * Aloca quantidade de uma variação entre depósitos.
     * Estratégia: tenta default primeiro; se faltar, percorre depósitos ativos
     * por ordem decrescente de saldo disponível.
     *
     * @return array<int, array{deposito_id:int, qtd:int}>
     * @throws StockUnavailableException quando não há saldo suficiente no total
     */
    public function alocar(int $variacaoId, int $qtd): array
    {
        if ($qtd <= 0) return [];

        $alocacao = [];
        $restante = $qtd;

        // 1) tenta default
        $default = Deposito::where('default', true)->where('ativo', true)->first();
        if ($default) {
            $disp = $this->disponivel($variacaoId, $default->id);
            $usar = min($disp, $restante);
            if ($usar > 0) {
                $alocacao[] = ['deposito_id' => $default->id, 'qtd' => $usar];
                $restante -= $usar;
            }
        }

        if ($restante === 0) return $alocacao;

        // 2) demais depósitos ativos por saldo desc
        $ids = collect($alocacao)->pluck('deposito_id');
        $outros = Deposito::where('ativo', true)->whereNotIn('id', $ids)->get();

        $ranked = $outros->map(fn ($d) => [
            'd' => $d, 'disp' => $this->disponivel($variacaoId, $d->id),
        ])->sortByDesc('disp');

        foreach ($ranked as $row) {
            if ($restante === 0) break;
            $usar = min($row['disp'], $restante);
            if ($usar > 0) {
                $alocacao[] = ['deposito_id' => $row['d']->id, 'qtd' => $usar];
                $restante -= $usar;
            }
        }

        if ($restante > 0) {
            throw new StockUnavailableException("Estoque insuficiente: faltam {$restante} unidades.");
        }

        return $alocacao;
    }

    private function disponivel(int $variacaoId, int $depositoId): int
    {
        $saldo = EstoqueSaldo::where('produto_variacao_id', $variacaoId)
            ->where('deposito_id', $depositoId)
            ->first();

        return $saldo ? max(0, $saldo->saldo - $saldo->reservado) : 0;
    }
}
