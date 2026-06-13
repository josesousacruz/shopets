<?php

namespace App\Services\Relatorios;

use App\Services\Financeiro\DREService;
use App\Services\Financeiro\FluxoCaixaService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class RelatorioNaoEncontradoException extends RuntimeException {}

class RelatorioBuilder
{
    /** Status de pedido que contam como venda realizada. */
    private const PAGOS = ['pago', 'em_separacao', 'enviado', 'entregue'];

    public function __construct(
        private readonly FluxoCaixaService $fluxo,
        private readonly DREService $dre,
    ) {
    }

    /** Lista todas as definições agrupadas. */
    public function definicoes(): array
    {
        return config('relatorios.relatorios');
    }

    public function definicao(string $slug): array
    {
        $def = config("relatorios.relatorios.{$slug}");
        if (! $def) {
            throw new RelatorioNaoEncontradoException("Relatório '{$slug}' não existe.");
        }

        return array_merge(['slug' => $slug], $def);
    }

    /**
     * Retorna as linhas (array assoc) de um relatório.
     *
     * @return array{definicao:array, linhas:array<int,array<string,mixed>>}
     */
    public function dados(string $slug, array $filtros = []): array
    {
        $def = $this->definicao($slug);
        $metodo = 'rel'.str_replace(' ', '', ucwords(str_replace('-', ' ', $slug)));

        if (! method_exists($this, $metodo)) {
            throw new RelatorioNaoEncontradoException("Relatório '{$slug}' sem implementação.");
        }

        return ['definicao' => $def, 'linhas' => $this->{$metodo}($filtros)];
    }

    // ---- período helper -------------------------------------------------

    private function periodo(array $f): array
    {
        $de = $f['de'] ?? Carbon::now()->subDays((int) config('relatorios.default_period_days', 30))->toDateString();
        $ate = $f['ate'] ?? Carbon::now()->toDateString();

        return [$de, $ate.' 23:59:59'];
    }

    // ---- VENDAS ---------------------------------------------------------

    private function relVendasPorPeriodo(array $f): array
    {
        [$de, $ate] = $this->periodo($f);

        return DB::table('pedidos')
            ->whereIn('status', self::PAGOS)
            ->whereBetween('created_at', [$de, $ate])
            ->selectRaw('DATE(created_at) as data, COUNT(*) as pedidos, SUM(total) as total')
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('data')
            ->get()
            ->map(fn ($r) => ['data' => $r->data, 'pedidos' => (int) $r->pedidos, 'total' => (float) $r->total])
            ->all();
    }

    private function relVendasPorProduto(array $f): array
    {
        [$de, $ate] = $this->periodo($f);

        return DB::table('pedido_itens as pi')
            ->join('pedidos as p', 'p.id_pedido', '=', 'pi.id_pedido')
            ->whereIn('p.status', self::PAGOS)
            ->whereBetween('p.created_at', [$de, $ate])
            ->selectRaw('pi.nome as produto, SUM(pi.quantidade) as quantidade, SUM(pi.subtotal) as total')
            ->groupBy('pi.id_produto', 'pi.nome')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['produto' => $r->produto, 'quantidade' => (float) $r->quantidade, 'total' => (float) $r->total])
            ->all();
    }

    private function relVendasPorCategoria(array $f): array
    {
        [$de, $ate] = $this->periodo($f);

        return DB::table('pedido_itens as pi')
            ->join('pedidos as p', 'p.id_pedido', '=', 'pi.id_pedido')
            ->leftJoin('produtos as pr', 'pr.id_produto', '=', 'pi.id_produto')
            ->leftJoin('categorias as c', 'c.id_categoria', '=', 'pr.id_categoria')
            ->whereIn('p.status', self::PAGOS)
            ->whereBetween('p.created_at', [$de, $ate])
            ->selectRaw("COALESCE(c.nome, 'Sem categoria') as categoria, SUM(pi.quantidade) as quantidade, SUM(pi.subtotal) as total")
            ->groupBy('categoria')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['categoria' => $r->categoria, 'quantidade' => (float) $r->quantidade, 'total' => (float) $r->total])
            ->all();
    }

    private function relVendasPorCanal(array $f): array
    {
        [$de, $ate] = $this->periodo($f);

        $online = DB::table('pedidos')->whereIn('status', self::PAGOS)
            ->whereBetween('created_at', [$de, $ate])
            ->selectRaw('COUNT(*) as q, SUM(total) as t')->first();

        $fisico = DB::table('vendas')->where('status', 'finalizada')
            ->whereBetween('data_venda', [$de, $ate])
            ->selectRaw('COUNT(*) as q, SUM(valor_total) as t')->first();

        return [
            ['canal' => 'Online', 'pedidos' => (int) ($online->q ?? 0), 'total' => (float) ($online->t ?? 0)],
            ['canal' => 'Físico (PDV)', 'pedidos' => (int) ($fisico->q ?? 0), 'total' => (float) ($fisico->t ?? 0)],
        ];
    }

    private function relVendasPorCupom(array $f): array
    {
        [$de, $ate] = $this->periodo($f);

        return DB::table('pedidos as p')
            ->join('cupons as c', 'c.id_cupom', '=', 'p.id_cupom')
            ->whereIn('p.status', self::PAGOS)
            ->whereBetween('p.created_at', [$de, $ate])
            ->selectRaw('c.codigo as cupom, COUNT(*) as pedidos, SUM(p.desconto) as desconto, SUM(p.total) as total')
            ->groupBy('c.id_cupom', 'c.codigo')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['cupom' => $r->cupom, 'pedidos' => (int) $r->pedidos, 'desconto' => (float) $r->desconto, 'total' => (float) $r->total])
            ->all();
    }

    private function relComparativoOnlineVsFisico(array $f): array
    {
        [$de, $ate] = $this->periodo($f);

        $online = DB::table('pedidos')->whereIn('status', self::PAGOS)
            ->whereBetween('created_at', [$de, $ate])
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as mes, SUM(total) as t")
            ->groupBy('mes')->pluck('t', 'mes');

        $fisico = DB::table('vendas')->where('status', 'finalizada')
            ->whereBetween('data_venda', [$de, $ate])
            ->selectRaw("DATE_FORMAT(data_venda, '%Y-%m') as mes, SUM(valor_total) as t")
            ->groupBy('mes')->pluck('t', 'mes');

        $meses = collect($online->keys())->merge($fisico->keys())->unique()->sort()->values();

        return $meses->map(fn ($m) => [
            'mes' => $m,
            'online' => (float) ($online[$m] ?? 0),
            'fisico' => (float) ($fisico[$m] ?? 0),
        ])->all();
    }

    private function relVendasPorPdv(array $f): array
    {
        [$de, $ate] = $this->periodo($f);

        return DB::table('vendas as v')
            ->join('pontos_venda as pv', 'pv.id_pdv', '=', 'v.id_pdv')
            ->where('v.status', 'finalizada')
            ->whereBetween('v.data_venda', [$de, $ate])
            ->selectRaw('pv.nome_pdv as pdv, COUNT(*) as vendas, SUM(v.valor_total) as total')
            ->groupBy('pv.id_pdv', 'pv.nome_pdv')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['pdv' => $r->pdv, 'vendas' => (int) $r->vendas, 'total' => (float) $r->total])
            ->all();
    }

    // ---- FINANCEIRO -----------------------------------------------------

    private function relApVencidos(array $f): array
    {
        return DB::table('contas_pagar as cp')
            ->leftJoin('fornecedores as fo', 'fo.id_fornecedor', '=', 'cp.id_fornecedor')
            ->where('cp.ativo', true)->where('cp.status', 'pendente')
            ->whereDate('cp.data_vencimento', '<', now()->toDateString())
            ->orderBy('cp.data_vencimento')
            ->get(['cp.descricao', 'fo.nome as fornecedor', 'cp.data_vencimento as vencimento', 'cp.valor_original as valor'])
            ->map(fn ($r) => ['descricao' => $r->descricao, 'fornecedor' => $r->fornecedor ?? '—', 'vencimento' => $r->vencimento, 'valor' => (float) $r->valor])
            ->all();
    }

    private function relArVencidos(array $f): array
    {
        return DB::table('contas_receber as cr')
            ->leftJoin('clientes as cl', 'cl.id_cliente', '=', 'cr.id_cliente')
            ->where('cr.ativo', true)->where('cr.status', 'pendente')
            ->whereDate('cr.data_vencimento', '<', now()->toDateString())
            ->orderBy('cr.data_vencimento')
            ->get(['cr.descricao', 'cl.nome as cliente', 'cr.data_vencimento as vencimento', 'cr.valor_original as valor'])
            ->map(fn ($r) => ['descricao' => $r->descricao, 'cliente' => $r->cliente ?? '—', 'vencimento' => $r->vencimento, 'valor' => (float) $r->valor])
            ->all();
    }

    private function relFluxoRealizado(array $f): array
    {
        [$de, $ate] = $this->periodo($f);

        return $this->fluxo->porDia('realizado', $f['de'] ?? null, $f['ate'] ?? null)['linhas'];
    }

    private function relFluxoPrevisto(array $f): array
    {
        return $this->fluxo->porDia('previsto', $f['de'] ?? null, $f['ate'] ?? null)['linhas'];
    }

    private function relDreResumido(array $f): array
    {
        $dre = $this->dre->gerar($f['de'] ?? null, $f['ate'] ?? null);
        $linhas = [];
        foreach ($dre['receitas'] as $r) {
            $linhas[] = ['tipo' => 'Receita', 'plano' => $r['plano'], 'total' => $r['total']];
        }
        foreach ($dre['despesas'] as $d) {
            $linhas[] = ['tipo' => 'Despesa', 'plano' => $d['plano'], 'total' => $d['total']];
        }
        $linhas[] = ['tipo' => 'Resultado', 'plano' => 'Lucro líquido', 'total' => $dre['lucro_liquido']];

        return $linhas;
    }

    // ---- CLIENTES -------------------------------------------------------

    private function relNovosVsRecorrentes(array $f): array
    {
        $porCliente = DB::table('pedidos')->whereIn('status', self::PAGOS)
            ->selectRaw('id_cliente, COUNT(*) as n')->groupBy('id_cliente')->pluck('n');

        $novos = $porCliente->filter(fn ($n) => $n == 1)->count();
        $recorrentes = $porCliente->filter(fn ($n) => $n > 1)->count();

        return [
            ['tipo' => 'Novos (1 compra)', 'clientes' => $novos],
            ['tipo' => 'Recorrentes (2+)', 'clientes' => $recorrentes],
        ];
    }

    private function relLtvRanking(array $f): array
    {
        return DB::table('pedidos as p')
            ->join('clientes as c', 'c.id_cliente', '=', 'p.id_cliente')
            ->whereIn('p.status', self::PAGOS)
            ->selectRaw('c.nome as cliente, COUNT(*) as pedidos, SUM(p.total) as total')
            ->groupBy('c.id_cliente', 'c.nome')
            ->orderByDesc('total')
            ->limit(50)
            ->get()
            ->map(fn ($r) => ['cliente' => $r->cliente, 'pedidos' => (int) $r->pedidos, 'total' => (float) $r->total])
            ->all();
    }

    private function relInativos(array $f): array
    {
        $dias = (int) ($f['dias'] ?? 90);
        $cutoff = now()->subDays($dias)->toDateString();

        return DB::table('clientes as c')
            ->leftJoin(DB::raw('(SELECT id_cliente, MAX(created_at) as ultima FROM pedidos WHERE status IN ("pago","em_separacao","enviado","entregue") GROUP BY id_cliente) as up'),
                'up.id_cliente', '=', 'c.id_cliente')
            ->where('c.ativo', true)
            ->where(fn ($q) => $q->whereNull('up.ultima')->orWhereDate('up.ultima', '<', $cutoff))
            ->orderByRaw('up.ultima IS NULL DESC, up.ultima ASC')
            ->limit(200)
            ->get(['c.nome as cliente', 'c.email', 'up.ultima as ultima_compra'])
            ->map(fn ($r) => ['cliente' => $r->cliente, 'email' => $r->email ?? '—', 'ultima_compra' => $r->ultima_compra ?? 'Nunca'])
            ->all();
    }
}
