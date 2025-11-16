<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Venda;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RelatorioController extends Controller
{
    public function index()
    {
        $hoje = Carbon::today();
        $inicioDoMes = Carbon::now()->startOfMonth();
        $vendas_hoje_valor = Venda::whereDate('data_venda', $hoje)->sum('valor_total');

        $vendas_mes_valor = Venda::whereDate('data_venda', '>=', $inicioDoMes)->sum('valor_total');

        $vendas_hoje_numero = Venda::whereDate('data_venda', $hoje)->count();
        // 1. Busca os dados já agrupados por dia/mês do ano atual
        $salesByDay = Venda::select(
            DB::raw('MONTH(data_venda) as month'),
            DB::raw('DAY(data_venda) as day'),
            DB::raw('SUM(valor_total) as total')
        )
        ->whereYear('data_venda', Carbon::now()->year) // Apenas ano atual
        ->groupBy('month', 'day')
        ->get();

        // 2. Pré-popula os 12 meses com null (igual sua lógica)
        $vendas_ano_valor = collect(range(1, 12))->mapWithKeys(fn($m) => [$m => null])->all();

        // 3. Pré-popula os dias com 0 para os meses que tiveram vendas
        $mesesComVendas = $salesByDay->pluck('month')->unique();
        foreach ($mesesComVendas as $month) {
            $daysInMonth = Carbon::create()->month($month)->daysInMonth;
            $vendas_ano_valor[$month] = collect(range(1, $daysInMonth))
                ->mapWithKeys(fn($d) => [$d => 0])
                ->all();
        }

        // 4. Preenche o array com os totais
        foreach ($salesByDay as $sale) {
            $vendas_ano_valor[$sale->month][$sale->day] = $sale->total;
        }

        // Count all products where 'ativa' is true
        $produtosAtivos = \App\Models\Produto::where('ativo', true)->count();

        // Join produtos ativos com vendas, conta o número de vendas por produto e ordena do maior para o menor
        $produtosMaisVendidos = [];
        return inertia('Relatorio/Index', [
            'vendas_hoje_valor' => $vendas_hoje_valor,
            'vendas_mes_valor' => $vendas_mes_valor,
            'vendas_hoje_numero' => $vendas_hoje_numero,
            'vendas_ano_valor' => $vendas_ano_valor,
            'produtosAtivos' => $produtosAtivos,
            'produtosMaisVendidos' => $produtosMaisVendidos,
        ]);
    }
}