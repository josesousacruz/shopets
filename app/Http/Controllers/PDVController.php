<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\Cliente;
use App\Models\ConfiguracaoEmpresa;
use App\Models\FormaPagamento;
use App\Models\ItemVenda;
use App\Models\Produto;
use App\Models\Venda;
use App\Services\NfceService;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PDVController extends Controller
{
    /**
     * Display the PDV page.
     */
    public function index(): Response
    {
        // Carrega produtos ativos com suas categorias (cache curto)
        $produtos = Cache::remember('pdv:produtos', 30, function () {
            return Produto::with('categoria')
                ->where('ativo', true)
                ->orderBy('nome')
                ->get();
        });

        // Carrega categorias ativas (cache médio)
        $categorias = Cache::remember('pdv:categorias', 300, function () {
            return Categoria::where('ativo', true)
                ->orderBy('nome')
                ->get();
        });

        // Transforma os dados para o formato esperado pelo frontend
        $products = $produtos->map(function ($produto) {
            return [
                'id' => $produto->id_produto,
                'name' => $produto->nome,
                'price' => (float) $produto->preco_venda,
                'stock' => (int) $produto->estoque_atual,
                'category' => $produto->categoria ? $produto->categoria->nome : 'Sem categoria',
                'categoryId' => $produto->id_categoria,
                'barcode' => $produto->codigo_barras,
                'internalCode' => $produto->codigo_interno,
                'description' => $produto->descricao,
                'unit' => $produto->unidade,
                'allowFraction' => (bool) $produto->permite_fracao,
                'image' => null, // Por enquanto sem imagem
            ];
        });

        $categories = $categorias->map(function ($categoria) {
            return [
                'id' => $categoria->id_categoria,
                'name' => $categoria->nome,
                'description' => $categoria->descricao,
                'color' => $categoria->cor,
            ];
        });

        // Carrega clientes ativos para o modal
        $clientes = Cliente::where('ativo', true)
            ->orderBy('nome')
            ->get()
            ->map(function ($cliente) {
                return [
                    'id_cliente' => $cliente->id_cliente,
                    'nome' => $cliente->nome,
                    'email' => $cliente->email,
                    'telefone' => $cliente->telefone,
                    'pontos_fidelidade' => (float) $cliente->pontos_fidelidade,
                ];
            });

        // Carrega formas de pagamento ativas para o modal (cache médio)
        $formasPagamentoModels = Cache::remember('pdv:formas_pagamento', 300, function () {
            return FormaPagamento::where('ativo', true)
                ->orderBy('ordem_exibicao')
                ->orderBy('nome')
                ->get();
        });

        $formasPagamento = $formasPagamentoModels->map(function ($forma) {
            return [
                'id_forma_pagamento' => $forma->id_forma_pagamento,
                'nome' => $forma->nome,
                'tipo' => $forma->tipo,
                'permite_parcelamento' => (bool) $forma->permite_parcelamento,
                'max_parcelas' => (int) $forma->max_parcelas,
                'taxa_juros' => (float) $forma->taxa_juros,
                'taxa_desconto' => (float) $forma->taxa_desconto,
            ];
        });

        // Carrega configuração da empresa para o cabeçalho do cupom
        $empresaModel = ConfiguracaoEmpresa::first();
        $empresa = $empresaModel ? [
            'nome_empresa' => $empresaModel->nome_empresa,
            'razao_social' => $empresaModel->razao_social,
            'cnpj' => $empresaModel->cnpj,
            'telefone' => $empresaModel->telefone,
            'email' => $empresaModel->email,
            'endereco' => $empresaModel->endereco,
        ] : null;

        return Inertia::render('Pdv/Index', [
            'products' => $products,
            'categories' => $categories,
            'clientes' => $clientes,
            'formasPagamento' => $formasPagamento,
            'empresa' => $empresa,
        ]);
    }

    /**
     * Get updated products for PDV.
     */
    public function getProducts()
    {
        // Carrega produtos ativos com suas categorias
        $produtos = Produto::with('categoria')
            ->where('ativo', true)
            ->orderBy('nome')
            ->get();

        // Transforma os dados para o formato esperado pelo frontend
        $products = $produtos->map(function ($produto) {
            return [
                'id' => $produto->id_produto,
                'name' => $produto->nome,
                'price' => (float) $produto->preco_venda,
                'stock' => (int) $produto->estoque_atual,
                'category' => $produto->categoria ? $produto->categoria->nome : 'Sem categoria',
                'categoryId' => $produto->id_categoria,
                'barcode' => $produto->codigo_barras,
                'internalCode' => $produto->codigo_interno,
                'description' => $produto->descricao,
                'unit' => $produto->unidade,
                'allowFraction' => (bool) $produto->permite_fracao,
                'image' => null, // Por enquanto sem imagem
            ];
        });

        return response()->json(['products' => $products]);
    }

    public function getCupomDados($id)
    {
        $venda = Venda::with(['itens.produto', 'cliente'])->findOrFail($id);

        $items = $venda->itens->map(function ($item) {
            return [
                'product' => [
                    'id' => $item->id_produto,
                    'name' => optional($item->produto)->nome,
                    'price' => (float) $item->preco_unitario,
                ],
                'quantity' => (float) $item->quantidade,
                'desconto_item' => (float) ($item->desconto_item ?? 0),
                'valor_total_item' => (float) ($item->valor_total_item ?? ((float) $item->preco_unitario * (float) $item->quantidade)),
            ];
        });

        $cliente = $venda->cliente ? [
            'id_cliente' => $venda->cliente->id_cliente,
            'nome' => $venda->cliente->nome,
            'email' => $venda->cliente->email,
            'telefone' => $venda->cliente->telefone,
            'pontos_fidelidade' => (float) ($venda->cliente->pontos_fidelidade ?? 0),
        ] : null;

        $pagamentosRaw = DB::table('pagamentos_venda')
            ->join('formas_pagamento', 'pagamentos_venda.id_forma_pagamento', '=', 'formas_pagamento.id_forma_pagamento')
            ->where('pagamentos_venda.id_venda', $venda->id_venda)
            ->select('formas_pagamento.nome as forma_nome', 'pagamentos_venda.valor_pagamento', 'pagamentos_venda.numero_parcelas', 'pagamentos_venda.valor_parcela', 'pagamentos_venda.status_pagamento')
            ->get();

        $formaPagamentoNome = null;
        if ($pagamentosRaw->count() === 1) {
            $formaPagamentoNome = $pagamentosRaw->first()->forma_nome;
        } elseif ($pagamentosRaw->count() > 1) {
            $formaPagamentoNome = 'Múltiplos';
        }

        $pagamentos = $pagamentosRaw->map(function ($p) {
            return [
                'forma_nome' => $p->forma_nome,
                'valor_pagamento' => (float) $p->valor_pagamento,
                'numero_parcelas' => (int) $p->numero_parcelas,
                'valor_parcela' => (float) $p->valor_parcela,
                'status_pagamento' => $p->status_pagamento,
            ];
        });

        $empresaModel = ConfiguracaoEmpresa::first();
        $empresa = $empresaModel ? [
            'nome_empresa' => $empresaModel->nome_empresa,
            'razao_social' => $empresaModel->razao_social,
            'cnpj' => $empresaModel->cnpj,
            'telefone' => $empresaModel->telefone,
            'email' => $empresaModel->email,
            'endereco' => $empresaModel->endereco,
        ] : null;

        return response()->json([
            'venda' => [
                'id_venda' => $venda->id_venda,
                'numero' => $venda->numero_venda,
                'valor_liquido' => (float) $venda->valor_total,
                'valor_bruto' => (float) $venda->valor_subtotal,
                'valor_desconto' => (float) $venda->valor_desconto,
                'observacoes' => $venda->observacoes,
                'data_venda' => $venda->data_venda,
            ],
            'items' => $items,
            'cliente' => $cliente,
            'formaPagamentoNome' => $formaPagamentoNome,
            'pagamentos' => $pagamentos,
            'empresa' => $empresa,
        ]);
    }

    public function getRecentSales()
    {
        $userId = auth()->id();
        $vendas = Venda::with(['cliente'])
            ->where('id_usuario', $userId)
            ->orderBy('data_venda', 'desc')
            ->limit(20)
            ->get()
            ->map(function ($v) {
                $pgs = DB::table('pagamentos_venda')
                    ->join('formas_pagamento', 'pagamentos_venda.id_forma_pagamento', '=', 'formas_pagamento.id_forma_pagamento')
                    ->where('pagamentos_venda.id_venda', $v->id_venda)
                    ->select('formas_pagamento.nome')
                    ->get();
                $formaNome = null;
                if ($pgs->count() === 1) {
                    $formaNome = $pgs->first()->nome;
                } elseif ($pgs->count() > 1) {
                    $formaNome = 'Múltiplos';
                }

                return [
                    'id_venda' => $v->id_venda,
                    'numero_venda' => $v->numero_venda,
                    'valor_total' => (float) $v->valor_total,
                    'valor_subtotal' => (float) $v->valor_subtotal,
                    'valor_desconto' => (float) $v->valor_desconto,
                    'data_venda' => $v->data_venda,
                    'status' => $v->status,
                    'cliente' => $v->cliente ? $v->cliente->nome : null,
                    'forma_pagamento' => $formaNome,
                ];
            });

        return response()->json(['vendas' => $vendas]);
    }

    /**
     * Store a new sale header.
     */
    public function storeSale(Request $request)
    {
        $idPdv = 1; // Fixo por enquanto — mesmo valor usado ao criar a Venda abaixo.

        if (\App\Http\Controllers\CaixaSessaoController::modoSessaoAtivo()
            && ! \App\Models\CaixaSessao::where('id_pdv', $idPdv)->where('status', 'aberta')->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Abra o caixa antes de iniciar uma venda.',
                'caixa_fechado' => true,
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Gerar número da venda
            $anoAtual = date('Y');
            $ultimaVenda = Venda::where('numero_venda', 'like', $anoAtual.'%')
                ->orderBy('numero_venda', 'desc')
                ->first();

            $proximoNumero = 1;
            if ($ultimaVenda && $ultimaVenda->numero_venda) {
                $ultimoNumero = (int) substr($ultimaVenda->numero_venda, 4);
                $proximoNumero = $ultimoNumero + 1;
            }

            $numeroVenda = $anoAtual.str_pad($proximoNumero, 6, '0', STR_PAD_LEFT);

            // Criar a venda com status 'aberta' e valores zerados
            $venda = Venda::create([
                'numero_venda' => $numeroVenda,
                'id_usuario' => auth()->id(),
                'id_pdv' => $idPdv,
                'valor_subtotal' => 0,
                'valor_desconto' => 0,
                'valor_acrescimo' => 0,
                'valor_total' => 0,
                'status' => 'aberta',
                'data_venda' => now(),
            ]);

            DB::commit();

            Log::info('Venda header created:', ['venda_id' => $venda->id_venda, 'numero_venda' => $venda->numero_venda]);

            return response()->json([
                'success' => true,
                'message' => "Venda #{$venda->numero_venda} iniciada com sucesso!",
                'venda' => $venda->only(['id_venda', 'numero_venda', 'status', 'valor_total']),
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('PDV Store Sale Error:', ['message' => $e->getMessage()]);

            return response()->json(['success' => false, 'message' => 'Erro ao iniciar a venda.'], 500);
        }
    }

    /**
     * Finalizar uma venda em aberto, incluindo seus itens.
     */
    public function finalizarVenda(Request $request)
    {
        try {
            $validated = $request->validate([
                'id_venda' => 'required|exists:vendas,id_venda',
                'id_cliente' => 'nullable|exists:clientes,id_cliente',
                'pagamentos' => 'required|array|min:1',
                'pagamentos.*.id_forma_pagamento' => 'required|exists:formas_pagamento,id_forma_pagamento',
                'pagamentos.*.valor_pagamento' => 'required|numeric|min:0.01',
                'pagamentos.*.numero_parcelas' => 'nullable|integer|min:1',
                'observacoes' => 'nullable|string|max:500',
                'items' => 'required|array|min:1',
                'items.*.product.id' => 'required|exists:produtos,id_produto',
                'items.*.product.price' => 'required|numeric|min:0',
                'items.*.quantity' => 'required|numeric|min:0.01',
                'items.*.desconto_item' => 'nullable|numeric|min:0',
            ]);

            DB::beginTransaction();

            $venda = Venda::where('id_venda', $validated['id_venda'])->where('status', 'aberta')->firstOrFail();

            // Apagar itens antigos para garantir consistência
            $venda->itens()->delete();

            $valorSubtotal = 0.0;
            $valorDescontoItens = 0.0;

            // Criar novos itens e calcular totais
            foreach ($validated['items'] as $item) {
                $precoUnitario = (float) $item['product']['price'];
                $quantidade = (float) $item['quantity'];
                $descontoItem = isset($item['desconto_item']) ? (float) $item['desconto_item'] : 0.0;

                $valorBrutoItem = $precoUnitario * $quantidade;
                $valorTotalItem = max(0, $valorBrutoItem - $descontoItem);

                ItemVenda::create([
                    'id_venda' => $venda->id_venda,
                    'id_produto' => $item['product']['id'],
                    'quantidade' => $quantidade,
                    'preco_unitario' => $precoUnitario,
                    'desconto_item' => $descontoItem,
                    'valor_total_item' => $valorTotalItem,
                ]);

                $valorSubtotal += $valorBrutoItem;
                $valorDescontoItens += $descontoItem;
            }

            $valorTotal = max(0.0, $valorSubtotal - $valorDescontoItens);

            $somaPagamentos = collect($validated['pagamentos'])->sum(function ($p) {
                return (float) $p['valor_pagamento'];
            });

            if (abs($somaPagamentos - $valorTotal) > 0.01) {
                DB::rollback();

                return response()->json([
                    'success' => false,
                    'message' => 'A soma dos pagamentos difere do total da venda.',
                ], 422);
            }

            // Atualizar a venda com os totais e dados de finalização
            $venda->update([
                'id_cliente' => $validated['id_cliente'] ?? null,
                'observacoes' => $validated['observacoes'] ?? null,
                'valor_subtotal' => $valorSubtotal,
                'valor_desconto' => $valorDescontoItens,
                'valor_total' => $valorTotal,
                'status' => 'finalizada',
            ]);

            foreach ($validated['pagamentos'] as $p) {
                $numeroParcelas = isset($p['numero_parcelas']) ? (int) $p['numero_parcelas'] : 1;
                $valorParcela = $numeroParcelas > 0 ? ((float) $p['valor_pagamento'] / $numeroParcelas) : (float) $p['valor_pagamento'];
                DB::table('pagamentos_venda')->insert([
                    'id_venda' => $venda->id_venda,
                    'id_forma_pagamento' => $p['id_forma_pagamento'],
                    'valor_pagamento' => (float) $p['valor_pagamento'],
                    'numero_parcelas' => $numeroParcelas,
                    'valor_parcela' => $valorParcela,
                    'numero_transacao' => null,
                    'numero_autorizacao' => null,
                    'status_pagamento' => 'aprovado',
                    'data_pagamento' => now(),
                    'observacoes' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::commit();

            Log::info('Venda finalizada:', [
                'venda_id' => $venda->id_venda,
                'numero_venda' => $venda->numero_venda,
            ]);

            // NFC-e best-effort: a venda já está finalizada e commitada — uma
            // falha aqui nunca desfaz a venda, só avisa o operador do balcão.
            $fiscal = $this->emitirNfceBalcao($venda->fresh());

            return response()->json([
                'success' => true,
                'message' => "Venda #{$venda->numero_venda} finalizada com sucesso!",
                'venda' => $venda->fresh(),
                'fiscal' => $fiscal,
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollback();
            Log::error('Erro de validação ao finalizar venda:', ['errors' => $e->errors(), 'request' => $request->all()]);

            return response()->json(['success' => false, 'message' => 'Dados inválidos: '.implode(', ', Arr::flatten($e->errors()))], 422);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Erro ao finalizar venda:', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);

            return response()->json(['success' => false, 'message' => 'Erro interno ao finalizar a venda.'], 500);
        }
    }

    /**
     * Emite a NFC-e da venda de balcão. Best-effort: nunca desfaz a venda —
     * em caso de erro, só loga e devolve o motivo pro operador decidir (ex.:
     * reimprimir depois, ou seguir sem cupom fiscal se o cliente concordar).
     * Sem tela de revisão fiscal dedicada pro balcão ainda (fica pro backlog);
     * o registro do erro fica só no log + na resposta desta requisição.
     */
    private function emitirNfceBalcao(Venda $venda): array
    {
        if ($venda->nfce_chave) {
            return ['emitido' => true, 'chave' => $venda->nfce_chave, 'danfce_url' => $venda->nfce_danfce_url];
        }

        try {
            $venda->loadMissing('itens');

            $produtos = Produto::whereIn('id_produto', $venda->itens->pluck('id_produto')->unique())
                ->get()->keyBy('id_produto');

            $itens = $venda->itens->map(fn ($item) => [
                'nome' => $produtos->get($item->id_produto)?->nome ?? 'Item',
                'ncm' => $produtos->get($item->id_produto)?->ncm,
                'unidade' => $produtos->get($item->id_produto)?->unidade,
                'quantidade' => (float) $item->quantidade,
                'preco_unitario' => (float) $item->preco_unitario,
                'codigo' => $produtos->get($item->id_produto)?->codigo_interno ?? (string) $item->id_produto,
            ])->values()->all();

            $pagamentos = DB::table('pagamentos_venda')
                ->join('formas_pagamento', 'formas_pagamento.id_forma_pagamento', '=', 'pagamentos_venda.id_forma_pagamento')
                ->where('pagamentos_venda.id_venda', $venda->id_venda)
                ->get(['formas_pagamento.tipo', 'pagamentos_venda.valor_pagamento'])
                ->map(fn ($l) => ['tipo' => $l->tipo, 'valor' => (float) $l->valor_pagamento])
                ->all();

            $cliente = $venda->id_cliente ? Cliente::find($venda->id_cliente) : null;

            $resultado = app(NfceService::class)->emitir([
                'id_pdv' => $venda->id_pdv,
                'natOp' => 'Venda',
                'cliente' => $cliente ? ['nome' => $cliente->nome, 'cpf' => $cliente->cpf_cnpj] : null,
                'itens' => $itens,
                'pagamentos' => $pagamentos ?: [['tipo' => 'outros', 'valor' => (float) $venda->valor_total]],
            ]);

            $danfceUrl = null;
            if (! empty($resultado['danfce_pdf'])) {
                $caminho = "notas-fiscais/nfce-{$venda->numero_venda}.pdf";
                Storage::disk('public')->put($caminho, $resultado['danfce_pdf']);
                $danfceUrl = Storage::disk('public')->url($caminho);
            }

            $venda->update([
                'nfce_chave' => $resultado['chave'],
                'nfce_numero' => (string) $resultado['numero'],
                'nfce_danfce_url' => $danfceUrl,
            ]);

            return ['emitido' => true, 'chave' => $resultado['chave'], 'danfce_url' => $danfceUrl];
        } catch (Throwable $e) {
            Log::warning('PDVController: emissão de NFC-e do balcão falhou.', [
                'venda_id' => $venda->id_venda,
                'erro' => $e->getMessage(),
            ]);

            return ['emitido' => false, 'erro' => $e->getMessage()];
        }
    }

    /**
     * Cancelar uma venda em aberto
     */
    public function cancelarVenda(Request $request)
    {
        try {
            $validated = $request->validate([
                'id_venda' => 'required|exists:vendas,id_venda',
                'motivo' => 'nullable|string|max:500',
            ]);

            DB::beginTransaction();

            // Buscar a venda: permitir cancelar 'aberta' ou 'finalizada'
            $venda = Venda::where('id_venda', $validated['id_venda'])
                ->whereIn('status', ['aberta', 'finalizada'])
                ->firstOrFail();

            // Atualizar a venda para cancelada
            $venda->update([
                'status' => 'cancelada',
                'observacoes' => 'Venda cancelada. Motivo: '.($validated['motivo'] ?? 'Não informado'),
            ]);

            DB::commit();

            Log::info('Venda cancelada:', [
                'venda_id' => $venda->id_venda,
                'numero_venda' => $venda->numero_venda,
                'motivo' => $validated['motivo'] ?? 'Não informado',
            ]);

            return response()->json([
                'success' => true,
                'message' => "Venda #{$venda->numero_venda} cancelada com sucesso!",
            ]);

        } catch (\Exception $e) {
            DB::rollback();

            Log::error('Erro ao cancelar venda:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao cancelar venda: '.$e->getMessage(),
            ], 500);
        }
    }

    public function getSalesByProduct($id)
    {
        $rows = DB::table('itens_venda as iv')
            ->join('vendas as v', 'v.id_venda', '=', 'iv.id_venda')
            ->where('iv.id_produto', $id)
            ->select('v.id_venda', 'v.numero_venda', 'v.valor_total', 'v.status', 'v.data_venda')
            ->orderBy('v.data_venda', 'desc')
            ->get();
        $data = $rows->map(function ($r) {
            return [
                'id_venda' => $r->id_venda,
                'numero_venda' => $r->numero_venda,
                'valor_liquido' => (float) $r->valor_total,
                'status' => $r->status,
                'data_venda' => $r->data_venda,
            ];
        });

        return response()->json(['vendas' => $data]);
    }

    public function getSaleItems($id)
    {
        $items = DB::table('itens_venda as iv')
            ->join('produtos as p', 'p.id_produto', '=', 'iv.id_produto')
            ->where('iv.id_venda', $id)
            ->select('iv.id_item', 'iv.id_produto', 'p.nome as produto_nome', 'iv.quantidade', 'iv.preco_unitario', 'iv.desconto_item', 'iv.valor_total_item')
            ->get()
            ->map(function ($i) {
                return [
                    'id_item' => $i->id_item,
                    'id_produto' => $i->id_produto,
                    'produto_nome' => $i->produto_nome,
                    'quantidade' => (float) $i->quantidade,
                    'preco_unitario' => (float) $i->preco_unitario,
                    'desconto_item' => (float) ($i->desconto_item ?? 0),
                    'valor_total_item' => (float) ($i->valor_total_item ?? 0),
                ];
            });
        $venda = Venda::findOrFail($id);

        return response()->json([
            'venda' => [
                'id_venda' => $venda->id_venda,
                'numero_venda' => $venda->numero_venda,
                'valor_total' => (float) $venda->valor_total,
                'status' => $venda->status,
            ],
            'items' => $items,
        ]);
    }

    public function processDevolucao(Request $request, $id)
    {
        $validated = $request->validate([
            'itens' => 'required|array|min:1',
            'itens.*' => 'required|exists:itens_venda,id_item',
        ]);
        $orig = Venda::with('itens')->findOrFail($id);
        $idsDevolver = collect($validated['itens'])->map(fn ($x) => (int) $x)->all();
        $itensRestantes = $orig->itens->filter(function ($iv) use ($idsDevolver) {
            return ! in_array($iv->id_item, $idsDevolver);
        })->map(function ($iv) {
            return [
                'id_item' => $iv->id_item,
                'id_produto' => $iv->id_produto,
                'quantidade' => (float) $iv->quantidade,
                'preco_unitario' => (float) $iv->preco_unitario,
                'desconto_item' => (float) ($iv->desconto_item ?? 0),
                'valor_total_item' => (float) ($iv->valor_total_item ?? ((float) $iv->preco_unitario * (float) $iv->quantidade)),
            ];
        });

        return response()->json([
            'success' => true,
            'venda_original' => [
                'id_venda' => $orig->id_venda,
                'numero_venda' => $orig->numero_venda,
                'valor_total' => (float) $orig->valor_total,
                'status' => $orig->status,
            ],
            'itens_restantes' => $itensRestantes,
            'ids_devolver' => $idsDevolver,
        ]);
    }

    public function finalizarTroca(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'novos_itens' => 'nullable|array',
                'novos_itens.*.id_produto' => 'required|exists:produtos,id_produto',
                'novos_itens.*.quantidade' => 'required|numeric|min:0.01',
                'novos_itens.*.preco_unitario' => 'required|numeric|min:0',
                'pagamentos' => 'nullable|array',
                'pagamentos.*.id_forma_pagamento' => 'required|exists:formas_pagamento,id_forma_pagamento',
                'pagamentos.*.valor_pagamento' => 'required|numeric|min:0.01',
                'pagamentos.*.numero_parcelas' => 'nullable|integer|min:1',
                'observacoes' => 'nullable|string|max:500',
                'valor_venda_anterior' => 'required|numeric|min:0',
            ]);
            DB::beginTransaction();
            $venda = Venda::where('id_venda', $id)->where('status', 'aberta')->firstOrFail();
            $subtotal = (float) ($venda->valor_subtotal ?? 0);
            $desconto = (float) ($venda->valor_desconto ?? 0);
            if (! empty($validated['novos_itens'])) {
                foreach ($validated['novos_itens'] as $ni) {
                    $valorBruto = (float) $ni['preco_unitario'] * (float) $ni['quantidade'];
                    ItemVenda::create([
                        'id_venda' => $venda->id_venda,
                        'id_produto' => (int) $ni['id_produto'],
                        'quantidade' => (float) $ni['quantidade'],
                        'preco_unitario' => (float) $ni['preco_unitario'],
                        'desconto_item' => 0,
                        'valor_total_item' => $valorBruto,
                    ]);
                    $subtotal += $valorBruto;
                }
            }
            $total = max(0.0, $subtotal - $desconto);
            $valorAnterior = (float) ($validated['valor_venda_anterior'] ?? 0);
            $diferenca = $total - $valorAnterior;

            $somaPagamentos = collect($validated['pagamentos'] ?? [])->sum(function ($p) {
                return (float) $p['valor_pagamento'];
            });
            if ($diferenca > 0) {
                if (abs($somaPagamentos - $diferenca) > 0.01) {
                    DB::rollback();

                    return response()->json(['success' => false, 'message' => 'Pagamentos não fecham a diferença'], 422);
                }
            } else {
                $somaPagamentos = 0.0;
            }
            $venda->update([
                'valor_subtotal' => $subtotal,
                'valor_total' => $total,
                'status' => 'finalizada',
                'observacoes' => $validated['observacoes'] ?? null,
            ]);
            if ($diferenca > 0 && ! empty($validated['pagamentos'])) {
                foreach ($validated['pagamentos'] as $p) {
                    $np = isset($p['numero_parcelas']) ? (int) $p['numero_parcelas'] : 1;
                    $vp = $np > 0 ? ((float) $p['valor_pagamento'] / $np) : (float) $p['valor_pagamento'];
                    DB::table('pagamentos_venda')->insert([
                        'id_venda' => $venda->id_venda,
                        'id_forma_pagamento' => $p['id_forma_pagamento'],
                        'valor_pagamento' => (float) $p['valor_pagamento'],
                        'numero_parcelas' => $np,
                        'valor_parcela' => $vp,
                        'numero_transacao' => null,
                        'numero_autorizacao' => null,
                        'status_pagamento' => 'aprovado',
                        'data_pagamento' => now(),
                        'observacoes' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
            DB::commit();

            return response()->json([
                'success' => true,
                'venda' => $venda->fresh(),
                'diferenca' => $diferenca,
                'valor_restituir' => $diferenca < 0 ? abs($diferenca) : 0.0,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollback();

            return response()->json(['success' => false, 'message' => 'Dados inválidos'], 422);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json(['success' => false, 'message' => 'Erro interno'], 500);
        }
    }

    public function finalizarDevolucaoTroca(Request $request, $id)
    {
        $validated = $request->validate([
            'itens_devolver' => 'required|array|min:1',
            'itens_devolver.*' => 'required|exists:itens_venda,id_item',
            'novos_itens' => 'nullable|array',
            'novos_itens.*.id_produto' => 'required|exists:produtos,id_produto',
            'novos_itens.*.quantidade' => 'required|numeric|min:0.01',
            'novos_itens.*.preco_unitario' => 'required|numeric|min:0',
            'pagamentos' => 'nullable|array',
            'pagamentos.*.id_forma_pagamento' => 'required|exists:formas_pagamento,id_forma_pagamento',
            'pagamentos.*.valor_pagamento' => 'required|numeric|min:0.01',
            'pagamentos.*.numero_parcelas' => 'nullable|integer|min:1',
            'observacoes' => 'nullable|string|max:500',
        ]);
        DB::beginTransaction();
        $orig = Venda::with('itens')->findOrFail($id);
        $idsDev = collect($validated['itens_devolver'])->map(fn ($x) => (int) $x)->all();
        $itensRestantes = $orig->itens->filter(function ($iv) use ($idsDev) {
            return ! in_array($iv->id_item, $idsDev);
        });
        $novosItensPayload = $validated['novos_itens'] ?? [];

        if ($itensRestantes->count() === 0 && (empty($novosItensPayload) || count($novosItensPayload) === 0)) {
            $orig->update(['status' => 'devolvida']);
            DB::commit();

            return response()->json([
                'success' => true,
                'venda_original' => [
                    'id_venda' => $orig->id_venda,
                    'numero_venda' => $orig->numero_venda,
                    'valor_total' => (float) $orig->valor_total,
                    'status' => 'devolvida',
                ],
                'nova_venda' => null,
                'diferenca' => -(float) ($orig->valor_total ?? 0),
                'valor_restituir' => (float) ($orig->valor_total ?? 0),
            ]);
        }

        $anoAtual = date('Y');
        $ultimaVenda = Venda::where('numero_venda', 'like', $anoAtual.'%')
            ->orderBy('numero_venda', 'desc')
            ->first();
        $proximoNumero = 1;
        if ($ultimaVenda && $ultimaVenda->numero_venda) {
            $ultimoNumero = (int) substr($ultimaVenda->numero_venda, 4);
            $proximoNumero = $ultimoNumero + 1;
        }
        $numeroVendaNova = $anoAtual.str_pad($proximoNumero, 6, '0', STR_PAD_LEFT);

        $nova = Venda::create([
            'numero_venda' => $numeroVendaNova,
            'id_usuario' => $orig->id_usuario,
            'id_pdv' => $orig->id_pdv,
            'id_cliente' => $orig->id_cliente,
            'valor_subtotal' => 0,
            'valor_desconto' => 0,
            'valor_acrescimo' => 0,
            'valor_total' => 0,
            'status' => 'aberta',
            'data_venda' => now(),
        ]);
        $subtotal = 0.0;
        $desconto = 0.0;
        foreach ($itensRestantes as $iv) {
            ItemVenda::create([
                'id_venda' => $nova->id_venda,
                'id_produto' => $iv->id_produto,
                'quantidade' => $iv->quantidade,
                'preco_unitario' => $iv->preco_unitario,
                'desconto_item' => $iv->desconto_item,
                'valor_total_item' => $iv->valor_total_item,
            ]);
            $subtotal += (float) $iv->preco_unitario * (float) $iv->quantidade;
            $desconto += (float) ($iv->desconto_item ?? 0);
        }
        if (! empty($novosItensPayload)) {
            foreach ($novosItensPayload as $ni) {
                $valorBruto = (float) $ni['preco_unitario'] * (float) $ni['quantidade'];
                ItemVenda::create([
                    'id_venda' => $nova->id_venda,
                    'id_produto' => (int) $ni['id_produto'],
                    'quantidade' => (float) $ni['quantidade'],
                    'preco_unitario' => (float) $ni['preco_unitario'],
                    'desconto_item' => 0,
                    'valor_total_item' => $valorBruto,
                ]);
                $subtotal += $valorBruto;
            }
        }
        $total = max(0.0, $subtotal - $desconto);
        $valorAnterior = (float) ($orig->valor_total ?? 0);
        $diferenca = $total - $valorAnterior;
        $somaPagamentos = collect($validated['pagamentos'] ?? [])->sum(function ($p) {
            return (float) $p['valor_pagamento'];
        });
        if ($diferenca > 0) {
            if (abs($somaPagamentos - $diferenca) > 0.01) {
                DB::rollback();

                return response()->json(['success' => false, 'message' => 'Pagamentos não fecham a diferença'], 422);
            }
        } else {
            $somaPagamentos = 0.0;
        }
        $nova->update([
            'valor_subtotal' => $subtotal,
            'valor_desconto' => $desconto,
            'valor_total' => $total,
            'status' => 'finalizada',
            'observacoes' => $validated['observacoes'] ?? null,
        ]);
        if ($diferenca > 0 && ! empty($validated['pagamentos'])) {
            foreach ($validated['pagamentos'] as $p) {
                $np = isset($p['numero_parcelas']) ? (int) $p['numero_parcelas'] : 1;
                $vp = $np > 0 ? ((float) $p['valor_pagamento'] / $np) : (float) $p['valor_pagamento'];
                DB::table('pagamentos_venda')->insert([
                    'id_venda' => $nova->id_venda,
                    'id_forma_pagamento' => $p['id_forma_pagamento'],
                    'valor_pagamento' => (float) $p['valor_pagamento'],
                    'numero_parcelas' => $np,
                    'valor_parcela' => $vp,
                    'numero_transacao' => null,
                    'numero_autorizacao' => null,
                    'status_pagamento' => 'aprovado',
                    'data_pagamento' => now(),
                    'observacoes' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
        $orig->update(['status' => 'devolvida']);
        DB::table('vendas_devolucao')->insert([
            'id_origem_venda' => $orig->id_venda,
            'id_nova_venda' => $nova->id_venda,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::commit();

        return response()->json([
            'success' => true,
            'venda_original' => [
                'id_venda' => $orig->id_venda,
                'numero_venda' => $orig->numero_venda,
                'valor_total' => (float) $orig->valor_total,
                'status' => $orig->status,
            ],
            'nova_venda' => [
                'id_venda' => $nova->id_venda,
                'numero_venda' => $nova->numero_venda,
                'valor_total' => (float) $nova->valor_total,
                'status' => $nova->status,
            ],
            'diferenca' => $diferenca,
            'valor_restituir' => $diferenca < 0 ? abs($diferenca) : 0.0,
        ]);
    }

    public function getActiveFormasPagamento()
    {
        $rows = FormaPagamento::where('ativo', true)
            ->orderBy('ordem_exibicao')
            ->orderBy('nome')
            ->get()
            ->map(function ($f) {
                return [
                    'id_forma_pagamento' => $f->id_forma_pagamento,
                    'nome' => $f->nome,
                    'tipo' => $f->tipo,
                ];
            });

        return response()->json(['formas_pagamento' => $rows]);
    }

    public function getCsrfToken()
    {
        return response()->json(['csrf_token' => csrf_token()]);
    }
}
