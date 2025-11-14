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

    /**
     * Store a new sale.
     */
    public function storeSale(Request $request)
    {
        // Log dos dados recebidos para debug
        \Log::info('PDV Sale Request Data:', [
            'all_data' => $request->all(),
            'items' => $request->input('items'),
            'total' => $request->input('total'),
            'paymentMethod' => $request->input('paymentMethod'),
        ]);

        try {
            // Validação dos dados recebidos
            $validated = $request->validate([
                'items' => 'required|array|min:1',
                'items.*.product' => 'required',
                'items.*.product.id' => 'required',
                'items.*.product.price' => 'required|numeric|min:0',
                'items.*.quantity' => 'required|numeric|min:0.01',
                'total' => 'required|numeric|min:0',
                'paymentMethod' => 'required|string|in:dinheiro,cartao_credito,cartao_debito,pix,transferencia,cheque,pendente',
                'customer' => 'nullable|string',
                'discount' => 'nullable|numeric|min:0',
            ]);

            \Log::info('PDV Sale Validation Passed:', $validated);

            // Implementar a lógica real de salvamento da venda
            \DB::beginTransaction();
            
            // Gerar número da venda manualmente (já que a trigger não está funcionando)
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
            
            // Criar a venda com status 'aberta'
            $venda = Venda::create([
                'numero_venda' => $numeroVenda,
                'id_cliente' => null, // Será definido no modal de finalização
                'id_usuario' => auth()->id(),
                'id_pdv' => 1, // Por enquanto PDV fixo
                'valor_subtotal' => $validated['total'],
                'valor_desconto' => $validated['discount'] ?? 0,
                'valor_acrescimo' => 0,
                'valor_total' => $validated['total'],
                'pontos_fidelidade_utilizados' => 0,
                'pontos_fidelidade_gerados' => 0,
                'status' => 'aberta', // Mudança aqui: criando como 'aberta' (valor correto do ENUM)
                'observacoes' => null, // Observações serão definidas na finalização
                'data_venda' => now(),
            ]);
            
            \Log::info('Venda criada:', ['venda_id' => $venda->id_venda, 'numero_venda' => $venda->numero_venda]);
            
            // Criar os itens da venda
            foreach ($validated['items'] as $item) {
                $valorTotalItem = $item['product']['price'] * $item['quantity'];
                
                ItemVenda::create([
                    'id_venda' => $venda->id_venda,
                    'id_produto' => $item['product']['id'],
                    'quantidade' => $item['quantity'],
                    'preco_unitario' => $item['product']['price'],
                    'desconto_item' => 0,
                    'valor_total_item' => $valorTotalItem,
                    'observacoes' => null,
                ]);
                
                \Log::info('Item venda criado:', [
                    'produto_id' => $item['product']['id'],
                    'quantidade' => $item['quantity'],
                    'valor_total' => $valorTotalItem
                ]);
            }
            
            \DB::commit();
            
            \Log::info('PDV Sale Success:', ['venda_id' => $venda->id_venda, 'numero_venda' => $venda->numero_venda]);
            
            // Retorna resposta JSON com os dados da venda criada
            return response()->json([
                'success' => true,
                'message' => "Venda #{$venda->numero_venda} criada com sucesso! Agora finalize a venda no modal.",
                'venda' => [
                    'id_venda' => $venda->id_venda,
                    'numero_venda' => $venda->numero_venda,
                    'valor_subtotal' => $venda->valor_subtotal,
                    'valor_desconto' => $venda->valor_desconto,
                    'valor_acrescimo' => $venda->valor_acrescimo,
                    'valor_total' => $venda->valor_total,
                    'status' => $venda->status,
                    'data_venda' => $venda->data_venda
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            \DB::rollback();
            
            \Log::error('PDV Sale Validation Failed:', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            
            // Retorna erro compatível com Inertia.js
            return back()->withErrors([
                'sale' => 'Dados inválidos para finalizar a venda: ' . implode(', ', Arr::flatten($e->errors()))
            ]);
            
        } catch (\Exception $e) {
            \DB::rollback();
            
            \Log::error('PDV Sale Error:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            
            // Retorna erro compatível com Inertia.js
            return back()->withErrors([
                'sale' => 'Erro interno do servidor. Tente novamente.'
            ]);
        }
    }

    /**
     * Finalizar uma venda em aberto
     */
    public function finalizarVenda(Request $request)
    {
        try {
            $validated = $request->validate([
                'id_venda' => 'required|exists:vendas,id_venda',
                'id_cliente' => 'nullable|exists:clientes,id_cliente',
                'id_forma_pagamento' => 'required|exists:formas_pagamento,id_forma_pagamento',
                'pontos_fidelidade_utilizados' => 'nullable|numeric|min:0',
                'observacoes' => 'nullable|string|max:500',
            ]);

            \DB::beginTransaction();

            // Buscar a venda
            $venda = Venda::where('id_venda', $validated['id_venda'])
                          ->where('status', 'aberta')
                          ->firstOrFail();

            // Atualizar a venda para finalizada
            $venda->update([
                'id_cliente' => $validated['id_cliente'] ?? null,
                'id_forma_pagamento' => $validated['id_forma_pagamento'],
                'pontos_fidelidade_utilizados' => $validated['pontos_fidelidade_utilizados'] ?? 0,
                'observacoes' => $validated['observacoes'] ?? null,
                'status' => 'finalizada', // Mudança de status que ativará os triggers
            ]);

            \DB::commit();

            \Log::info('Venda finalizada:', [
                'venda_id' => $venda->id_venda,
                'numero_venda' => $venda->numero_venda,
                'forma_pagamento' => $validated['id_forma_pagamento']
            ]);

            return response()->json([
                'success' => true,
                'message' => "Venda #{$venda->numero_venda} finalizada com sucesso!",
                'venda' => $venda->fresh()
            ]);

        } catch (\Exception $e) {
            \DB::rollback();
            
            \Log::error('Erro ao finalizar venda:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao finalizar venda: ' . $e->getMessage()
            ], 500);
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

            // Buscar a venda
            $venda = Venda::where('id_venda', $validated['id_venda'])
                          ->where('status', 'aberta')
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