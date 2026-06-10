<?php

namespace App\Domain\Order;

use App\Jobs\EmitirNotaFiscalJob;
use App\Models\PagamentoPedido;
use App\Models\Pedido;
use Illuminate\Support\Facades\DB;

/**
 * Finaliza a retirada presencial de um pedido no balcão (painel/PDV).
 *
 * Dois caminhos, conforme o pagamento_modo:
 *
 *  - na_retirada (não pago): registra um PagamentoPedido (gateway 'retirada_loja',
 *    aprovado) com a forma escolhida no balcão e promove o pedido em Venda via
 *    PromoverPedidoEmVendaAction — que cria Venda + itens + pagamentos_venda,
 *    consome a reserva e baixa o estoque pelo caminho oficial do PDV. Em seguida
 *    dispara a NFC-e (EmitirNotaFiscalJob roteia retirada -> NFC-e).
 *
 *  - online (já pago): a Venda/estoque/NFCe já foram processados no pagamento;
 *    aqui só confirmamos a entrega (status entregue) e garantimos a NFC-e.
 *
 * Idempotente: no-op se o pedido já está 'entregue'.
 */
class FinalizarRetiradaAction
{
    public function __construct(
        private readonly PromoverPedidoEmVendaAction $promover,
    ) {
    }

    public function executar(Pedido $pedido, ?string $formaPagamento = null, ?int $userId = null): Pedido
    {
        $pedido = DB::transaction(function () use ($pedido, $formaPagamento) {
            $pedido = Pedido::withoutGlobalScopes()
                ->where('id_pedido', $pedido->id_pedido)
                ->lockForUpdate()
                ->firstOrFail();

            // Idempotência.
            if ($pedido->status === 'entregue') {
                return $pedido;
            }

            // Caminho "paga no balcão": registra o pagamento e promove em Venda.
            if ($pedido->pagamento_modo === 'na_retirada' && ! $pedido->id_venda) {
                $metodo = $this->normalizarMetodo($formaPagamento);

                PagamentoPedido::create([
                    'id_pedido' => $pedido->id_pedido,
                    'gateway' => 'retirada_loja',
                    'gateway_id_externo' => 'balcao_'.strtolower(str_replace('-', '', $pedido->numero)),
                    'metodo' => $metodo,
                    'status' => 'aprovado',
                    'valor' => (float) $pedido->total,
                    'processado_em' => now(),
                ]);

                $this->promover->executar($pedido);

                $pedido->refresh();
            }

            return $pedido;
        });

        // Emissão fiscal best-effort (pode mover o pedido para revisão fiscal em
        // caso de falha) — disparada ANTES de marcar a entrega, para que o estado
        // de retirada efetiva seja sempre a "verdade" final.
        if ($pedido->id_venda) {
            EmitirNotaFiscalJob::dispatch($pedido->id_pedido);
        }

        // Confirma a entrega (retirada efetiva) como estado final autoritativo.
        $pedido = Pedido::withoutGlobalScopes()->findOrFail($pedido->id_pedido);
        $pedido->update([
            'status' => 'entregue',
            'entregue_em' => $pedido->entregue_em ?? now(),
        ]);

        $pedido->eventos()->create([
            'tipo' => 'entregue',
            'descricao' => 'Pedido retirado na loja.',
            'criado_por_user_id' => $userId,
            'criado_em' => now(),
        ]);

        return $pedido->fresh();
    }

    private function normalizarMetodo(?string $forma): string
    {
        return match ($forma) {
            'pix' => 'pix',
            'cartao_credito', 'cartao' => 'cartao_credito',
            'dinheiro' => 'dinheiro',
            default => 'dinheiro',
        };
    }
}
