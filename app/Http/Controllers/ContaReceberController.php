<?php

namespace App\Http\Controllers;

use App\Models\ContaReceber;
use App\Models\Cliente;
use App\Models\Venda;
use App\Models\PontoVenda;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Carbon\Carbon;

class ContaReceberController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Atualizar status de contas vencidas antes das consultas
        $this->updateOverdueAccounts();
        
        $query = ContaReceber::with(['cliente', 'venda', 'pontoVenda', 'usuario'])
            ->where('ativo', true);

        // Filtros
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('cliente_id')) {
            $query->where('id_cliente', $request->cliente_id);
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
                  ->orWhereHas('cliente', function($subQ) use ($search) {
                      $subQ->where('nome', 'like', "%{$search}%");
                  });
            });
        }

        $contas = $query->orderBy('data_vencimento', 'asc')
                       ->paginate(15)
                       ->withQueryString();

        // Estatísticas
        $estatisticas = [
            'total_pendente' => ContaReceber::where('status', 'pendente')->sum('valor_original'),
            'total_vencido' => ContaReceber::vencidas()->sum('valor_original'),
            'total_recebido_mes' => ContaReceber::where('status', 'recebido')
                ->whereMonth('data_recebimento', now()->month)
                ->sum('valor_recebido'),
            'quantidade_vencidas' => ContaReceber::vencidas()->count()
        ];

        return Inertia::render('Financeiro/ContasReceber/Index', [
            'contas' => $contas,
            'estatisticas' => $estatisticas,
            'clientes' => Cliente::where('ativo', true)->get(['id_cliente', 'nome']),
            'filtros' => $request->only(['status', 'cliente_id', 'data_inicio', 'data_fim', 'search'])
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Financeiro/ContasReceber/Create', [
            'clientes' => Cliente::where('ativo', true)->get(['id_cliente', 'nome']),
            'pontosVenda' => PontoVenda::where('ativo', true)->get(['id_pdv', 'nome']),
            'vendas' => Venda::with('cliente')->where('ativo', true)->latest()->take(50)->get(['id_venda', 'id_cliente', 'valor_total', 'data_venda'])
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'numero_documento' => 'nullable|string|max:50',
            'descricao' => 'required|string|max:255',
            'id_cliente' => 'nullable|exists:clientes,id_cliente',
            'id_venda' => 'nullable|exists:vendas,id_venda',
            'id_pdv' => 'required|exists:pontos_venda,id_pdv',
            'valor_original' => 'required|numeric|min:0.01',
            'data_vencimento' => 'required|date',
            'categoria' => 'required|in:venda,servico,outros',
            'tipo_documento' => 'required|in:nota_fiscal,boleto,recibo,outros',
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
                        $dadosParcela['id_conta_origem'] = $contaPrincipal->id_conta_receber ?? null;
                    }

                    $conta = ContaReceber::create($dadosParcela);
                    
                    if ($i === 1) {
                        $contaPrincipal = $conta;
                    }
                }
            } else {
                $validated['numero_parcela'] = 1;
                $validated['total_parcelas'] = 1;
                ContaReceber::create($validated);
            }

            DB::commit();

            return redirect()->route('financeiro.index')
                           ->with('success', 'Conta a receber criada com sucesso!');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Erro ao criar conta a receber: ' . $e->getMessage()]);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(ContaReceber $contaReceber)
    {
        $contaReceber->load(['cliente', 'venda', 'pontoVenda', 'usuario', 'parcelas']);

        return Inertia::render('Financeiro/ContasReceber/Show', [
            'conta' => $contaReceber
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(ContaReceber $contaReceber)
    {
        return Inertia::render('Financeiro/ContasReceber/Edit', [
            'conta' => $contaReceber,
            'clientes' => Cliente::where('ativo', true)->get(['id_cliente', 'nome']),
            'pontosVenda' => PontoVenda::where('ativo', true)->get(['id_pdv', 'nome']),
            'vendas' => Venda::with('cliente')->where('ativo', true)->latest()->take(50)->get(['id_venda', 'id_cliente', 'valor_total', 'data_venda'])
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ContaReceber $contaReceber)
    {
        // Não permite editar contas já recebidas
        if ($contaReceber->status === 'recebido') {
            return back()->withErrors(['error' => 'Não é possível editar uma conta já recebida.']);
        }

        $validated = $request->validate([
            'numero_documento' => 'nullable|string|max:50',
            'descricao' => 'required|string|max:255',
            'id_cliente' => 'required|exists:clientes,id_cliente',
            'id_venda' => 'nullable|exists:vendas,id_venda',
            'valor_original' => 'required|numeric|min:0.01',
            'data_vencimento' => 'required|date',
            'categoria' => 'required|in:venda,servico,outros',
            'tipo_documento' => 'required|in:nota_fiscal,boleto,recibo,outros',
            'observacoes' => 'nullable|string|max:500'
        ]);

        // Se a data de vencimento foi alterada para hoje ou futuro, ajusta o status
        if ($contaReceber->status === 'vencido' && 
            isset($validated['data_vencimento']) && 
            Carbon::parse($validated['data_vencimento'])->gte(now()->startOfDay())) {
            $validated['status'] = 'pendente';
        }

        $contaReceber->update($validated);

        return redirect()->route('financeiro.index')
                       ->with('success', 'Conta a receber atualizada com sucesso!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ContaReceber $contaReceber)
    {
        // Não permite excluir contas já recebidas
        if ($contaReceber->status === 'recebido') {
            return back()->withErrors(['error' => 'Não é possível excluir uma conta já recebida.']);
        }

        $contaReceber->update(['status' => 'cancelado']);

        return redirect()->route('financeiro.index')
                       ->with('success', 'Conta a receber removida com sucesso!');
    }

    /**
     * Marcar conta como recebida
     */
    public function receber(Request $request, ContaReceber $contaReceber)
    {
        $validated = $request->validate([
            'valor_recebido' => 'required|numeric|min:0.01',
            'data_recebimento' => 'required|date',
            'valor_desconto' => 'nullable|numeric|min:0',
            'valor_juros' => 'nullable|numeric|min:0',
            'valor_multa' => 'nullable|numeric|min:0',
            'observacoes' => 'nullable|string|max:500'
        ]);

        DB::beginTransaction();
        try {
            $contaReceber->update([
                'status' => 'recebido',
                'valor_recebido' => $validated['valor_recebido'],
                'data_recebimento' => $validated['data_recebimento'],
                'valor_desconto' => $validated['valor_desconto'] ?? 0,
                'valor_juros' => $validated['valor_juros'] ?? 0,
                'valor_multa' => $validated['valor_multa'] ?? 0,
                'observacoes' => $validated['observacoes']
            ]);

            DB::commit();

            return redirect()->route('financeiro.index')
                           ->with('success', 'Recebimento registrado com sucesso!');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Erro ao registrar recebimento: ' . $e->getMessage()]);
        }
    }

    /**
     * Cancelar conta
     */
    public function cancelar(ContaReceber $contaReceber)
    {
        if ($contaReceber->status === 'recebido') {
            return back()->withErrors(['error' => 'Não é possível cancelar uma conta já recebida.']);
        }

        $contaReceber->cancelar();

        return redirect()->route('financeiro.index')
                       ->with('success', 'Conta cancelada com sucesso!');
    }

    /**
     * Relatório de contas a receber
     */
    public function relatorio(Request $request)
    {
        // Atualizar status de contas vencidas antes das consultas
        $this->updateOverdueAccounts();
        
        $query = ContaReceber::with(['cliente', 'venda', 'pontoVenda'])
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
            'total_recebido' => $contas->where('status', 'recebido')->sum('valor_recebido'),
            'total_pendente' => $contas->where('status', 'pendente')->sum('valor_original'),
            'total_vencido' => $contas->where('status', 'vencido')->sum('valor_original')
        ];

        return Inertia::render('Financeiro/ContasReceber/Relatorio', [
            'contas' => $contas,
            'resumo' => $resumo,
            'filtros' => $request->only(['data_inicio', 'data_fim', 'status'])
        ]);
    }

    /**
     * Gerar conta a receber a partir de uma venda
     */
    public function gerarDeVenda(Request $request, Venda $venda)
    {
        $validated = $request->validate([
            'data_vencimento' => 'required|date',
            'total_parcelas' => 'nullable|integer|min:1|max:999',
            'observacoes' => 'nullable|string|max:500'
        ]);

        DB::beginTransaction();
        try {
            $dadosConta = [
                'numero_documento' => 'VENDA-' . $venda->id_venda,
                'descricao' => 'Conta a receber referente à venda #' . $venda->id_venda,
                'id_cliente' => $venda->id_cliente,
                'id_venda' => $venda->id_venda,
                'id_pdv' => $venda->id_pdv,
                'user_id' => Auth::id(),
                'valor_original' => $venda->valor_total,
                'data_vencimento' => $validated['data_vencimento'],
                'status' => 'pendente',
                'categoria' => 'venda',
                'tipo_documento' => 'nota_fiscal',
                'observacoes' => $validated['observacoes'],
                'ativo' => true
            ];

            // Se tem parcelas, criar múltiplas contas
            if (isset($validated['total_parcelas']) && $validated['total_parcelas'] > 1) {
                $valorParcela = $venda->valor_total / $validated['total_parcelas'];
                $dataVencimento = Carbon::parse($validated['data_vencimento']);

                for ($i = 1; $i <= $validated['total_parcelas']; $i++) {
                    $dadosParcela = $dadosConta;
                    $dadosParcela['numero_parcela'] = $i;
                    $dadosParcela['total_parcelas'] = $validated['total_parcelas'];
                    $dadosParcela['valor_original'] = $valorParcela;
                    $dadosParcela['data_vencimento'] = $dataVencimento->copy()->addMonths($i - 1)->toDateString();
                    
                    if ($i > 1) {
                        $dadosParcela['id_conta_origem'] = $contaPrincipal->id_conta_receber ?? null;
                    }

                    $conta = ContaReceber::create($dadosParcela);
                    
                    if ($i === 1) {
                        $contaPrincipal = $conta;
                    }
                }
            } else {
                $dadosConta['numero_parcela'] = 1;
                $dadosConta['total_parcelas'] = 1;
                ContaReceber::create($dadosConta);
            }

            DB::commit();

            return redirect()->route('contas-receber.index')
                           ->with('success', 'Conta a receber gerada com sucesso a partir da venda!');

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Erro ao gerar conta a receber: ' . $e->getMessage()]);
        }
    }

    /**
     * Atualiza automaticamente o status de contas a receber vencidas
     */
    private function updateOverdueAccounts()
    {
        $today = now()->toDateString();
        
        ContaReceber::where('ativo', true)
            ->where('status', 'pendente')
            ->where('data_vencimento', '<', $today)
            ->update(['status' => 'vencido']);
    }
}
