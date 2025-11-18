<?php

namespace App\Http\Controllers;

use App\Models\Produto;
use App\Models\Categoria;
use App\Models\Venda;
use App\Models\ItemVenda;
use App\Models\Cliente;
use App\Models\FormaPagamento;
use App\Models\ConfiguracaoEmpresa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Cache;

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
                'image' => null // Por enquanto sem imagem
            ];
        });

        $categories = $categorias->map(function ($categoria) {
            return [
                'id' => $categoria->id_categoria,
                'name' => $categoria->nome,
                'description' => $categoria->descricao,
                'color' => $categoria->cor
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
                'image' => null // Por enquanto sem imagem
            ];
        });

        return response()->json(['products' => $products]);
    }

    public function getCupomDados($id)
    {
        $venda = Venda::with(['itens.produto', 'cliente', 'formaPagamento'])->findOrFail($id);

        $items = $venda->itens->map(function ($item) {
            return [
                'product' => [
                    'id' => $item->id_produto,
                    'name' => optional($item->produto)->nome,
                    'price' => (float) $item->preco_unitario,
                ],
                'quantity' => (float) $item->quantidade,
                'desconto_item' => (float) ($item->desconto_item ?? 0),
                'valor_total_item' => (float) ($item->valor_total_item ?? ((float)$item->preco_unitario * (float)$item->quantidade)),
            ];
        });

        $cliente = $venda->cliente ? [
            'id_cliente' => $venda->cliente->id_cliente,
            'nome' => $venda->cliente->nome,
            'email' => $venda->cliente->email,
            'telefone' => $venda->cliente->telefone,
            'pontos_fidelidade' => (float) ($venda->cliente->pontos_fidelidade ?? 0),
        ] : null;

        $formaPagamentoNome = $venda->formaPagamento ? $venda->formaPagamento->nome : null;

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
            'empresa' => $empresa,
        ]);
    }

    public function getRecentSales()
    {
        $userId = auth()->id();
        $vendas = Venda::with(['cliente', 'formaPagamento'])
            ->where('id_usuario', $userId)
            ->orderBy('data_venda', 'desc')
            ->limit(20)
            ->get()
            ->map(function ($v) {
                return [
                    'id_venda' => $v->id_venda,
                    'numero_venda' => $v->numero_venda,
                    'valor_total' => (float) $v->valor_total,
                    'valor_subtotal' => (float) $v->valor_subtotal,
                    'valor_desconto' => (float) $v->valor_desconto,
                    'data_venda' => $v->data_venda,
                    'status' => $v->status,
                    'cliente' => $v->cliente ? $v->cliente->nome : null,
                    'forma_pagamento' => $v->formaPagamento ? $v->formaPagamento->nome : null,
                ];
            });

        return response()->json(['vendas' => $vendas]);
    }

    /**
     * Store a new sale header.
     */
    public function storeSale(Request $request)
    {
        try {
            \DB::beginTransaction();
            
            // Gerar número da venda
            $anoAtual = date('Y');
            $ultimaVenda = Venda::where('numero_venda', 'like', $anoAtual . '%')
                ->orderBy('numero_venda', 'desc')
                ->first();
            
            $proximoNumero = 1;
            if ($ultimaVenda && $ultimaVenda->numero_venda) {
                $ultimoNumero = (int) substr($ultimaVenda->numero_venda, 4);
                $proximoNumero = $ultimoNumero + 1;
            }
            
            $numeroVenda = $anoAtual . str_pad($proximoNumero, 6, '0', STR_PAD_LEFT);

            // Criar a venda com status 'aberta' e valores zerados
            $venda = Venda::create([
                'numero_venda' => $numeroVenda,
                'id_usuario' => auth()->id(),
                'id_pdv' => 1, // Fixo por enquanto
                'valor_subtotal' => 0,
                'valor_desconto' => 0,
                'valor_acrescimo' => 0,
                'valor_total' => 0,
                'status' => 'aberta',
                'data_venda' => now(),
            ]);
            
            \DB::commit();
            
            \Log::info('Venda header created:', ['venda_id' => $venda->id_venda, 'numero_venda' => $venda->numero_venda]);
            
            return response()->json([
                'success' => true,
                'message' => "Venda #{$venda->numero_venda} iniciada com sucesso!",
                'venda' => $venda->only(['id_venda', 'numero_venda', 'status', 'valor_total'])
            ]);

        } catch (\Exception $e) {
            \DB::rollback();
            \Log::error('PDV Store Sale Error:', ['message' => $e->getMessage()]);
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
                'id_forma_pagamento' => 'required|exists:formas_pagamento,id_forma_pagamento',
                'observacoes' => 'nullable|string|max:500',
                'items' => 'required|array|min:1',
                'items.*.product.id' => 'required|exists:produtos,id_produto',
                'items.*.product.price' => 'required|numeric|min:0',
                'items.*.quantity' => 'required|numeric|min:0.01',
                'items.*.desconto_item' => 'nullable|numeric|min:0',
            ]);

            \DB::beginTransaction();

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

            // Atualizar a venda com os totais e dados de finalização
            $venda->update([
                'id_cliente' => $validated['id_cliente'] ?? null,
                'id_forma_pagamento' => $validated['id_forma_pagamento'],
                'observacoes' => $validated['observacoes'] ?? null,
                'valor_subtotal' => $valorSubtotal,
                'valor_desconto' => $valorDescontoItens,
                'valor_total' => $valorTotal,
                'status' => 'finalizada', // Triggers de estoque e caixa serão ativados aqui
            ]);

            \DB::commit();

            \Log::info('Venda finalizada:', [
                'venda_id' => $venda->id_venda,
                'numero_venda' => $venda->numero_venda,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Venda #{$venda->numero_venda} finalizada com sucesso!",
                'venda' => $venda->fresh()
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            \DB::rollback();
            \Log::error('Erro de validação ao finalizar venda:', ['errors' => $e->errors(), 'request' => $request->all()]);
            return response()->json(['success' => false, 'message' => 'Dados inválidos: ' . implode(', ', Arr::flatten($e->errors()))], 422);
        } catch (\Exception $e) {
            \DB::rollback();
            \Log::error('Erro ao finalizar venda:', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Erro interno ao finalizar a venda.'], 500);
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

            \DB::beginTransaction();

            // Buscar a venda: permitir cancelar 'aberta' ou 'finalizada'
            $venda = Venda::where('id_venda', $validated['id_venda'])
                          ->whereIn('status', ['aberta', 'finalizada'])
                          ->firstOrFail();

            // Atualizar a venda para cancelada
            $venda->update([
                'status' => 'cancelada',
                'observacoes' => 'Venda cancelada. Motivo: ' . ($validated['motivo'] ?? 'Não informado'),
            ]);

            \DB::commit();

            \Log::info('Venda cancelada:', [
                'venda_id' => $venda->id_venda,
                'numero_venda' => $venda->numero_venda,
                'motivo' => $validated['motivo'] ?? 'Não informado'
            ]);

            return response()->json([
                'success' => true,
                'message' => "Venda #{$venda->numero_venda} cancelada com sucesso!",
            ]);

        } catch (\Exception $e) {
            \DB::rollback();
            
            \Log::error('Erro ao cancelar venda:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao cancelar venda: ' . $e->getMessage()
            ], 500);
        }
    }
}