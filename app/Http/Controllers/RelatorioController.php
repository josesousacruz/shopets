<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Venda;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class RelatorioController extends Controller
{
    public function index(Request $request)
    {
        $startParam = $request->get('start');
        $endParam = $request->get('end');
        $startDate = $startParam ? Carbon::parse($startParam)->startOfDay() : Carbon::now()->subDays(29)->startOfDay();
        $endDate = $endParam ? Carbon::parse($endParam)->endOfDay() : Carbon::now()->endOfDay();
    
        // 1. Busca os dados já agrupados por dia/mês do ano atual
        $salesByDay = Venda::select(
            DB::raw('MONTH(data_venda) as month'),
            DB::raw('DAY(data_venda) as day'),
            DB::raw('SUM(valor_total) as total')
        )
        ->whereYear('data_venda', Carbon::now()->year) // Apenas ano atual
        ->where('status', 'finalizada')
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
        // Top-selling products: name, total value sold, total quantity sold
        $produtosMaisVendidos = \App\Models\ItemVenda::select(
                'produtos.nome',
                DB::raw('SUM(itens_venda.valor_total_item) as valor_total_itens_vendido'),
                DB::raw('SUM(itens_venda.quantidade) as total_itens_vendido')
            )
            ->join('vendas', 'vendas.id_venda', '=', 'itens_venda.id_venda')
            ->join('produtos', 'produtos.id_produto', '=', 'itens_venda.id_produto')
            ->where('vendas.status', 'finalizada')
            ->whereBetween('vendas.data_venda', [$startDate, $endDate])
            ->groupBy('produtos.id_produto', 'produtos.nome')
            ->orderByDesc('valor_total_itens_vendido')
            ->get();

        // Top-selling categories: name, total value sold, total quantity sold
        $categoriasMaisVendidas = \App\Models\ItemVenda::select(
                'categorias.nome',
                DB::raw('SUM(itens_venda.valor_total_item) as valor_total_itens_vendido'),
                DB::raw('SUM(itens_venda.quantidade) as total_itens_vendido')
            )
            ->join('vendas', 'vendas.id_venda', '=', 'itens_venda.id_venda')
            ->join('produtos', 'produtos.id_produto', '=', 'itens_venda.id_produto')
            ->join('categorias', 'categorias.id_categoria', '=', 'produtos.id_categoria')
            ->where('vendas.status', 'finalizada')
            ->whereBetween('vendas.data_venda', [$startDate, $endDate])
            ->groupBy('categorias.id_categoria', 'categorias.nome')
            ->orderByDesc('valor_total_itens_vendido')
            ->get();

        $formasPagamentoMix = \DB::table('pagamentos_venda')
            ->join('vendas', 'pagamentos_venda.id_venda', '=', 'vendas.id_venda')
            ->join('formas_pagamento', 'pagamentos_venda.id_forma_pagamento', '=', 'formas_pagamento.id_forma_pagamento')
            ->where('vendas.status', 'finalizada')
            ->whereBetween('pagamentos_venda.data_pagamento', [$startDate, $endDate])
            ->select('formas_pagamento.nome', \DB::raw('COUNT(DISTINCT vendas.id_venda) as vendas'), \DB::raw('SUM(pagamentos_venda.valor_pagamento) as total'))
            ->groupBy('formas_pagamento.id_forma_pagamento', 'formas_pagamento.nome')
            ->orderByDesc('total')
            ->get();

        $totalVendasFinalizadas = (int) \App\Models\Venda::where('status', 'finalizada')->count();
        $parceladasCount = (int) \DB::table('pagamentos_venda')
            ->join('vendas', 'pagamentos_venda.id_venda', '=', 'vendas.id_venda')
            ->where('vendas.status', 'finalizada')
            ->whereBetween('pagamentos_venda.data_pagamento', [$startDate, $endDate])
            ->where('pagamentos_venda.numero_parcelas', '>', 1)
            ->distinct('vendas.id_venda')
            ->count('vendas.id_venda');
        $percentualParceladas = $totalVendasFinalizadas > 0 ? round(($parceladasCount / $totalVendasFinalizadas) * 100, 2) : 0.0;

        $statusPagamentos = \DB::table('pagamentos_venda')
            ->whereBetween('data_pagamento', [$startDate, $endDate])
            ->select('status_pagamento', \DB::raw('COUNT(*) as qtd'), \DB::raw('SUM(valor_pagamento) as total'))
            ->groupBy('status_pagamento')
            ->get();

        $fluxoEntradas30 = \DB::table('fluxo_caixa')
            ->where('tipo_operacao', 'entrada')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('valor');
        $fluxoSaidas30 = \DB::table('fluxo_caixa')
            ->where('tipo_operacao', 'saida')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('valor');

        // Totais no intervalo selecionado
        $totalLiquidoIntervalo = (float) Venda::where('status','finalizada')
            ->whereBetween('data_venda', [$startDate, $endDate])
            ->sum('valor_total');

        $vendasCountIntervalo = (int) Venda::where('status','finalizada')
            ->whereBetween('data_venda', [$startDate, $endDate])
            ->count();

        $totalBrutoIntervalo = (float) Venda::where('status', 'finalizada')
            ->whereBetween('data_venda', [$startDate, $endDate])
            ->sum('valor_subtotal');

        $totalDescontoIntervalo = (float) Venda::where('status', 'finalizada')
            ->whereBetween('data_venda', [$startDate, $endDate])
            ->sum('valor_desconto');

        $contasResumo = [
            'pagar' => [
                'pendente' => (float) \App\Models\ContaPagar::where('ativo', true)->where('status', 'pendente')->sum('valor_original'),
                'vencido' => (float) \App\Models\ContaPagar::where('ativo', true)->where('status', 'vencido')->sum('valor_original'),
                'pago' => (float) \App\Models\ContaPagar::where('ativo', true)->where('status', 'pago')->sum('valor_pago'),
            ],
            'receber' => [
                'pendente' => (float) \App\Models\ContaReceber::where('ativo', true)->where('status', 'pendente')->sum('valor_original'),
                'vencido' => (float) \App\Models\ContaReceber::where('ativo', true)->where('status', 'vencido')->sum('valor_original'),
                'recebido' => (float) \App\Models\ContaReceber::where('ativo', true)->where('status', 'recebido')->sum('valor_recebido'),
            ],
        ];

        $sales = Venda::with(['itens.produto'])
            ->where('status', 'finalizada')
            ->whereBetween('data_venda', [$startDate, $endDate])
            ->orderBy('data_venda', 'desc')
            ->get()
            ->map(function ($venda) {
                return [
                    'id' => $venda->id_venda,
                    'numero' => $venda->numero_venda,
                    'date' => optional($venda->data_venda)->toDateTimeString(),
                    'total' => (float) $venda->valor_total,
                    'items' => $venda->itens->map(function ($item) {
                        return [
                            'product' => [
                                'id' => $item->produto->id_produto ?? null,
                                'name' => $item->produto->nome ?? null,
                                'price' => (float) ($item->preco_unitario ?? 0),
                                'salePrice' => (float) ($item->preco_unitario ?? 0),
                            ],
                            'quantity' => (float) $item->quantidade,
                            'desconto_item' => (float) ($item->desconto_item ?? 0),
                            'valor_total_item' => (float) ($item->valor_total_item ?? 0),
                        ];
                    }),
                ];
            });

        $products = \App\Models\Produto::where('ativo', true)->get();

        return inertia('Relatorio/Index', [
            'sales' => $sales,
            'vendas_ano_valor' => $vendas_ano_valor,
            'produtosMaisVendidos' => $produtosMaisVendidos,
            'categoriasMaisVendidas' => $categoriasMaisVendidas,
            'formasPagamentoMix' => $formasPagamentoMix,
            'percentualParceladas' => $percentualParceladas,
            'statusPagamentos' => $statusPagamentos,
            'contasResumo' => $contasResumo,
            'totalLiquidoIntervalo' => (float) $totalLiquidoIntervalo,
            'vendasCountIntervalo' => (int) $vendasCountIntervalo,
            'totalBrutoIntervalo' => (float) $totalBrutoIntervalo,
            'totalDescontoIntervalo' => (float) $totalDescontoIntervalo,
            'products' => $products,
            'isLoading' => false,
        ]);
    }

    public function fechamentoDia(Request $request)
    {
        $dateParam = $request->get('date');
        $date = $dateParam ? Carbon::parse($dateParam)->startOfDay() : Carbon::today()->startOfDay();

        $vendas = Venda::with(['itens.produto'])
            ->where('status', 'finalizada')
            ->whereDate('data_venda', $date)
            ->orderBy('data_venda')
            ->get();

        $produtos = [];
        $totalItens = 0;
        $totalLiquido = 0.0;
        foreach ($vendas as $venda) {
            foreach ($venda->itens as $item) {
                $nome = $item->produto->nome ?? ('ID ' . ($item->produto->id_produto ?? ''));
                $bruto = (float) $item->preco_unitario * (int) $item->quantidade;
                $desconto = (float) ($item->desconto_item ?? 0);
                $liquido = max(0.0, $bruto - $desconto);
                $totalItens += (int) $item->quantidade;
                $totalLiquido += $liquido;
                if (!isset($produtos[$nome])) {
                    $produtos[$nome] = ['quantidade' => 0, 'bruto' => 0.0, 'desconto' => 0.0, 'liquido' => 0.0];
                }
                $produtos[$nome]['quantidade'] += (int) $item->quantidade;
                $produtos[$nome]['bruto'] += $bruto;
                $produtos[$nome]['desconto'] += $desconto;
                $produtos[$nome]['liquido'] += $liquido;
            }
        }

        $formas = DB::table('pagamentos_venda')
            ->join('formas_pagamento', 'pagamentos_venda.id_forma_pagamento', '=', 'formas_pagamento.id_forma_pagamento')
            ->join('vendas', 'pagamentos_venda.id_venda', '=', 'vendas.id_venda')
            ->whereDate('vendas.data_venda', $date)
            ->where('vendas.status', 'finalizada')
            ->select('formas_pagamento.nome', DB::raw('SUM(pagamentos_venda.valor_pagamento) as total'))
            ->groupBy('formas_pagamento.id_forma_pagamento', 'formas_pagamento.nome')
            ->get();

        $data = [
            'data' => $date->toDateString(),
            'produtos' => $produtos,
            'total_itens' => $totalItens,
            'total_liquido' => $totalLiquido,
            'formas' => $formas,
        ];

        $pdf = Pdf::loadView('relatorios.fechamento-dia', $data)->setPaper('a4');
        return $pdf->download('fechamento_' . $date->format('Y-m-d') . '.pdf');
    }
}