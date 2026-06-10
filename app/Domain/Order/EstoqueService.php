<?php

namespace App\Domain\Order;

use App\Models\Produto;
use App\Models\ProdutoVariacao;
use App\Models\ReservaEstoque;

/**
 * Camada de disponibilidade ciente de reservas.
 *
 * estoque físico (estoque_atual) é a verdade do PDV; reservas são um soft-hold.
 * disponivel = estoque_atual − Σ(reservas ativas: consumida_em IS NULL AND expira_em > now()).
 */
class EstoqueService
{
    /**
     * Quantidade reservada ativa para o alvo (produto sem variação, ou variação).
     */
    public function reservado(Produto|ProdutoVariacao $alvo): float
    {
        $query = ReservaEstoque::query()->ativas();

        if ($alvo instanceof ProdutoVariacao) {
            $query->where('id_variacao', $alvo->id_variacao);
        } else {
            $query->where('id_produto', $alvo->id_produto)->whereNull('id_variacao');
        }

        return (float) $query->sum('quantidade');
    }

    /**
     * Estoque disponível para venda no ecommerce (físico − reservas ativas).
     */
    public function disponivel(Produto|ProdutoVariacao $alvo): float
    {
        $fisico = (float) $alvo->estoque_atual;

        return max(0.0, $fisico - $this->reservado($alvo));
    }
}
