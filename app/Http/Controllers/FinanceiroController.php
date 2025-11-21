<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\ContaPagar;
use App\Models\ContaReceber;
use App\Models\Fornecedor;
use App\Models\Cliente;
use App\Models\Venda;
use App\Models\FluxoCaixa;
use Carbon\Carbon;

class FinanceiroController extends Controller
{
    public function index()
    {
        // Atualizar status de contas vencidas antes das consultas
        $this->updateOverdueAccounts();
        
        // Buscar contas a pagar do banco
        $accountsPayable = ContaPagar::with('fornecedor')
            ->where('ativo', true)
            ->orderBy('data_vencimento', 'asc')
            ->get()
            ->map(function ($conta) {
                return [
                    'id_conta_pagar' => $conta->id_conta_pagar,
                    'id_fornecedor' => $conta->id_fornecedor,
                    'valor_original' => $conta->valor_original,
                    'data_vencimento' => $conta->data_vencimento->format('Y-m-d'),
                    'descricao' => $conta->descricao,
                    'status' => $conta->status,
                    'data_criacao' => $conta->created_at->format('Y-m-d'),
                    'data_pagamento' => $conta->data_pagamento ? $conta->data_pagamento->format('Y-m-d') : null,
                    'numero_documento' => $conta->numero_documento,
                    'categoria' => $conta->categoria,
                    'valor_pago' => $conta->valor_pago,
                    'observacoes' => $conta->observacoes,
                    'fornecedor' => $conta->fornecedor ? [
                        'id_fornecedor' => $conta->fornecedor->id_fornecedor,
                        'nome' => $conta->fornecedor->nome,
                        'contato_principal' => $conta->fornecedor->contato_principal,
                        'telefone' => $conta->fornecedor->telefone,
                        'email' => $conta->fornecedor->email
                    ] : null
                ];
            });

        // Buscar contas a receber do banco
        $accountsReceivable = ContaReceber::with('cliente')
            ->where('ativo', true)
            ->orderBy('data_vencimento', 'asc')
            ->get()
            ->map(function ($conta) {
                return [
                    'id_conta_receber' => $conta->id_conta_receber,
                    'id_cliente' => $conta->id_cliente,
                    'valor_original' => $conta->valor_original,
                    'data_vencimento' => $conta->data_vencimento->format('Y-m-d'),
                    'descricao' => $conta->descricao,
                    'status' => $conta->status,
                    'data_criacao' => $conta->created_at->format('Y-m-d'),
                    'data_recebimento' => $conta->data_recebimento ? $conta->data_recebimento->format('Y-m-d') : null,
                    'numero_documento' => $conta->numero_documento,
                    'categoria' => $conta->categoria,
                    'valor_recebido' => $conta->valor_recebido,
                    'observacoes' => $conta->observacoes,
                    'cliente' => $conta->cliente ? [
                        'id_cliente' => $conta->cliente->id_cliente,
                        'nome' => $conta->cliente->nome,
                        'telefone' => $conta->cliente->telefone,
                        'email' => $conta->cliente->email
                    ] : null
                ];
            });

        // Buscar fornecedores do banco
        $suppliers = Fornecedor::where('ativo', true)
            ->orderBy('nome')
            ->get()
            ->map(function ($fornecedor) {
                return [
                    'id_fornecedor' => $fornecedor->id_fornecedor,
                    'nome' => $fornecedor->nome,
                    'contato_principal' => $fornecedor->contato_principal,
                    'telefone' => $fornecedor->telefone,
                    'email' => $fornecedor->email
                ];
            });

        // Buscar clientes do banco
        $customers = Cliente::where('ativo', true)
            ->orderBy('nome')
            ->get()
            ->map(function ($cliente) {
                return [
                    'id_cliente' => $cliente->id_cliente,
                    'nome' => $cliente->nome,
                    'email' => $cliente->email,
                    'telefone' => $cliente->telefone
                ];
            });

        // Buscar vendas do banco (últimas 30 vendas)
        $sales = Venda::with('cliente')
            ->where('status', 'finalizada')
            ->orderBy('data_venda', 'desc')
            ->limit(30)
            ->get()
            ->map(function ($venda) {
                $pgs = \DB::table('pagamentos_venda')
                    ->join('formas_pagamento', 'pagamentos_venda.id_forma_pagamento', '=', 'formas_pagamento.id_forma_pagamento')
                    ->where('pagamentos_venda.id_venda', $venda->id_venda)
                    ->select('formas_pagamento.nome')
                    ->get();
                $formaNome = null;
                if ($pgs->count() === 1) { $formaNome = $pgs->first()->nome; }
                elseif ($pgs->count() > 1) { $formaNome = 'Múltiplos'; }
                return [
                    'id' => $venda->id_venda,
                    'customerId' => $venda->id_cliente,
                    'total' => $venda->valor_total,
                    'created_at' => $venda->data_venda->format('Y-m-d'),
                    'payment_method' => $formaNome
                ];
            });

        // Calcular estatísticas para contas a pagar (garantindo tipo float)
        $totalPendentePagar = (float) ContaPagar::where('ativo', true)
            ->where('status', 'pendente')
            ->sum('valor_original');

        $totalVencidoPagar = (float) ContaPagar::where('ativo', true)
            ->where('status', 'vencido')
            ->sum('valor_original');

        $totalPagoMesPagar = (float) ContaPagar::where('ativo', true)
            ->where('status', 'pago')
            ->whereMonth('data_pagamento', now()->month)
            ->whereYear('data_pagamento', now()->year)
            ->sum('valor_pago');

        $quantidadeVencidasPagar = ContaPagar::where('ativo', true)
            ->where('status', 'vencido')
            ->count();

        // Calcular estatísticas para contas a receber (garantindo tipo float)
        $totalPendenteReceber = (float) ContaReceber::where('ativo', true)
            ->where('status', 'pendente')
            ->sum('valor_original');

        $totalVencidoReceber = (float) ContaReceber::where('ativo', true)
            ->where('status', 'vencido')
            ->sum('valor_original');

        $totalRecebidoMes = (float) ContaReceber::where('ativo', true)
            ->where('status', 'recebido')
            ->whereMonth('data_recebimento', now()->month)
            ->whereYear('data_recebimento', now()->year)
            ->sum('valor_recebido');

        $quantidadeVencidasReceber = ContaReceber::where('ativo', true)
            ->where('status', 'vencido')
            ->count();

        // Vendas de hoje (garantindo tipo float)
        $vendasHoje = (float) Venda::where('status', 'finalizada')
            ->whereDate('data_venda', today())
            ->sum('valor_total');

        // Calcular totais recebidos e pagos (garantindo tipo float)
        $totalRecebido = (float) ContaReceber::where('ativo', true)
            ->where('status', 'recebido')
            ->sum('valor_recebido');

        $totalPago = (float) ContaPagar::where('ativo', true)
            ->where('status', 'pago')
            ->sum('valor_pago');

        // Buscar dados do fluxo de caixa
        $fluxoCaixaData = $this->getFluxoCaixaData();

        return inertia('Financeiro/Index', [
            'accountsPayable' => $accountsPayable,
            'accountsReceivable' => $accountsReceivable,
            'suppliers' => $suppliers,
            'customers' => $customers,
            'sales' => $sales,
            'fluxoCaixaData' => $fluxoCaixaData,
            'statistics' => [
                'totalReceivable' => $totalPendenteReceber + $totalVencidoReceber + $totalRecebido,
                'totalPayable' => $totalPendentePagar + $totalVencidoPagar + $totalPago,
                'totalReceived' => $totalRecebido + $vendasHoje,
                'totalPaid' => $totalPago,
                'pendingReceivable' => $totalPendenteReceber,
                'pendingPayable' => $totalPendentePagar,
                'overdueReceivable' => $totalVencidoReceber,
                'overduePayable' => $totalVencidoPagar,
                'cashFlow' => ($totalRecebido + $vendasHoje) - $totalPago,
                'projectedCashFlow' => $totalPendenteReceber - $totalPendentePagar
            ],
            'payableStatistics' => [
                'totalPendente' => $totalPendentePagar,
                'totalVencido' => $totalVencidoPagar,
                'totalPagoMes' => $totalPagoMesPagar,
                'quantidadeVencidas' => $quantidadeVencidasPagar
            ],
            'receivableStatistics' => [
                'totalPendente' => $totalPendenteReceber,
                'totalVencido' => $totalVencidoReceber,
                'totalRecebidoMes' => $totalRecebidoMes,
                'quantidadeVencidas' => $quantidadeVencidasReceber
            ]
        ]);
    }

    /**
     * Busca dados do fluxo de caixa dos últimos 30 dias
     */
    private function getFluxoCaixaData()
    {
        // Gera os últimos 30 dias incluindo hoje
        $last30Days = collect();
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->format('Y-m-d');
            $last30Days->push($date);
        }

        // Busca movimentações do fluxo de caixa dos últimos 30 dias
        $movimentacoes = FluxoCaixa::whereBetween('created_at', [
            Carbon::now()->subDays(29)->startOfDay(),
            Carbon::now()->endOfDay()
        ])
        ->selectRaw('DATE(created_at) as data, tipo_operacao, SUM(valor) as total')
        ->groupBy('data', 'tipo_operacao')
        ->get()
        ->groupBy('data');

        // Organiza os dados por dia
        $dailyData = $last30Days->map(function ($date) use ($movimentacoes) {
            $dayData = $movimentacoes->get($date, collect());
            
            $entradas = $dayData->where('tipo_operacao', 'entrada')->sum('total');
            $saidas = $dayData->where('tipo_operacao', 'saida')->sum('total');
            
            return [
                'date' => $date,
                'entradas' => (float) $entradas,
                'saidas' => (float) $saidas,
                'saldo' => (float) ($entradas - $saidas)
            ];
        });

        // Calcula estatísticas gerais
        $totalEntradas = FluxoCaixa::where('tipo_operacao', 'entrada')
            ->whereBetween('created_at', [
                Carbon::now()->subDays(29)->startOfDay(),
                Carbon::now()->endOfDay()
            ])
            ->sum('valor');

        $totalSaidas = FluxoCaixa::where('tipo_operacao', 'saida')
            ->whereBetween('created_at', [
                Carbon::now()->subDays(29)->startOfDay(),
                Carbon::now()->endOfDay()
            ])
            ->sum('valor');

        // Entradas e saídas de hoje
        $entradasHoje = FluxoCaixa::where('tipo_operacao', 'entrada')
            ->whereDate('created_at', Carbon::today())
            ->sum('valor');

        $saidasHoje = FluxoCaixa::where('tipo_operacao', 'saida')
            ->whereDate('created_at', Carbon::today())
            ->sum('valor');

        return [
            'dailyData' => $dailyData,
            'statistics' => [
                'totalEntradas' => (float) $totalEntradas,
                'totalSaidas' => (float) $totalSaidas,
                'saldoTotal' => (float) ($totalEntradas - $totalSaidas),
                'entradasHoje' => (float) $entradasHoje,
                'saidasHoje' => (float) $saidasHoje,
                'saldoHoje' => (float) ($entradasHoje - $saidasHoje)
            ]
        ];
    }

    /**
     * Atualiza automaticamente o status de contas vencidas
     * Deve ser chamado antes de consultas que dependem do status 'vencido'
     */
    private function updateOverdueAccounts()
    {
        $today = now()->toDateString();
        
        // Atualizar contas a pagar vencidas
        ContaPagar::where('ativo', true)
            ->where('status', 'pendente')
            ->where('data_vencimento', '<', $today)
            ->update(['status' => 'vencido']);
            
        // Atualizar contas a receber vencidas
        ContaReceber::where('ativo', true)
            ->where('status', 'pendente')
            ->where('data_vencimento', '<', $today)
            ->update(['status' => 'vencido']);
    }
}