<?php

namespace App\Observers;

use App\Models\ContaReceber;
use App\Models\Pedido;
use App\Models\PlanoConta;
use App\Models\PontoVenda;
use App\Models\User;

class PedidoObserver
{
    /**
     * Quando um pedido passa a "pago", gera automaticamente uma Conta a Receber
     * (já recebida) para alimentar Fluxo de Caixa / DRE. Idempotente.
     */
    public function updated(Pedido $pedido): void
    {
        if (! $pedido->wasChanged('status') || $pedido->status !== 'pago') {
            return;
        }

        $this->gerarContaReceber($pedido);
    }

    private function gerarContaReceber(Pedido $pedido): void
    {
        $marcador = 'Pedido #'.$pedido->id_pedido;

        // Idempotência: não duplicar se já gerada.
        if (ContaReceber::where('observacoes', $marcador)->exists()) {
            return;
        }

        // Precisa de um PDV (coluna obrigatória em contas_receber).
        $idPdv = $pedido->id_ponto_venda_retirada ?? PontoVenda::query()->value('id_pdv');
        if (! $idPdv) {
            return;
        }

        // contas_receber.user_id é obrigatório → usa um usuário do sistema.
        $userId = User::query()->value('id');
        if (! $userId) {
            return;
        }

        $planoId = PlanoConta::where('codigo', '1.1')->value('id'); // Vendas Online

        ContaReceber::create([
            'numero_documento' => $pedido->numero,
            'descricao' => 'Venda online '.$pedido->numero,
            'id_cliente' => $pedido->id_cliente,
            'id_venda' => $pedido->id_venda,
            'id_pdv' => $idPdv,
            'user_id' => $userId,
            'valor_original' => $pedido->total,
            'valor_recebido' => $pedido->total,
            'data_vencimento' => ($pedido->pago_em ?? now())->toDateString(),
            'data_recebimento' => ($pedido->pago_em ?? now())->toDateString(),
            'status' => 'recebido',
            'categoria' => 'outros',
            'plano_conta_id' => $planoId,
            'tipo_documento' => 'outros',
            'observacoes' => $marcador,
        ]);
    }
}
