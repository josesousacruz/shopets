<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\ContaPagar;
use App\Models\ContaReceber;
use App\Models\Fornecedor;
use App\Models\Cliente;
use App\Models\Venda;

class FinanceiroController extends Controller
{
    public function index()
    {
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
                    'id' => $cliente->id_cliente,
                    'name' => $cliente->nome,
                    'email' => $cliente->email,
                    'phone' => $cliente->telefone
                ];
            });

        // Buscar vendas do banco (últimas 30 vendas)
        $sales = Venda::with('cliente')
            ->where('status', 'finalizada')
            ->orderBy('data_venda', 'desc')
            ->limit(30)
            ->get()
            ->map(function ($venda) {
                return [
                    'id' => $venda->id_venda,
                    'customerId' => $venda->id_cliente,
                    'total' => $venda->valor_total,
                    'created_at' => $venda->data_venda->format('Y-m-d'),
                    'payment_method' => $venda->tipo_venda
                ];
            });

        // Calcular estatísticas para contas a pagar
        $totalPendentePagar = ContaPagar::where('ativo', true)
            ->where('status', 'pendente')
            ->sum('valor_original');

        $totalVencidoPagar = ContaPagar::where('ativo', true)
            ->where('status', 'vencido')
            ->sum('valor_original');

        $totalPagoMesPagar = ContaPagar::where('ativo', true)
            ->where('status', 'pago')
            ->whereMonth('data_pagamento', now()->month)
            ->whereYear('data_pagamento', now()->year)
            ->sum('valor_pago');

        $quantidadeVencidasPagar = ContaPagar::where('ativo', true)
            ->where('status', 'vencido')
            ->count();

        // Calcular estatísticas para contas a receber
        $totalPendenteReceber = ContaReceber::where('ativo', true)
            ->where('status', 'pendente')
            ->sum('valor_original');

        $totalVencidoReceber = ContaReceber::where('ativo', true)
            ->where('status', 'vencido')
            ->sum('valor_original');

        $totalRecebidoMes = ContaReceber::where('ativo', true)
            ->where('status', 'recebido')
            ->whereMonth('data_recebimento', now()->month)
            ->whereYear('data_recebimento', now()->year)
            ->sum('valor_recebido');

        $quantidadeVencidasReceber = ContaReceber::where('ativo', true)
            ->where('status', 'vencido')
            ->count();

        // Vendas de hoje
        $vendasHoje = Venda::where('status', 'finalizada')
            ->whereDate('data_venda', today())
            ->sum('valor_total');

        return inertia('Financeiro/Index', [
            'accountsPayable' => $accountsPayable,
            'accountsReceivable' => $accountsReceivable,
            'suppliers' => $suppliers,
            'customers' => $customers,
            'sales' => $sales,
            'statistics' => [
                'totalPagar' => $totalPendentePagar + $totalVencidoPagar,
                'totalReceber' => $totalPendenteReceber + $totalVencidoReceber,
                'vendasHoje' => $vendasHoje,
                'contasVencidas' => $quantidadeVencidasPagar + $quantidadeVencidasReceber
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

    // Métodos para Contas a Pagar
    public function showPayable($id)
    {
        $conta = ContaPagar::with(['fornecedor', 'pontoVenda', 'user'])->findOrFail($id);
        
        return inertia('Financeiro/ContasPagar/Show', [
            'conta' => $conta
        ]);
    }

    public function editPayable($id)
    {
        $conta = ContaPagar::with(['fornecedor'])->findOrFail($id);
        $fornecedores = Fornecedor::where('ativo', true)->get();
        
        return inertia('Financeiro/ContasPagar/Edit', [
            'conta' => $conta,
            'fornecedores' => $fornecedores
        ]);
    }

    public function storePayable(Request $request)
    {
        $request->validate([
            'numero_documento' => 'nullable|string|max:50',
            'descricao' => 'required|string|max:200',
            'id_fornecedor' => 'nullable|exists:fornecedores,id_fornecedor',
            'valor_original' => 'required|numeric|min:0.01',
            'data_vencimento' => 'required|date',
            'categoria' => 'required|in:fornecedor,despesa_operacional,imposto,financiamento,outros',
            'tipo_documento' => 'required|in:nota_fiscal,boleto,duplicata,recibo,outros',
            'observacoes' => 'nullable|string'
        ]);

        ContaPagar::create([
            'numero_documento' => $request->numero_documento,
            'descricao' => $request->descricao,
            'id_fornecedor' => $request->id_fornecedor,
            'id_pdv' => 1, // Assumindo PDV padrão por enquanto
            'user_id' => auth()->id(),
            'valor_original' => $request->valor_original,
            'data_vencimento' => $request->data_vencimento,
            'categoria' => $request->categoria,
            'tipo_documento' => $request->tipo_documento,
            'observacoes' => $request->observacoes,
            'status' => 'pendente'
        ]);

        return back()->with('success', 'Conta a pagar criada com sucesso!');
    }

    public function updatePayable(Request $request, $id)
    {
        $conta = ContaPagar::findOrFail($id);
        
        $request->validate([
            'numero_documento' => 'nullable|string|max:50',
            'descricao' => 'required|string|max:200',
            'id_fornecedor' => 'nullable|exists:fornecedores,id_fornecedor',
            'valor_original' => 'required|numeric|min:0.01',
            'data_vencimento' => 'required|date',
            'categoria' => 'required|in:fornecedor,despesa_operacional,imposto,financiamento,outros',
            'tipo_documento' => 'required|in:nota_fiscal,boleto,duplicata,recibo,outros',
            'observacoes' => 'nullable|string'
        ]);

        $conta->update($request->only([
            'numero_documento', 'descricao', 'id_fornecedor', 'valor_original',
            'data_vencimento', 'categoria', 'tipo_documento', 'observacoes'
        ]));

        return back()->with('success', 'Conta a pagar atualizada com sucesso!');
    }

    public function destroyPayable($id)
    {
        $conta = ContaPagar::findOrFail($id);
        $conta->update(['ativo' => false]);

        return back()->with('success', 'Conta a pagar removida com sucesso!');
    }

    public function updatePayableStatus(Request $request, $id)
    {
        $conta = ContaPagar::findOrFail($id);
        
        $request->validate([
            'status' => 'required|in:pendente,pago,vencido,cancelado',
            'data_pagamento' => 'nullable|date',
            'valor_pago' => 'nullable|numeric|min:0'
        ]);

        $updateData = ['status' => $request->status];
        
        if ($request->status === 'pago') {
            $updateData['data_pagamento'] = $request->data_pagamento ?? now();
            $updateData['valor_pago'] = $request->valor_pago ?? $conta->valor_original;
        }

        $conta->update($updateData);

        return back()->with('success', 'Status da conta atualizado com sucesso!');
    }

    // Métodos para Contas a Receber
    public function showReceivable($id)
    {
        $conta = ContaReceber::with(['cliente', 'venda', 'pontoVenda', 'user'])->findOrFail($id);
        
        return inertia('Financeiro/ContasReceber/Show', [
            'conta' => $conta
        ]);
    }

    public function editReceivable($id)
    {
        $conta = ContaReceber::with(['cliente', 'venda'])->findOrFail($id);
        $clientes = Cliente::where('ativo', true)->get();
        
        return inertia('Financeiro/ContasReceber/Edit', [
            'conta' => $conta,
            'clientes' => $clientes
        ]);
    }

    public function storeReceivable(Request $request)
    {
        $request->validate([
            'numero_documento' => 'nullable|string|max:50',
            'descricao' => 'required|string|max:200',
            'id_cliente' => 'nullable|exists:clientes,id_cliente',
            'id_venda' => 'nullable|exists:vendas,id_venda',
            'valor_original' => 'required|numeric|min:0.01',
            'data_vencimento' => 'required|date',
            'categoria' => 'required|in:venda_prazo,servico,outros',
            'tipo_documento' => 'required|in:duplicata,promissoria,cheque,boleto,outros',
            'observacoes' => 'nullable|string'
        ]);

        ContaReceber::create([
            'numero_documento' => $request->numero_documento,
            'descricao' => $request->descricao,
            'id_cliente' => $request->id_cliente,
            'id_venda' => $request->id_venda,
            'id_pdv' => 1, // Assumindo PDV padrão por enquanto
            'user_id' => auth()->id(),
            'valor_original' => $request->valor_original,
            'data_vencimento' => $request->data_vencimento,
            'categoria' => $request->categoria,
            'tipo_documento' => $request->tipo_documento,
            'observacoes' => $request->observacoes,
            'status' => 'pendente'
        ]);

        return back()->with('success', 'Conta a receber criada com sucesso!');
    }

    public function updateReceivable(Request $request, $id)
    {
        $conta = ContaReceber::findOrFail($id);
        
        $request->validate([
            'numero_documento' => 'nullable|string|max:50',
            'descricao' => 'required|string|max:200',
            'id_cliente' => 'nullable|exists:clientes,id_cliente',
            'id_venda' => 'nullable|exists:vendas,id_venda',
            'valor_original' => 'required|numeric|min:0.01',
            'data_vencimento' => 'required|date',
            'categoria' => 'required|in:venda_prazo,servico,outros',
            'tipo_documento' => 'required|in:duplicata,promissoria,cheque,boleto,outros',
            'observacoes' => 'nullable|string'
        ]);

        $conta->update($request->only([
            'numero_documento', 'descricao', 'id_cliente', 'id_venda', 'valor_original',
            'data_vencimento', 'categoria', 'tipo_documento', 'observacoes'
        ]));

        return back()->with('success', 'Conta a receber atualizada com sucesso!');
    }

    public function destroyReceivable($id)
    {
        $conta = ContaReceber::findOrFail($id);
        $conta->update(['ativo' => false]);

        return back()->with('success', 'Conta a receber removida com sucesso!');
    }

    public function updateReceivableStatus(Request $request, $id)
    {
        $conta = ContaReceber::findOrFail($id);
        
        $request->validate([
            'status' => 'required|in:pendente,recebido,vencido,cancelado',
            'data_recebimento' => 'nullable|date',
            'valor_recebido' => 'nullable|numeric|min:0'
        ]);

        $updateData = ['status' => $request->status];
        
        if ($request->status === 'recebido') {
            $updateData['data_recebimento'] = $request->data_recebimento ?? now();
            $updateData['valor_recebido'] = $request->valor_recebido ?? $conta->valor_original;
        }

        $conta->update($updateData);

        return back()->with('success', 'Status da conta atualizado com sucesso!');
    }
}