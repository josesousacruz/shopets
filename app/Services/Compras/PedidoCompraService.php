<?php

namespace App\Services\Compras;

use App\Models\ContaPagar;
use App\Models\EstoqueSaldo;
use App\Models\MovimentacaoEstoque;
use App\Models\PedidoCompra;
use App\Models\PedidoCompraItem;
use App\Models\PontoVenda;
use App\Models\ProdutoVariacao;
use App\Models\RecebimentoCompra;
use App\Models\RecebimentoCompraItem;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PedidoCompraInvalidoException extends RuntimeException {}

class PedidoCompraService
{
    /**
     * Cria um pedido de compra (rascunho) com seus itens e totais calculados.
     *
     * @param array{
     *   fornecedor_id:int, deposito_id:int, previsao_entrega?:string|null,
     *   frete?:float, desconto?:float, condicao_pagamento?:string|null,
     *   observacoes?:string|null, itens: array<int, array{produto_variacao_id:int, qtd:int, custo_unit:float}>
     * } $data
     */
    public function criar(array $data, int $userId): PedidoCompra
    {
        return DB::transaction(function () use ($data, $userId) {
            $po = PedidoCompra::create([
                'numero' => 'TMP',
                'id_empresa' => $data['id_empresa'] ?? null,
                'fornecedor_id' => $data['fornecedor_id'],
                'deposito_id' => $data['deposito_id'],
                'status' => 'rascunho',
                'previsao_entrega' => $data['previsao_entrega'] ?? null,
                'frete' => $data['frete'] ?? 0,
                'desconto' => $data['desconto'] ?? 0,
                'condicao_pagamento' => $data['condicao_pagamento'] ?? null,
                'observacoes' => $data['observacoes'] ?? null,
                'criado_por' => $userId,
            ]);

            $po->update(['numero' => 'PC-'.str_pad((string) $po->id, 6, '0', STR_PAD_LEFT)]);

            foreach ($data['itens'] as $item) {
                $this->criarItem($po, $item);
            }

            $this->recalcularTotais($po);

            return $po->refresh()->load('itens');
        });
    }

    /**
     * Substitui os itens de um pedido em rascunho.
     *
     * @param array<int, array{produto_variacao_id:int, qtd:int, custo_unit:float}> $itens
     */
    public function atualizar(PedidoCompra $po, array $data): PedidoCompra
    {
        if ($po->status !== 'rascunho') {
            throw new PedidoCompraInvalidoException('Só é possível editar pedidos em rascunho.');
        }

        return DB::transaction(function () use ($po, $data) {
            $po->update(array_filter([
                'fornecedor_id' => $data['fornecedor_id'] ?? null,
                'deposito_id' => $data['deposito_id'] ?? null,
                'previsao_entrega' => $data['previsao_entrega'] ?? null,
                'frete' => $data['frete'] ?? null,
                'desconto' => $data['desconto'] ?? null,
                'condicao_pagamento' => $data['condicao_pagamento'] ?? null,
                'observacoes' => $data['observacoes'] ?? null,
            ], fn ($v) => $v !== null));

            if (isset($data['itens'])) {
                $po->itens()->delete();
                foreach ($data['itens'] as $item) {
                    $this->criarItem($po, $item);
                }
            }

            $this->recalcularTotais($po);

            return $po->refresh()->load('itens');
        });
    }

    public function enviar(PedidoCompra $po): PedidoCompra
    {
        if ($po->status !== 'rascunho') {
            throw new PedidoCompraInvalidoException('Apenas rascunhos podem ser enviados.');
        }
        if ($po->itens()->count() === 0) {
            throw new PedidoCompraInvalidoException('Pedido sem itens não pode ser enviado.');
        }
        $po->update(['status' => 'enviado', 'enviado_em' => now()]);

        return $po->refresh();
    }

    /**
     * Recebe (parcial ou total) um pedido enviado.
     * Gera movimentações de entrada, atualiza saldos + custo médio ponderado,
     * e gera Conta(s) a Pagar proporcionais ao valor recebido.
     *
     * @param array{data?:string|null, nota_fiscal?:string|null, observacoes?:string|null,
     *   itens: array<int, array{item_id:int, qtd_recebida:int}>} $payload
     */
    public function receber(PedidoCompra $po, array $payload, int $userId): RecebimentoCompra
    {
        if (! in_array($po->status, ['enviado', 'parcialmente_recebido'], true)) {
            throw new PedidoCompraInvalidoException('Pedido não está num estado que permita recebimento.');
        }
        if (empty($payload['itens'])) {
            throw new PedidoCompraInvalidoException('Informe ao menos um item para receber.');
        }

        return DB::transaction(function () use ($po, $payload, $userId) {
            $data = $payload['data'] ?? now()->toDateString();

            $receb = RecebimentoCompra::create([
                'pedido_compra_id' => $po->id,
                'data' => $data,
                'nota_fiscal' => $payload['nota_fiscal'] ?? null,
                'observacoes' => $payload['observacoes'] ?? null,
                'recebido_por' => $userId,
            ]);

            $valorRecebido = 0.0;

            foreach ($payload['itens'] as $linha) {
                $qtd = (int) $linha['qtd_recebida'];
                if ($qtd <= 0) {
                    continue;
                }

                /** @var PedidoCompraItem $item */
                $item = $po->itens()->whereKey($linha['item_id'])->lockForUpdate()->firstOrFail();

                $pendente = $item->qtd - $item->qtd_recebida;
                if ($qtd > $pendente) {
                    throw new PedidoCompraInvalidoException(
                        "Quantidade recebida ({$qtd}) excede o pendente ({$pendente}) do item #{$item->id}."
                    );
                }

                RecebimentoCompraItem::create([
                    'recebimento_id' => $receb->id,
                    'item_id' => $item->id,
                    'qtd_recebida' => $qtd,
                ]);

                $item->increment('qtd_recebida', $qtd);

                $this->entrarEstoque($po, $item, $qtd, $userId);

                $valorRecebido += $qtd * (float) $item->custo_unit;
            }

            $this->atualizarStatusRecebimento($po);
            $this->gerarContasPagar($po, $receb, $valorRecebido, $userId);

            return $receb->refresh()->load('itens');
        });
    }

    public function cancelar(PedidoCompra $po): PedidoCompra
    {
        if (in_array($po->status, ['recebido', 'cancelado'], true)) {
            throw new PedidoCompraInvalidoException('Pedido não pode ser cancelado neste estado.');
        }
        $po->update(['status' => 'cancelado', 'cancelado_em' => now()]);

        return $po->refresh();
    }

    // ---- internos -------------------------------------------------------

    private function criarItem(PedidoCompra $po, array $item): PedidoCompraItem
    {
        $qtd = (int) $item['qtd'];
        $custo = (float) $item['custo_unit'];

        return $po->itens()->create([
            'produto_variacao_id' => $item['produto_variacao_id'],
            'qtd' => $qtd,
            'qtd_recebida' => 0,
            'custo_unit' => $custo,
            'total' => round($qtd * $custo, 2),
        ]);
    }

    private function recalcularTotais(PedidoCompra $po): void
    {
        $subtotal = (float) $po->itens()->sum('total');
        $total = $subtotal + (float) $po->frete - (float) $po->desconto;
        $po->update([
            'subtotal' => round($subtotal, 2),
            'total' => round(max(0, $total), 2),
        ]);
    }

    private function entrarEstoque(PedidoCompra $po, PedidoCompraItem $item, int $qtd, int $userId): void
    {
        $variacao = ProdutoVariacao::findOrFail($item->produto_variacao_id);

        $saldo = EstoqueSaldo::firstOrCreate(
            ['produto_variacao_id' => $item->produto_variacao_id, 'deposito_id' => $po->deposito_id],
            ['saldo' => 0, 'reservado' => 0, 'minimo' => 0, 'custo_medio' => 0],
        );

        $saldoAnterior = (int) $saldo->saldo;
        $custoAnterior = (float) $saldo->custo_medio;
        $custoUnit = (float) $item->custo_unit;

        $novoSaldo = $saldoAnterior + $qtd;
        $novoCusto = $novoSaldo > 0
            ? (($saldoAnterior * $custoAnterior) + ($qtd * $custoUnit)) / $novoSaldo
            : $custoUnit;

        $saldo->update([
            'saldo' => $novoSaldo,
            'custo_medio' => round($novoCusto, 4),
        ]);

        MovimentacaoEstoque::create([
            'deposito_id' => $po->deposito_id,
            'id_produto' => $variacao->id_produto,
            'id_produto_variacao' => $variacao->id_variacao,
            'id_usuario' => $userId,
            'tipo_movimentacao' => 'entrada',
            'origem_type' => 'pedido_compra',
            'origem_id' => $po->id,
            'quantidade' => $qtd,
            'valor_unitario' => round($custoUnit, 2),
            'observacoes' => 'Recebimento PO '.$po->numero,
            'data_movimentacao' => now(),
        ]);
    }

    private function atualizarStatusRecebimento(PedidoCompra $po): void
    {
        $po->load('itens');
        $totalPedido = $po->itens->sum('qtd');
        $totalRecebido = $po->itens->sum('qtd_recebida');

        $status = $totalRecebido >= $totalPedido ? 'recebido' : 'parcialmente_recebido';
        $po->update(['status' => $status]);
    }

    /**
     * Gera Conta(s) a Pagar proporcionais ao valor recebido, parcelando
     * conforme `condicao_pagamento` (ex.: "30/60/90" → 3 parcelas).
     */
    private function gerarContasPagar(PedidoCompra $po, RecebimentoCompra $receb, float $valor, int $userId): void
    {
        if ($valor <= 0) {
            return;
        }

        $idPdv = $po->deposito?->ponto_venda_id ?? PontoVenda::query()->value('id_pdv');
        if (! $idPdv) {
            throw new PedidoCompraInvalidoException(
                'Não há ponto de venda configurado para lançar a conta a pagar.'
            );
        }

        $dias = $this->parcelasDias($po->condicao_pagamento);
        $n = count($dias);
        $valorParcela = round($valor / $n, 2);

        foreach ($dias as $i => $offset) {
            // Ajuste de centavos na última parcela
            $vp = $i === $n - 1 ? round($valor - ($valorParcela * ($n - 1)), 2) : $valorParcela;

            ContaPagar::create([
                'numero_documento' => $receb->nota_fiscal,
                'descricao' => 'Compra '.$po->numero.($n > 1 ? ' ('.($i + 1)."/{$n})" : ''),
                'id_fornecedor' => $po->fornecedor_id,
                'id_pdv' => $idPdv,
                'user_id' => $userId,
                'valor_original' => $vp,
                'data_vencimento' => \Illuminate\Support\Carbon::parse($receb->data)->addDays($offset)->toDateString(),
                'status' => 'pendente',
                'categoria' => 'fornecedor',
                'tipo_documento' => 'nota_fiscal',
                'numero_parcela' => $i + 1,
                'total_parcelas' => $n,
                'observacoes' => 'Gerado automaticamente pelo recebimento #'.$receb->id,
            ]);
        }
    }

    /**
     * Converte "condicao_pagamento" em array de offsets de dias.
     * "30/60" → [30,60]; "à vista"/null → [prazo? 0]; "30" → [30].
     *
     * @return array<int,int>
     */
    private function parcelasDias(?string $condicao): array
    {
        if (! $condicao) {
            return [0];
        }
        $partes = array_values(array_filter(array_map('trim', explode('/', $condicao))));
        $dias = [];
        foreach ($partes as $p) {
            if (is_numeric($p)) {
                $dias[] = (int) $p;
            }
        }

        return $dias !== [] ? $dias : [0];
    }
}
