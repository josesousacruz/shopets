<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Pedido;
use App\Models\PedidoEvento;
use App\Models\Venda;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class LojaPedidoController extends Controller
{
    /** Status válidos e suas transições permitidas. */
    private const TRANSICOES = [
        'aguardando_pagamento' => ['cancelado'],
        'pago' => ['em_separacao', 'cancelado'],
        'em_separacao' => ['enviado', 'cancelado'],
        'enviado' => ['entregue'],
        'entregue' => [],
        'cancelado' => [],
    ];

    public function index(Request $request)
    {
        $status = $request->query('status');
        $busca = trim((string) $request->query('busca', ''));

        $query = Pedido::query()
            ->with(['cliente:id_cliente,nome,email'])
            ->withCount('itens')
            ->orderByDesc('created_at');

        if ($status && array_key_exists($status, self::TRANSICOES)) {
            $query->where('status', $status);
        }

        if ($busca !== '') {
            $query->where(function ($q) use ($busca) {
                $q->where('numero', 'like', "%{$busca}%")
                    ->orWhereHas('cliente', function ($c) use ($busca) {
                        $c->where('nome', 'like', "%{$busca}%")
                            ->orWhere('email', 'like', "%{$busca}%");
                    });
            });
        }

        $pedidos = $query->paginate(20)->withQueryString();

        $pedidos->getCollection()->transform(fn (Pedido $p) => [
            'numero' => $p->numero,
            'cliente' => $p->cliente?->nome ?? '—',
            'cliente_email' => $p->cliente?->email,
            'data' => optional($p->created_at)->toIso8601String(),
            'modalidade' => $p->modalidade,
            'total' => (float) $p->total,
            'status' => $p->status,
            'itens_count' => $p->itens_count,
        ]);

        return Inertia::render('Loja/Pedidos/Index', [
            'pedidos' => $pedidos,
            'filtros' => [
                'status' => $status,
                'busca' => $busca,
            ],
            'statusOptions' => array_keys(self::TRANSICOES),
        ]);
    }

    public function show(Pedido $pedido)
    {
        $pedido->load([
            'cliente:id_cliente,nome,email,telefone,cpf_cnpj',
            'itens',
            'enderecoEntrega',
            'eventos' => fn ($q) => $q->orderByDesc('criado_em'),
        ]);

        $pagamento = \App\Models\PagamentoPedido::where('id_pedido', $pedido->id_pedido)
            ->orderByDesc('id_pagamento_pedido')
            ->first();

        $venda = $pedido->id_venda
            ? Venda::where('id_venda', $pedido->id_venda)->first(['id_venda', 'numero_venda'])
            : null;

        return Inertia::render('Loja/Pedidos/Show', [
            'pedido' => [
                'numero' => $pedido->numero,
                'status' => $pedido->status,
                'modalidade' => $pedido->modalidade,
                'subtotal' => (float) $pedido->subtotal,
                'frete' => (float) $pedido->frete,
                'desconto' => (float) $pedido->desconto,
                'total' => (float) $pedido->total,
                'frete_servico' => $pedido->frete_servico,
                'prazo_entrega_dias' => $pedido->prazo_entrega_dias,
                'codigo_rastreio' => $pedido->codigo_rastreio,
                'observacoes' => $pedido->observacoes,
                'criado_em' => optional($pedido->created_at)->toIso8601String(),
                'pago_em' => optional($pedido->pago_em)->toIso8601String(),
                'enviado_em' => optional($pedido->enviado_em)->toIso8601String(),
                'entregue_em' => optional($pedido->entregue_em)->toIso8601String(),
                'cancelado_em' => optional($pedido->cancelado_em)->toIso8601String(),
                'nfe_numero' => $pedido->nfe_numero,
                'nfe_chave' => $pedido->nfe_chave,
                'cliente' => $pedido->cliente ? [
                    'nome' => $pedido->cliente->nome,
                    'email' => $pedido->cliente->email,
                    'telefone' => $pedido->cliente->telefone,
                    'cpf_cnpj' => $pedido->cliente->cpf_cnpj,
                ] : null,
                'endereco' => $pedido->enderecoEntrega ? [
                    'logradouro' => $pedido->enderecoEntrega->logradouro,
                    'numero' => $pedido->enderecoEntrega->numero,
                    'complemento' => $pedido->enderecoEntrega->complemento,
                    'bairro' => $pedido->enderecoEntrega->bairro,
                    'cidade' => $pedido->enderecoEntrega->cidade,
                    'uf' => $pedido->enderecoEntrega->uf,
                    'cep' => $pedido->enderecoEntrega->cep,
                ] : null,
                'itens' => $pedido->itens->map(fn ($i) => [
                    'nome' => $i->nome,
                    'sku' => $i->sku,
                    'preco_unit' => (float) $i->preco_unit,
                    'quantidade' => $i->quantidade,
                    'subtotal' => (float) $i->subtotal,
                ]),
                'pagamento' => $pagamento ? [
                    'metodo' => $pagamento->metodo,
                    'status' => $pagamento->status,
                    'valor' => (float) $pagamento->valor,
                    'gateway' => $pagamento->gateway,
                    'processado_em' => optional($pagamento->processado_em)->toIso8601String(),
                ] : null,
                'venda' => $venda ? [
                    'numero' => $venda->numero_venda,
                ] : null,
                'eventos' => $pedido->eventos->map(fn ($e) => [
                    'tipo' => $e->tipo,
                    'descricao' => $e->descricao,
                    'criado_em' => optional($e->criado_em)->toIso8601String(),
                ]),
            ],
        ]);
    }

    public function marcarEmSeparacao(Pedido $pedido)
    {
        return $this->transicionar($pedido, 'em_separacao', 'Pedido em separação.');
    }

    public function marcarEnviado(Request $request, Pedido $pedido)
    {
        $request->validate([
            'codigo_rastreio' => 'nullable|string|max:60',
        ]);

        return $this->transicionar(
            $pedido,
            'enviado',
            'Pedido enviado.' . ($request->codigo_rastreio ? " Rastreio: {$request->codigo_rastreio}." : ''),
            function (Pedido $p) use ($request) {
                $p->codigo_rastreio = $request->codigo_rastreio ?: $p->codigo_rastreio;
                $p->enviado_em = now();
            },
        );
    }

    public function marcarEntregue(Pedido $pedido)
    {
        return $this->transicionar($pedido, 'entregue', 'Pedido entregue ao cliente.', function (Pedido $p) {
            $p->entregue_em = now();
        });
    }

    public function cancelar(Request $request, Pedido $pedido)
    {
        $request->validate([
            'motivo' => 'nullable|string|max:255',
        ]);

        return $this->transicionar(
            $pedido,
            'cancelado',
            'Pedido cancelado.' . ($request->motivo ? " Motivo: {$request->motivo}." : ''),
            function (Pedido $p) {
                $p->cancelado_em = now();
            },
        );
    }

    /** Aplica a transição de status com validação + evento, dentro de transação. */
    private function transicionar(Pedido $pedido, string $novoStatus, string $descricao, ?callable $extra = null)
    {
        $atual = $pedido->status;
        $permitidos = self::TRANSICOES[$atual] ?? [];

        if (! in_array($novoStatus, $permitidos, true)) {
            return back()->withErrors([
                'status' => "Transição inválida: de \"{$atual}\" para \"{$novoStatus}\".",
            ]);
        }

        DB::transaction(function () use ($pedido, $novoStatus, $descricao, $extra) {
            $pedido->status = $novoStatus;
            if ($extra) {
                $extra($pedido);
            }
            $pedido->save();

            PedidoEvento::create([
                'id_pedido' => $pedido->id_pedido,
                'tipo' => $novoStatus,
                'descricao' => $descricao,
                'criado_por_user_id' => auth()->id(),
                'criado_em' => now(),
            ]);
        });

        return back()->with('success', $descricao);
    }
}
