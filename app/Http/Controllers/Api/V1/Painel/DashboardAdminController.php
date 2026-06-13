<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Services\Relatorios\RelatorioBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardAdminController extends Controller
{
    private const PAGOS = ['pago', 'em_separacao', 'enviado', 'entregue'];

    public function __construct(private readonly RelatorioBuilder $builder)
    {
    }

    /** GET /painel/dashboard/serie-vendas?periodo=7d|30d|90d */
    public function serieVendas(Request $request): JsonResponse
    {
        [$de, $ate, $dias] = $this->periodo($request->query('periodo', '30d'));

        $linhas = $this->builder->dados('vendas-por-periodo', ['de' => $de, 'ate' => $ate])['linhas'];

        // Período anterior (mesma janela) para comparação.
        $deAnt = Carbon::parse($de)->subDays($dias)->toDateString();
        $totalAtual = array_sum(array_column($linhas, 'total'));
        $totalAnterior = (float) DB::table('pedidos')->whereIn('status', self::PAGOS)
            ->whereBetween('created_at', [$deAnt, $de])->sum('total');

        return response()->json([
            'data' => $linhas,
            'comparacao' => [
                'total_atual' => round($totalAtual, 2),
                'total_anterior' => round($totalAnterior, 2),
                'variacao_pct' => $totalAnterior > 0 ? round((($totalAtual - $totalAnterior) / $totalAnterior) * 100, 1) : null,
            ],
        ]);
    }

    public function topProdutos(Request $request): JsonResponse
    {
        [$de, $ate] = $this->periodo($request->query('periodo', '30d'));
        $linhas = $this->builder->dados('vendas-por-produto', ['de' => $de, 'ate' => $ate])['linhas'];

        return response()->json(['data' => array_slice($linhas, 0, 10)]);
    }

    public function topCategorias(Request $request): JsonResponse
    {
        [$de, $ate] = $this->periodo($request->query('periodo', '30d'));
        $linhas = $this->builder->dados('vendas-por-categoria', ['de' => $de, 'ate' => $ate])['linhas'];

        return response()->json(['data' => array_slice($linhas, 0, 10)]);
    }

    /** KPIs consolidados de vendas, estoque e financeiro. */
    public function kpis(Request $request): JsonResponse
    {
        [$de, $ate] = $this->periodo($request->query('periodo', '30d'));

        $vendas = DB::table('pedidos')->whereIn('status', self::PAGOS)
            ->whereBetween('created_at', [$de, $ate])
            ->selectRaw('COUNT(*) as q, COALESCE(SUM(total),0) as t')->first();

        $faturamento = (float) $vendas->t;
        $pedidos = (int) $vendas->q;

        $abaixoMinimo = DB::table('estoque_saldos')->whereColumn('saldo', '<', 'minimo')->where('minimo', '>', 0)->count();

        $aReceber = (float) DB::table('contas_receber')->where('ativo', true)->where('status', 'pendente')->sum('valor_original');
        $aPagar = (float) DB::table('contas_pagar')->where('ativo', true)->where('status', 'pendente')->sum('valor_original');

        return response()->json([
            'data' => [
                'faturamento' => round($faturamento, 2),
                'pedidos' => $pedidos,
                'ticket_medio' => $pedidos > 0 ? round($faturamento / $pedidos, 2) : 0,
                'estoque_abaixo_minimo' => $abaixoMinimo,
                'a_receber_pendente' => round($aReceber, 2),
                'a_pagar_pendente' => round($aPagar, 2),
            ],
        ]);
    }

    /** @return array{0:string,1:string,2:int} [de, ate, dias] */
    private function periodo(string $periodo): array
    {
        $dias = match ($periodo) {
            '7d' => 7,
            '90d' => 90,
            default => 30,
        };

        return [
            Carbon::now()->subDays($dias)->toDateString(),
            Carbon::now()->toDateString(),
            $dias,
        ];
    }
}
