<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CurvaAbcController extends Controller
{
    /**
     * GET /painel/relatorios/curva-abc?periodo_dias=90
     * Classifica produtos por contribuição acumulada no faturamento:
     *  - A: até 80% do total
     *  - B: entre 80% e 95%
     *  - C: acima de 95%
     */
    public function index(Request $request)
    {
        $dias = max(1, (int) $request->query('periodo_dias', 90));
        $de = now()->subDays($dias);

        $rows = DB::table('itens_venda as iv')
            ->join('produtos as p', 'p.id_produto', '=', 'iv.id_produto')
            ->where('iv.created_at', '>=', $de)
            ->groupBy('iv.id_produto', 'p.nome')
            ->select([
                'iv.id_produto as id_produto',
                'p.nome as produto',
                DB::raw('SUM(iv.quantidade) as qtd_total'),
                DB::raw('SUM(iv.valor_total_item) as receita_total'),
            ])
            ->orderByDesc('receita_total')
            ->get();

        $totalReceita = (float) $rows->sum('receita_total');
        $acumulado = 0.0;

        $classificados = $rows->map(function ($r) use (&$acumulado, $totalReceita) {
            $receita = (float) $r->receita_total;
            $acumulado += $receita;
            $percAcumulado = $totalReceita > 0 ? ($acumulado / $totalReceita) * 100 : 0;

            $classe = 'C';
            if ($percAcumulado <= 80) {
                $classe = 'A';
            } elseif ($percAcumulado <= 95) {
                $classe = 'B';
            }

            return [
                'id_produto' => (int) $r->id_produto,
                'produto' => $r->produto,
                'qtd_total' => (float) $r->qtd_total,
                'receita_total' => round($receita, 2),
                'perc' => $totalReceita > 0 ? round(($receita / $totalReceita) * 100, 2) : 0,
                'perc_acumulado' => round($percAcumulado, 2),
                'classe' => $classe,
            ];
        });

        return response()->json([
            'data' => $classificados,
            'meta' => [
                'periodo_dias' => $dias,
                'desde' => $de->toDateString(),
                'receita_total' => round($totalReceita, 2),
                'contagem_total' => $classificados->count(),
                'classes' => [
                    'A' => $classificados->where('classe', 'A')->count(),
                    'B' => $classificados->where('classe', 'B')->count(),
                    'C' => $classificados->where('classe', 'C')->count(),
                ],
            ],
        ]);
    }
}
