<?php

namespace App\Services\Estoque;

use App\Models\EstoqueSaldo;
use App\Models\Inventario;
use App\Models\InventarioContagem;
use App\Models\MovimentacaoEstoque;
use App\Models\ProdutoVariacao;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class InventarioFinalizadoException extends RuntimeException {}

class InventarioService
{
    /**
     * Abre um inventário para um depósito.
     * Cria snapshot dos saldos atuais como linhas de contagem (saldo_sistema).
     */
    public function abrir(int $depositoId, int $userId, ?string $observacoes = null): Inventario
    {
        return DB::transaction(function () use ($depositoId, $userId, $observacoes) {
            $inv = Inventario::create([
                'deposito_id' => $depositoId,
                'aberto_por' => $userId,
                'aberto_em' => now(),
                'status' => 'aberto',
                'observacoes' => $observacoes,
            ]);

            $saldos = EstoqueSaldo::where('deposito_id', $depositoId)->get();
            foreach ($saldos as $s) {
                InventarioContagem::create([
                    'inventario_id' => $inv->id,
                    'produto_variacao_id' => $s->produto_variacao_id,
                    'saldo_sistema' => $s->saldo,
                ]);
            }

            return $inv->refresh();
        });
    }

    /**
     * Registra (ou atualiza) a contagem para uma variação no inventário.
     */
    public function registrarContagem(int $inventarioId, int $variacaoId, int $saldoContado, ?string $observacoes = null): InventarioContagem
    {
        $inv = Inventario::findOrFail($inventarioId);
        if (in_array($inv->status, ['concluido', 'cancelado'], true)) {
            throw new InventarioFinalizadoException('Inventário não está aberto para contagem.');
        }

        $row = InventarioContagem::where('inventario_id', $inv->id)
            ->where('produto_variacao_id', $variacaoId)
            ->firstOrFail();

        $row->saldo_contado = $saldoContado;
        $row->diferenca = $saldoContado - $row->saldo_sistema;
        if ($observacoes !== null) {
            $row->observacoes = $observacoes;
        }
        $row->save();

        if ($inv->status === 'aberto') {
            $inv->update(['status' => 'contando']);
        }

        return $row->refresh();
    }

    /**
     * Conclui o inventário gerando movimentações de ajuste para cada divergência.
     */
    public function concluir(int $inventarioId, int $userId): Inventario
    {
        return DB::transaction(function () use ($inventarioId, $userId) {
            $inv = Inventario::lockForUpdate()->findOrFail($inventarioId);
            if (in_array($inv->status, ['concluido', 'cancelado'], true)) {
                throw new InventarioFinalizadoException('Inventário já finalizado.');
            }

            $contagens = InventarioContagem::where('inventario_id', $inv->id)
                ->whereNotNull('saldo_contado')
                ->where('diferenca', '!=', 0)
                ->get();

            foreach ($contagens as $c) {
                /** @var ProdutoVariacao|null $variacao */
                $variacao = ProdutoVariacao::find($c->produto_variacao_id);
                if (! $variacao) continue;

                $saldo = EstoqueSaldo::where('produto_variacao_id', $c->produto_variacao_id)
                    ->where('deposito_id', $inv->deposito_id)
                    ->lockForUpdate()
                    ->first();
                if (! $saldo) continue;

                $saldo->update(['saldo' => $saldo->saldo + $c->diferenca]);

                MovimentacaoEstoque::create([
                    'deposito_id' => $inv->deposito_id,
                    'id_produto' => $variacao->id_produto,
                    'id_produto_variacao' => $variacao->id_variacao,
                    'id_usuario' => $userId,
                    'tipo_movimentacao' => 'ajuste',
                    'origem_type' => 'inventario',
                    'origem_id' => $inv->id,
                    'quantidade' => abs($c->diferenca),
                    'observacoes' => 'Ajuste por inventário #'.$inv->id,
                    'data_movimentacao' => now(),
                ]);
            }

            $inv->update([
                'status' => 'concluido',
                'finalizado_em' => now(),
            ]);

            return $inv->refresh();
        });
    }

    public function cancelar(int $inventarioId): Inventario
    {
        $inv = Inventario::findOrFail($inventarioId);
        if ($inv->status === 'concluido') {
            throw new InventarioFinalizadoException('Inventário já concluído não pode ser cancelado.');
        }
        $inv->update(['status' => 'cancelado', 'finalizado_em' => now()]);
        return $inv->refresh();
    }
}
