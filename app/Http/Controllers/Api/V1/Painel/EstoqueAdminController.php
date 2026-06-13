<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\Deposito;
use App\Models\EstoqueSaldo;
use App\Models\MovimentacaoEstoque;
use App\Models\ProdutoVariacao;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EstoqueAdminController extends Controller
{
    /** Lista saldos por SKU (agregados) ou filtrados por depósito. */
    public function index(Request $request)
    {
        // Filtro explícito tem prioridade; senão, usa o depósito do PDV ativo (PdvScope).
        $depositoId = $request->query('deposito_id') ?? $request->attributes->get('pdv_deposito_id');

        $q = EstoqueSaldo::query()
            ->with([
                'variacao:id_variacao,id_produto,sku',
                'variacao.produto:id_produto,nome',
                'deposito:id,nome',
            ])
            ->when($depositoId, fn ($qq) => $qq->where('deposito_id', $depositoId))
            ->when($request->query('abaixo_minimo') === '1', fn ($qq) => $qq->whereColumn('saldo', '<', 'minimo'));

        if ($busca = $request->query('q')) {
            $q->whereHas('variacao', function ($w) use ($busca) {
                $w->where('sku', 'like', "%{$busca}%")
                  ->orWhereHas('produto', fn ($p) => $p->where('nome', 'like', "%{$busca}%"));
            });
        }

        $page = $q->latest('updated_at')->paginate(30);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'total' => $page->total(),
                'per_page' => $page->perPage(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function depositos()
    {
        return response()->json(['data' => Deposito::orderBy('nome')->get()]);
    }

    /** POST /estoque/ajuste — qtd_delta pode ser positivo ou negativo. */
    public function ajustar(Request $request)
    {
        $data = $request->validate([
            'produto_variacao_id' => ['required', 'integer', 'exists:produto_variacoes,id_variacao'],
            'deposito_id' => ['required', 'integer', 'exists:depositos,id'],
            'qtd_delta' => ['required', 'integer', 'not_in:0'],
            'motivo' => ['required', 'string', 'max:255'],
        ]);

        return DB::transaction(function () use ($data, $request) {
            $variacao = ProdutoVariacao::findOrFail($data['produto_variacao_id']);

            $saldo = EstoqueSaldo::firstOrCreate(
                ['produto_variacao_id' => $data['produto_variacao_id'], 'deposito_id' => $data['deposito_id']],
                ['saldo' => 0, 'reservado' => 0, 'minimo' => 0, 'custo_medio' => 0],
            );

            $novoSaldo = $saldo->saldo + $data['qtd_delta'];
            if ($novoSaldo < 0) {
                throw ValidationException::withMessages(['qtd_delta' => 'Saldo ficaria negativo.']);
            }
            $saldo->update(['saldo' => $novoSaldo]);

            MovimentacaoEstoque::create([
                'deposito_id' => $data['deposito_id'],
                'id_produto' => $variacao->id_produto,
                'id_produto_variacao' => $variacao->id_variacao,
                'id_usuario' => $request->user()->id,
                'tipo_movimentacao' => 'ajuste',
                'origem_type' => 'ajuste_manual',
                'origem_id' => $request->user()->id,
                'quantidade' => abs($data['qtd_delta']),
                'observacoes' => $data['motivo'],
                'data_movimentacao' => now(),
            ]);

            return response()->json(['data' => $saldo->refresh()]);
        });
    }

    /** POST /estoque/transferencias — move qtd entre depósitos. */
    public function transferir(Request $request)
    {
        $data = $request->validate([
            'de' => ['required', 'integer', 'exists:depositos,id', 'different:para'],
            'para' => ['required', 'integer', 'exists:depositos,id'],
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.produto_variacao_id' => ['required', 'integer', 'exists:produto_variacoes,id_variacao'],
            'itens.*.qtd' => ['required', 'integer', 'min:1'],
            'observacao' => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($data, $request) {
            foreach ($data['itens'] as $item) {
                $saldoDe = EstoqueSaldo::where('produto_variacao_id', $item['produto_variacao_id'])
                    ->where('deposito_id', $data['de'])->lockForUpdate()->first();

                if (! $saldoDe || ($saldoDe->saldo - $saldoDe->reservado) < $item['qtd']) {
                    throw ValidationException::withMessages([
                        'itens' => "Saldo insuficiente no depósito de origem para variação {$item['produto_variacao_id']}.",
                    ]);
                }

                $variacao = ProdutoVariacao::findOrFail($item['produto_variacao_id']);

                $saldoDe->decrement('saldo', $item['qtd']);

                $saldoPara = EstoqueSaldo::firstOrCreate(
                    ['produto_variacao_id' => $item['produto_variacao_id'], 'deposito_id' => $data['para']],
                    ['saldo' => 0, 'reservado' => 0, 'minimo' => 0, 'custo_medio' => $saldoDe->custo_medio],
                );
                $saldoPara->increment('saldo', $item['qtd']);

                MovimentacaoEstoque::create([
                    'deposito_id' => $data['de'],
                    'id_produto' => $variacao->id_produto,
                    'id_produto_variacao' => $variacao->id_variacao,
                    'id_usuario' => $request->user()->id,
                    'tipo_movimentacao' => 'saida',
                    'origem_type' => 'transferencia_saida',
                    'origem_id' => $request->user()->id,
                    'quantidade' => $item['qtd'],
                    'observacoes' => $data['observacao'] ?? null,
                    'data_movimentacao' => now(),
                ]);
                MovimentacaoEstoque::create([
                    'deposito_id' => $data['para'],
                    'id_produto' => $variacao->id_produto,
                    'id_produto_variacao' => $variacao->id_variacao,
                    'id_usuario' => $request->user()->id,
                    'tipo_movimentacao' => 'entrada',
                    'origem_type' => 'transferencia_entrada',
                    'origem_id' => $request->user()->id,
                    'quantidade' => $item['qtd'],
                    'observacoes' => $data['observacao'] ?? null,
                    'data_movimentacao' => now(),
                ]);
            }

            return response()->json(['data' => ['ok' => true]]);
        });
    }

    /** GET /estoque/kardex/{variacao}?deposito_id= retorna últimos movimentos. */
    public function kardex(Request $request, ProdutoVariacao $variacao)
    {
        $q = MovimentacaoEstoque::query()
            ->where('id_produto_variacao', $variacao->id_variacao)
            ->when($request->query('deposito_id'), fn ($qq, $v) => $qq->where('deposito_id', $v))
            ->orderByDesc('id_movimentacao')
            ->limit(200);

        return response()->json(['data' => $q->get()]);
    }
}
