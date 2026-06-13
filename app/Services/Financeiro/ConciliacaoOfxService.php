<?php

namespace App\Services\Financeiro;

use App\Models\ContaBancaria;
use App\Models\ContaPagar;
use App\Models\ContaReceber;
use App\Models\ExtratoBancarioLinha;
use Illuminate\Support\Carbon;
use OfxParser\Parser;
use RuntimeException;

class ConciliacaoOfxException extends RuntimeException {}

class ConciliacaoOfxService
{
    /**
     * Importa as linhas de um arquivo OFX (conteúdo string) para uma conta bancária,
     * deduplicando por fitid.
     *
     * @return array{importadas:int, ignoradas:int}
     */
    public function importar(ContaBancaria $conta, string $conteudo): array
    {
        try {
            $ofx = (new Parser())->loadFromString($conteudo);
        } catch (\Throwable $e) {
            throw new ConciliacaoOfxException('Arquivo OFX inválido: '.$e->getMessage());
        }

        $importadas = 0;
        $ignoradas = 0;

        foreach ($ofx->BankAccounts as $bankAccount) {
            foreach ($bankAccount->Statement->transactions as $tx) {
                $fitid = $tx->uniqueId ?: null;

                if ($fitid && ExtratoBancarioLinha::where('conta_bancaria_id', $conta->id)->where('fitid', $fitid)->exists()) {
                    $ignoradas++;
                    continue;
                }

                ExtratoBancarioLinha::create([
                    'conta_bancaria_id' => $conta->id,
                    'data' => $tx->date instanceof \DateTimeInterface ? Carbon::instance($tx->date)->toDateString() : Carbon::now()->toDateString(),
                    'valor' => (float) $tx->amount,
                    'memo' => $tx->memo ?: ($tx->name ?? null),
                    'fitid' => $fitid,
                    'tipo_ofx' => $tx->type ?? null,
                ]);
                $importadas++;
            }
        }

        return ['importadas' => $importadas, 'ignoradas' => $ignoradas];
    }

    /**
     * Sugere candidatos de conciliação (AP se saída, AR se entrada),
     * por valor exato, data ±3 dias, ranqueados por similaridade de descrição.
     *
     * @return array<int, array{tipo:string, id:int, descricao:string, valor:float, data_vencimento:string, score:int}>
     */
    public function sugerir(ExtratoBancarioLinha $linha): array
    {
        $valor = abs((float) $linha->valor);
        $dataMin = Carbon::parse($linha->data)->subDays(3)->toDateString();
        $dataMax = Carbon::parse($linha->data)->addDays(3)->toDateString();
        $memo = (string) ($linha->memo ?? '');

        $candidatos = [];

        if ((float) $linha->valor < 0) {
            $rows = ContaPagar::where('ativo', true)->where('status', 'pendente')
                ->where('valor_original', $valor)
                ->whereBetween('data_vencimento', [$dataMin, $dataMax])
                ->get();
            foreach ($rows as $r) {
                $candidatos[] = [
                    'tipo' => 'pagar', 'id' => $r->id_conta_pagar, 'descricao' => $r->descricao,
                    'valor' => (float) $r->valor_original, 'data_vencimento' => (string) $r->data_vencimento->toDateString(),
                    'score' => levenshtein(mb_substr($memo, 0, 200), mb_substr($r->descricao, 0, 200)),
                ];
            }
        } else {
            $rows = ContaReceber::where('ativo', true)->where('status', 'pendente')
                ->where('valor_original', $valor)
                ->whereBetween('data_vencimento', [$dataMin, $dataMax])
                ->get();
            foreach ($rows as $r) {
                $candidatos[] = [
                    'tipo' => 'receber', 'id' => $r->id_conta_receber, 'descricao' => $r->descricao,
                    'valor' => (float) $r->valor_original, 'data_vencimento' => (string) $r->data_vencimento->toDateString(),
                    'score' => levenshtein(mb_substr($memo, 0, 200), mb_substr($r->descricao, 0, 200)),
                ];
            }
        }

        usort($candidatos, fn ($a, $b) => $a['score'] <=> $b['score']);

        return $candidatos;
    }

    /** Aplica o match: baixa o AP/AR e marca a linha como conciliada. */
    public function aplicar(ExtratoBancarioLinha $linha, string $tipo, int $contaId): ExtratoBancarioLinha
    {
        if ($tipo === 'pagar') {
            $ap = ContaPagar::findOrFail($contaId);
            $ap->update([
                'status' => 'pago',
                'valor_pago' => $ap->valor_original,
                'data_pagamento' => $linha->data->toDateString(),
                'conta_bancaria_id' => $linha->conta_bancaria_id,
            ]);
            $linha->reconciliada_com_pagar_id = $ap->id_conta_pagar;
        } elseif ($tipo === 'receber') {
            $ar = ContaReceber::findOrFail($contaId);
            $ar->update([
                'status' => 'recebido',
                'valor_recebido' => $ar->valor_original,
                'data_recebimento' => $linha->data->toDateString(),
                'conta_bancaria_id' => $linha->conta_bancaria_id,
            ]);
            $linha->reconciliada_com_receber_id = $ar->id_conta_receber;
        } else {
            throw new ConciliacaoOfxException('Tipo de conciliação inválido.');
        }

        $linha->reconciliada_em = now();
        $linha->save();

        return $linha->refresh();
    }
}
