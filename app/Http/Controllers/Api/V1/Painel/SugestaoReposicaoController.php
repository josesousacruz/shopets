<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\EstoqueSaldo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SugestaoReposicaoController extends Controller
{
    /**
     * GET /painel/compras/sugestao-reposicao?fornecedor_id=
     * Lista SKUs abaixo do mínimo agrupados por fornecedor principal,
     * com qtd_sugerida = minimo*2 - saldo.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $saldos = EstoqueSaldo::query()
            ->with([
                'variacao:id_variacao,id_produto,sku,nome_variacao',
                'variacao.produto:id_produto,nome',
                'variacao.produto.fornecedores:id_fornecedor,nome',
            ])
            ->whereColumn('saldo', '<', 'minimo')
            ->where('minimo', '>', 0)
            ->get();

        $grupos = [];
        $fornecedorFiltro = $request->query('fornecedor_id');

        foreach ($saldos as $saldo) {
            $produto = $saldo->variacao?->produto;
            if (! $produto) {
                continue;
            }

            $fornecedor = $produto->fornecedores
                ->sortByDesc(fn ($f) => $f->pivot->fornecedor_principal ?? false)
                ->first();

            $fid = $fornecedor?->id_fornecedor ?? 0;
            $fnome = $fornecedor?->nome ?? 'Sem fornecedor';

            if ($fornecedorFiltro && (int) $fornecedorFiltro !== (int) $fid) {
                continue;
            }

            $grupos[$fid] ??= ['fornecedor_id' => $fid ?: null, 'fornecedor' => $fnome, 'itens' => []];
            $grupos[$fid]['itens'][] = [
                'produto_variacao_id' => $saldo->produto_variacao_id,
                'sku' => $saldo->variacao?->sku,
                'produto' => $produto->nome,
                'deposito_id' => $saldo->deposito_id,
                'saldo' => (int) $saldo->saldo,
                'minimo' => (int) $saldo->minimo,
                'qtd_sugerida' => max(1, ((int) $saldo->minimo * 2) - (int) $saldo->saldo),
                'custo_unit' => (float) $saldo->custo_medio,
            ];
        }

        return response()->json(['data' => array_values($grupos)]);
    }
}
