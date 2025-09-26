<?php

namespace App\Http\Controllers;

use App\Models\FluxoCaixa;
use App\Models\PontoVenda;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FluxoCaixaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = FluxoCaixa::with(['user', 'pontoVenda']);

        // Filtros
        if ($request->filled('data_inicio')) {
            $query->where('created_at', '>=', $request->data_inicio);
        }

        if ($request->filled('data_fim')) {
            $query->where('created_at', '<=', $request->data_fim . ' 23:59:59');
        }

        if ($request->filled('tipo_operacao')) {
            $query->where('tipo_operacao', $request->tipo_operacao);
        }

        if ($request->filled('categoria')) {
            $query->where('categoria', $request->categoria);
        }

        if ($request->filled('id_pdv')) {
            $query->where('id_pdv', $request->id_pdv);
        }

        $fluxoCaixa = $query->orderBy('created_at', 'desc')->paginate(20);

        // Estatísticas
        $estatisticas = $this->getEstatisticas($request);

        return Inertia::render('Financeiro/FluxoCaixa', [
            'fluxoCaixa' => $fluxoCaixa,
            'estatisticas' => $estatisticas,
            'pontosVenda' => PontoVenda::where('ativo', true)->get(),
            'filtros' => $request->only(['data_inicio', 'data_fim', 'tipo_operacao', 'categoria', 'id_pdv'])
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'id_pdv' => 'required|exists:pontos_venda,id_pdv',
            'tipo_operacao' => 'required|in:entrada,saida',
            'valor' => 'required|numeric|min:0.01',
            'descricao' => 'required|string|max:255',
            'categoria' => 'required|in:venda,compra,despesa,receita,outros',
        ]);

        FluxoCaixa::create([
            'user_id' => auth()->id(),
            'id_pdv' => $request->id_pdv,
            'tipo_operacao' => $request->tipo_operacao,
            'valor' => $request->valor,
            'descricao' => $request->descricao,
            'categoria' => $request->categoria,
        ]);

        return redirect()->back()->with('success', 'Movimentação registrada com sucesso!');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, FluxoCaixa $fluxoCaixa)
    {
        $request->validate([
            'descricao' => 'required|string|max:255',
            'categoria' => 'required|in:venda,compra,despesa,receita,outros',
        ]);

        $fluxoCaixa->update([
            'descricao' => $request->descricao,
            'categoria' => $request->categoria,
        ]);

        return redirect()->back()->with('success', 'Movimentação atualizada com sucesso!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FluxoCaixa $fluxoCaixa)
    {
        $fluxoCaixa->delete();

        return redirect()->back()->with('success', 'Movimentação removida com sucesso!');
    }

    /**
     * Get cash flow statistics
     */
    private function getEstatisticas(Request $request)
    {
        $query = FluxoCaixa::query();

        // Aplicar filtros de data
        if ($request->filled('data_inicio')) {
            $query->where('created_at', '>=', $request->data_inicio);
        }

        if ($request->filled('data_fim')) {
            $query->where('created_at', '<=', $request->data_fim . ' 23:59:59');
        }

        if ($request->filled('id_pdv')) {
            $query->where('id_pdv', $request->id_pdv);
        }

        $entradas = (clone $query)->entradas()->sum('valor');
        $saidas = (clone $query)->saidas()->sum('valor');
        $saldo = $entradas - $saidas;

        // Estatísticas por categoria
        $porCategoria = (clone $query)
            ->select('categoria', 'tipo_operacao', DB::raw('SUM(valor) as total'))
            ->groupBy('categoria', 'tipo_operacao')
            ->get()
            ->groupBy('categoria');

        return [
            'total_entradas' => $entradas,
            'total_saidas' => $saidas,
            'saldo' => $saldo,
            'por_categoria' => $porCategoria,
        ];
    }

    /**
     * Get cash flow data for charts
     */
    public function getDadosGrafico(Request $request)
    {
        $dataInicio = $request->get('data_inicio', Carbon::now()->startOfMonth());
        $dataFim = $request->get('data_fim', Carbon::now()->endOfMonth());
        $idPdv = $request->get('id_pdv');

        $query = FluxoCaixa::whereBetween('created_at', [$dataInicio, $dataFim]);

        if ($idPdv) {
            $query->where('id_pdv', $idPdv);
        }

        // Dados diários
        $dadosDiarios = $query
            ->select(
                DB::raw('DATE(created_at) as data'),
                DB::raw('SUM(CASE WHEN tipo_operacao = "entrada" THEN valor ELSE 0 END) as entradas'),
                DB::raw('SUM(CASE WHEN tipo_operacao = "saida" THEN valor ELSE 0 END) as saidas')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('data')
            ->get();

        // Dados por categoria
        $dadosPorCategoria = (clone $query)
            ->select('categoria', 'tipo_operacao', DB::raw('SUM(valor) as total'))
            ->groupBy('categoria', 'tipo_operacao')
            ->get();

        return response()->json([
            'diarios' => $dadosDiarios,
            'categorias' => $dadosPorCategoria,
        ]);
    }
}
