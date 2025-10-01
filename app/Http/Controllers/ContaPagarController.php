<?php

namespace App\Http\Controllers;

use App\Models\ContaPagar;
use App\Models\Fornecedor;
use App\Models\PontoVenda;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Carbon\Carbon;

class ContaPagarController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Atualizar status de contas vencidas antes das consultas
        $this->updateOverdueAccounts();
        
        $query = ContaPagar::with(['fornecedor', 'pontoVenda', 'usuario'])
            ->where('ativo', true);

        // Filtros
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('fornecedor_id')) {
            $query->where('id_fornecedor', $request->fornecedor_id);
        }

        if ($request->filled('data_inicio') && $request->filled('data_fim')) {
            $query->whereBetween('data_vencimento', [
                $request->data_inicio,
                $request->data_fim
            ]);
        }

        if ($request->filled('vencidas')) {
            $query->vencidas();
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('numero_documento', 'like', "%{$search}%")
                  ->orWhere('descricao', 'like', "%{$search}%")
                  ->orWhereHas('fornecedor', function($subQ) use ($search) {
                      $subQ->where('nome', 'like', "%{$search}%");
                  });
            });
        }

        $contas = $query->orderBy('data_vencimento', 'asc')
                       ->paginate(15)
                       ->withQueryString();

        // Estatísticas
        $estatisticas = [
            'total_pendente' => ContaPagar::where('status', 'pendente')->sum('valor_original'),
            'total_vencido' => ContaPagar::vencidas()->sum('valor_original'),
            'total_pago_mes' => ContaPagar::where('status', 'pago')
                ->whereMonth('data_pagamento', now()->month)
                ->sum('valor_pago'),
            'quantidade_vencidas' => ContaPagar::vencidas()->count()
        ];

        return Inertia::render('Financeiro/ContasPagar/Index', [
            'contas' => $contas,
            'estatisticas' => $estatisticas,
            'fornecedores' => Fornecedor::where('ativo', true)->get(['id_fornecedor', 'nome']),
            'filtros' => $request->only(['status', 'fornecedor_id', 'data_inicio', 'data_fim', 'search'])
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Financeiro/ContasPagar/Create', [
            'fornecedores' => Fornecedor::where('ativo', true)->get(['id_fornecedor', 'nome']),
            'pontosVenda' => PontoVenda::where('ativo', true)->get(['id_pdv', 'nome'])
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'descricao' => 'required|string|max:255',
            'id_fornecedor' => 'nullable|exists:fornecedores,id_fornecedor',
            'id_pdv' => 'required|exists:pontos_venda,id_pdv',
            'valor_original' => 'required|numeric|min:0.01',
            'data_vencimento' => 'required|date',
            'observacoes' => 'nullable|string|max:500',
            'total_parcelas' => 'nullable|integer|min:1|max:999'
        ]);

        DB::beginTransaction();
        try {
            $validated['user_id'] = Auth::id();
            $validated['status'] = 'pendente';
            $validated['ativo'] = true;

            // Se tem parcelas, criar múltiplas contas
            if ($validated['total_parcelas'] > 1) {
                $valorParcela = $validated['valor_original'] / $validated['total_parcelas'];
                $dataVencimento = Carbon::parse($validated['data_vencimento']);

                for ($i = 1; $i <= $validated['total_parcelas']; $i++) {
                    $dadosParcela = $validated;
                    $dadosParcela['numero_parcela'] = $i;
                    $dadosParcela['valor_original'] = $valorParcela;
                    $dadosParcela['data_vencimento'] = $dataVencimento->copy()->addMonths($i - 1)->toDateString();
                    
                    if ($i > 1) {
                        $dadosParcela['id_conta_origem'] = $contaPrincipal->id_conta_pagar ?? null;
                    }

                    $conta = ContaPagar::create($dadosParcela);
                    
                    if ($i === 1) {
                        $contaPrincipal = $conta;
                    }
                }
            } else {
                $validated['numero_parcela'] = 1;
                $validated['total_parcelas'] = 1;
                ContaPagar::create($validated);
            }

            DB::commit();

            return redirect()->route('financeiro.index')
                           ->with('success', 'Conta a pagar criada com sucesso!');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Erro ao criar conta a pagar: ' . $e->getMessage()]);
        }
    }



    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ContaPagar $contaPagar)
    {
        // Não permite editar contas já pagas
        if ($contaPagar->status === 'pago') {
            return back()->withErrors(['error' => 'Não é possível editar uma conta já paga.']);
        }

        $validated = $request->validate([
            'numero_documento' => 'nullable|string|max:50',
            'descricao' => 'required|string|max:255',
            'id_fornecedor' => 'exists:fornecedores,id_fornecedor',
            'valor_original' => 'required|numeric|min:0.01',
            'data_vencimento' => 'required|date',
            'observacoes' => 'nullable|string|max:500'
        ]);

        $contaPagar->update($validated);

        return redirect()->route('financeiro.index')
                       ->with('success', 'Conta a pagar atualizada com sucesso!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ContaPagar $contaPagar)
    {
        // Não permite excluir contas já pagas
        if ($contaPagar->status === 'pago') {
            return back()->withErrors(['error' => 'Não é possível excluir uma conta já paga.']);
        }

        $contaPagar->update(['ativo' => false]);

        return redirect()->route('financeiro.index')
                       ->with('success', 'Conta a pagar removida com sucesso!');
    }

    /**
     * Marcar conta como paga
     */
    public function pagar(Request $request, ContaPagar $contaPagar)
    {
        $validated = $request->validate([
            'valor_pago' => 'required|numeric|min:0.01',
            'data_pagamento' => 'required|date',
            'valor_desconto' => 'nullable|numeric|min:0',
            'valor_juros' => 'nullable|numeric|min:0',
            'valor_multa' => 'nullable|numeric|min:0',
            'observacoes' => 'nullable|string|max:500'
        ]);

        DB::beginTransaction();
        try {
            $contaPagar->update([
                'status' => 'pago',
                'valor_pago' => $validated['valor_pago'],
                'data_pagamento' => $validated['data_pagamento'],
                'valor_desconto' => $validated['valor_desconto'] ?? 0,
                'valor_juros' => $validated['valor_juros'] ?? 0,
                'valor_multa' => $validated['valor_multa'] ?? 0,
                'observacoes' => $validated['observacoes']
            ]);

            DB::commit();

            return redirect()->route('financeiro.index')
                           ->with('success', 'Pagamento registrado com sucesso!');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Erro ao registrar pagamento: ' . $e->getMessage()]);
        }
    }

    /**
     * Cancelar conta
     */
    public function cancelar(ContaPagar $contaPagar)
    {
        if ($contaPagar->status === 'pago') {
            return back()->withErrors(['error' => 'Não é possível cancelar uma conta já paga.']);
        }

        $contaPagar->cancelar();

        return redirect()->route('financeiro.index')
                       ->with('success', 'Conta cancelada com sucesso!');
    }

    /**
     * Relatório de contas a pagar
     */
    public function relatorio(Request $request)
    {
        // Atualizar status de contas vencidas antes das consultas
        $this->updateOverdueAccounts();
        
        $query = ContaPagar::with(['fornecedor', 'pontoVenda'])
            ->where('ativo', true);

        if ($request->filled('data_inicio') && $request->filled('data_fim')) {
            $query->whereBetween('data_vencimento', [
                $request->data_inicio,
                $request->data_fim
            ]);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $contas = $query->orderBy('data_vencimento', 'asc')->get();

        $resumo = [
            'total_geral' => $contas->sum('valor_original'),
            'total_pago' => $contas->where('status', 'pago')->sum('valor_pago'),
            'total_pendente' => $contas->where('status', 'pendente')->sum('valor_original'),
            'total_vencido' => $contas->where('status', 'vencido')->sum('valor_original')
        ];

        return Inertia::render('Financeiro/ContasPagar/Relatorio', [
            'contas' => $contas,
            'resumo' => $resumo,
            'filtros' => $request->only(['data_inicio', 'data_fim', 'status'])
        ]);
    }

    /**
     * Atualiza automaticamente o status de contas a pagar vencidas
     */
    private function updateOverdueAccounts()
    {
        $today = now()->toDateString();
        
        ContaPagar::where('ativo', true)
            ->where('status', 'pendente')
            ->where('data_vencimento', '<', $today)
            ->update(['status' => 'vencido']);
    }
}
