<?php

namespace App\Domain\Order;

use App\Jobs\EmitirNotaFiscalJob;
use App\Mail\PagamentoConfirmado;
use App\Models\Pedido;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Marca o pedido como pago e dispara a cadeia pós-pagamento.
 *
 * Idempotente pelo estado do pedido: se já está pago ou já tem id_venda, é no-op.
 *  1. status = 'pago', pago_em = now, evento 'pagamento_confirmado'.
 *  2. Promove o pedido em Venda (baixa de estoque pelo caminho oficial do PDV).
 *  3. Dispara EmitirNotaFiscalJob (best-effort) + e-mail PagamentoConfirmado.
 */
class MarcarPedidoPagoAction
{
    public function __construct(
        private readonly PromoverPedidoEmVendaAction $promover,
    ) {
    }

    public function executar(Pedido $pedido): Pedido
    {
        $pedido = DB::transaction(function () use ($pedido) {
            $pedido = Pedido::withoutGlobalScopes()
                ->where('id_pedido', $pedido->id_pedido)
                ->lockForUpdate()
                ->firstOrFail();

            // Idempotência: já processado.
            if ($pedido->id_venda || in_array($pedido->status, ['pago', 'em_separacao', 'enviado', 'entregue'], true)) {
                return $pedido;
            }

            $pedido->update([
                'status' => 'pago',
                'pago_em' => now(),
            ]);

            $pedido->eventos()->create([
                'tipo' => 'pagamento_confirmado',
                'descricao' => 'Pagamento confirmado.',
                'criado_em' => now(),
            ]);

            // Promove em Venda dentro da mesma transação (atômico).
            $this->promover->executar($pedido);

            return $pedido->fresh();
        });

        // Efeitos colaterais best-effort após o commit (não bloqueiam o pagamento).
        EmitirNotaFiscalJob::dispatch($pedido->id_pedido);

        if ($pedido->cliente && $pedido->cliente->email) {
            Mail::to($pedido->cliente->email)->send(new PagamentoConfirmado($pedido));
        }

        return $pedido;
    }
}
