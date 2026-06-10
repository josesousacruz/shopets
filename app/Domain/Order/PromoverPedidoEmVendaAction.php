<?php

namespace App\Domain\Order;

use App\Models\FormaPagamento;
use App\Models\ItemVenda;
use App\Models\MovimentacaoEstoque;
use App\Models\PagamentoPedido;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\Venda;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Ponte fiscal: promove um pedido pago em uma Venda do PDV (origem ecommerce),
 * replicando o caminho oficial do PDVController::finalizarVenda.
 *
 * BAIXA DE ESTOQUE — decisão crítica para NÃO duplicar:
 *  No MySQL existe o trigger `tr_atualizar_estoque_venda_finalizada` (migration
 *  update_stock_triggers_to_finalized_sales) que dispara AFTER UPDATE em `vendas`
 *  na transição status != 'finalizada' -> 'finalizada', e nessa hora:
 *    (a) decrementa produtos.estoque_atual de cada item_venda, e
 *    (b) insere movimentacoes_estoque tipo 'venda'.
 *  Por isso aqui criamos a Venda como 'aberta', inserimos os itens, e SÓ ENTÃO
 *  fazemos o UPDATE para 'finalizada' — exatamente o caminho do PDV — deixando o
 *  trigger fazer a baixa física. NÃO escrevemos movimentacoes_estoque manualmente
 *  no MySQL (seria dupla contagem).
 *
 *  Em SQLite (suíte de testes) os triggers não existem (as migrations de trigger
 *  fazem early-return quando driver != mysql). Para que a baixa de estoque seja
 *  observável e correta, neste caso fazemos a baixa manual (decremento +
 *  movimentacoes_estoque) — equivalente ao que o trigger faria no MySQL. O guard
 *  por driver garante que cada unidade é decrementada exatamente uma vez.
 *
 * As reservas (soft-hold) são consumidas (consumida_em) independentemente do
 * mecanismo — o decremento físico é a "verdade" definitiva.
 *
 * Idempotente: no-op se pedido.id_venda já estiver setado.
 */
class PromoverPedidoEmVendaAction
{
    public function executar(Pedido $pedido): Venda
    {
        return DB::transaction(function () use ($pedido) {
            // Recarrega com lock para serializar promoções concorrentes do mesmo pedido.
            $pedido = Pedido::withoutGlobalScopes()
                ->where('id_pedido', $pedido->id_pedido)
                ->lockForUpdate()
                ->firstOrFail();

            // Idempotência: já promovido.
            if ($pedido->id_venda) {
                return Venda::findOrFail($pedido->id_venda);
            }

            $idUsuario = config('ecommerce.system_user_id');
            $idUsuario = $idUsuario instanceof \Closure ? $idUsuario() : $idUsuario;
            $idPdv = config('ecommerce.pdv_id');
            $idPdv = $idPdv instanceof \Closure ? $idPdv() : $idPdv;

            if (! $idUsuario || ! $idPdv) {
                throw new RuntimeException(
                    'Infra de ecommerce ausente (usuário-sistema/PDV). Rode o EcommerceInfraSeeder.'
                );
            }

            $pedido->load('itens', 'reservas');

            $subtotal = (float) $pedido->subtotal;
            $desconto = (float) $pedido->desconto;
            $total = (float) $pedido->total;

            // 1. Cria a Venda como 'aberta' (caminho oficial do PDV).
            //
            // id_cliente fica NULL de propósito: a venda do ecommerce é
            // pré-paga (Pix/cartão), não usa crediário. O trigger do PDV
            // tr_validar_limite_credito bloqueia QUALQUER venda com cliente
            // cujo (limite_credito - credito_utilizado) < total — e clientes
            // do ecommerce têm limite 0. O cliente fica preservado no Pedido
            // (registro voltado ao cliente); a Venda é o registro fiscal/estoque.
            // Followup: escopar o trigger a vendas fiado e então re-vincular o cliente.
            $venda = Venda::create([
                'numero_venda' => $this->gerarNumeroVenda(),
                'id_cliente' => null,
                'id_usuario' => $idUsuario,
                'id_pdv' => $idPdv,
                'valor_subtotal' => $subtotal,
                'valor_desconto' => $desconto,
                'valor_acrescimo' => (float) $pedido->frete,
                'valor_total' => $total,
                'status' => 'aberta',
                'observacoes' => "Pedido {$pedido->numero}",
            ]);

            // 2. itens_venda a partir de pedido_itens.
            foreach ($pedido->itens as $item) {
                $precoUnit = (float) $item->preco_unit;
                $quantidade = (float) $item->quantidade;

                ItemVenda::create([
                    'id_venda' => $venda->id_venda,
                    'id_produto' => $item->id_produto,
                    'quantidade' => $quantidade,
                    'preco_unitario' => $precoUnit,
                    'desconto_item' => 0,
                    'valor_total_item' => $precoUnit * $quantidade,
                ]);
            }

            // 3. pagamentos_venda a partir do(s) PagamentoPedido aprovado(s).
            $pagamentos = PagamentoPedido::where('id_pedido', $pedido->id_pedido)
                ->where('status', 'aprovado')
                ->get();

            foreach ($pagamentos as $pag) {
                $forma = $this->resolverFormaPagamento($pag->metodo);

                DB::table('pagamentos_venda')->insert([
                    'id_venda' => $venda->id_venda,
                    'id_forma_pagamento' => $forma->id_forma_pagamento,
                    'valor_pagamento' => (float) $pag->valor,
                    'numero_parcelas' => 1,
                    'valor_parcela' => (float) $pag->valor,
                    'numero_transacao' => $pag->gateway_id_externo,
                    'numero_autorizacao' => null,
                    'status_pagamento' => 'aprovado',
                    'data_pagamento' => now(),
                    'observacoes' => "Ecommerce gateway {$pag->gateway}",
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // 4. Finaliza a venda. No MySQL isto dispara o trigger que baixa o estoque
            //    e insere movimentacoes_estoque. Não duplicar.
            $venda->update(['status' => 'finalizada']);

            $ehMysql = DB::connection()->getDriverName() === 'mysql';

            // 4b. Em ambientes sem trigger (SQLite/testes), faz a baixa manual.
            if (! $ehMysql) {
                foreach ($venda->itens()->get() as $itemVenda) {
                    Produto::where('id_produto', $itemVenda->id_produto)
                        ->decrement('estoque_atual', (float) $itemVenda->quantidade);

                    MovimentacaoEstoque::create([
                        'id_produto' => $itemVenda->id_produto,
                        'id_usuario' => $idUsuario,
                        'id_item_venda' => $itemVenda->id_item,
                        'tipo_movimentacao' => 'venda',
                        'quantidade' => (float) $itemVenda->quantidade,
                        'valor_unitario' => (float) $itemVenda->preco_unitario,
                        'data_movimentacao' => now(),
                    ]);
                }
            }

            // 5. Consome as reservas (soft-hold) do pedido.
            $pedido->reservas()
                ->whereNull('consumida_em')
                ->update(['consumida_em' => now()]);

            // 6. Liga o pedido à venda.
            $pedido->update(['id_venda' => $venda->id_venda]);

            $pedido->eventos()->create([
                'tipo' => 'venda_gerada',
                'descricao' => "Venda #{$venda->numero_venda} gerada a partir do pedido.",
                'criado_em' => now(),
            ]);

            return $venda;
        });
    }

    private function resolverFormaPagamento(string $metodo): FormaPagamento
    {
        // Mapeia o método do pedido para o tipo da forma de pagamento do PDV.
        $tipo = match ($metodo) {
            'pix' => 'pix',
            'cartao_credito' => 'cartao_credito',
            'boleto' => 'outros',
            'dinheiro' => 'dinheiro',
            default => 'outros',
        };

        $forma = FormaPagamento::where('tipo', $tipo)->where('ativo', true)->first()
            ?? FormaPagamento::where('tipo', $tipo)->first();

        if (! $forma) {
            // Fallback: cria a forma mínima necessária (mantém o fluxo não-bloqueante).
            $forma = FormaPagamento::firstOrCreate(
                ['nome' => ucfirst($tipo)],
                ['tipo' => $tipo, 'ativo' => true]
            );
        }

        return $forma;
    }

    private function gerarNumeroVenda(): string
    {
        // Em MySQL o trigger tr_gerar_numero_venda sobrescreve o numero_venda em
        // BEFORE INSERT; ainda assim fornecemos um valor único (NOT NULL/unique).
        $ano = now()->year;
        $ultimo = Venda::where('numero_venda', 'like', $ano.'%')
            ->orderByDesc('numero_venda')
            ->value('numero_venda');

        $seq = $ultimo ? ((int) substr($ultimo, 4)) + 1 : 1;

        return $ano.str_pad((string) $seq, 6, '0', STR_PAD_LEFT);
    }
}
