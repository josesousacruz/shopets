<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Produto;
use App\Models\Categoria;
use App\Models\Fornecedor;
use App\Models\MovimentacaoEstoque;

class EstoqueController extends Controller
{
    public function index()
    {
        // Carregar dados reais do banco
        $produtos = Produto::with('categoria')->where('ativo', true)->get();
        $categorias = Categoria::all();
        $fornecedores = Fornecedor::all();

        // Converter produtos para formato esperado pelo frontend
        $products = $produtos->map(function ($produto) {
            return [
                'id' => $produto->id_produto,
                'name' => $produto->nome,
                'price' => $produto->preco_venda,
                'purchasePrice' => $produto->preco_custo ?? $produto->preco_compra,
                'salePrice' => $produto->preco_venda,
                'stock' => $produto->estoque_atual,
                'estoque_disponivel' => $produto->estoque_disponivel,
                'reservado' => $produto->reservado,
                'category' => $produto->categoria->nome ?? 'Sem categoria',
                'categoryId' => $produto->id_categoria,
                'barcode' => $produto->codigo_barras,
                'internalCode' => $produto->codigo_interno,
                'description' => $produto->descricao,
                'unit' => $produto->unidade ?? $produto->unidade_medida,
                'allowFractional' => $produto->permite_fracao,
                'allowFraction' => $produto->permite_fracao,
                'minQuantity' => 1,
                'stepQuantity' => $produto->permite_fracao ? 0.1 : 1,
                'minStock' => $produto->estoque_minimo,
                'supplierId' => null, // TODO: implementar relacionamento com fornecedor
                'stockHistory' => []
            ];
        });

        // Converter categorias para formato esperado pelo frontend
        $categories = $categorias->map(function ($categoria) {
            return [
                'id' => $categoria->id_categoria,
                'name' => $categoria->nome,
                'description' => $categoria->descricao,
                'color' => $categoria->cor ?? '#3B82F6',
                'icon' => $categoria->icone ?? '📦'
            ];
        });

        // Converter fornecedores para formato esperado pelo frontend
        $suppliers = $fornecedores->map(function ($fornecedor) {
            // Carregar produtos associados ao fornecedor
            $productIds = $fornecedor->produtos()->pluck('produtos.id_produto')->toArray();
            
            return [
                'id' => $fornecedor->id_fornecedor,
                'name' => $fornecedor->nome,
                'contactPerson' => $fornecedor->contato,
                'phone' => $fornecedor->telefone,
                'email' => $fornecedor->email,
                'address' => $fornecedor->endereco,
                'productIds' => $productIds
            ];
        });

        return inertia('Estoque/Index', [
            'products' => $products,
            'categories' => $categories,
            'suppliers' => $suppliers
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'categoryId' => 'required|exists:categorias,id_categoria',
            'purchasePrice' => 'required|numeric|min:0',
            'unit' => 'required|in:un,kg,g,l,ml,cx,m,cm',
            'barcode' => 'nullable|string|unique:produtos,codigo_barras',
            'internalCode' => 'nullable|string|unique:produtos,codigo_interno',
            'description' => 'nullable|string',
            'minStock' => 'required|integer|min:0',
            'allowFraction' => 'boolean'
        ]);

        $produto = Produto::create([
            'nome' => $request->name,
            'preco_venda' => $request->price,
            'preco_custo' => $request->purchasePrice,
            'id_categoria' => $request->categoryId,
            'unidade' => $request->unit,
            'codigo_barras' => $request->barcode,
            'codigo_interno' => $request->internalCode,
            'descricao' => $request->description,
            'estoque_minimo' => $request->minStock,
            'permite_fracao' => $request->allowFraction ?? false,
            'estoque_atual' => 0,
            'ativo' => true
        ]);

        return back()->with('success', 'Produto criado com sucesso!');
    }

    public function update(Request $request, $id)
    {
        $produto = Produto::where('id_produto', $id)->firstOrFail();
        
        $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'purchasePrice' => 'required|numeric|min:0',
            'categoryId' => 'required|exists:categorias,id_categoria',
            'unit' => 'required|in:un,kg,g,l,ml,cx,m,cm',
            'barcode' => 'nullable|string|unique:produtos,codigo_barras,' . $id . ',id_produto',
            'internalCode' => 'nullable|string|unique:produtos,codigo_interno,' . $id . ',id_produto',
            'description' => 'nullable|string',
            'minStock' => 'required|integer|min:0',
            'allowFraction' => 'boolean'
        ]);

        $produto->update([
            'nome' => $request->name,
            'preco_venda' => $request->price,
            'preco_custo' => $request->purchasePrice,
            'id_categoria' => $request->categoryId,
            'unidade' => $request->unit,
            'codigo_barras' => $request->barcode,
            'codigo_interno' => $request->internalCode,
            'descricao' => $request->description,
            'estoque_minimo' => $request->minStock,
            'permite_fracao' => $request->allowFraction ?? false
        ]);

        return back()->with('success', 'Produto atualizado com sucesso!');
    }

    // Métodos para categorias
    public function storeCategory(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:categorias,nome',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:10',
            'color' => 'nullable|string|max:7' // Para códigos de cor hex
        ]);

        $categoria = Categoria::create([
            'nome' => $request->name,
            'descricao' => $request->description,
            'icone' => $request->icon ?? '📦',
            'cor' => $request->color,
            'ativo' => true
        ]);

        return back()->with('success', 'Categoria criada com sucesso!');
    }

    public function updateCategory(Request $request, $id)
    {
        $categoria = Categoria::where('id_categoria', $id)->firstOrFail();
        
        $request->validate([
            'name' => 'required|string|max:255|unique:categorias,nome,' . $id . ',id_categoria',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:10',
            'color' => 'nullable|string|max:7'
        ]);

        $categoria->update([
            'nome' => $request->name,
            'descricao' => $request->description,
            'icone' => $request->icon ?? '📦',
            'cor' => $request->color
        ]);

        return back()->with('success', 'Categoria atualizada com sucesso!');
    }

    public function destroyCategory($id)
    {
        $categoria = Categoria::where('id_categoria', $id)->firstOrFail();
        
        // Verificar se há produtos usando esta categoria
        if ($categoria->produtos()->count() > 0) {
            return back()->withErrors(['error' => 'Não é possível excluir uma categoria que possui produtos associados.']);
        }

        $categoria->delete();
        return back()->with('success', 'Categoria excluída com sucesso!');
    }

    public function addStock(Request $request)
    {
        $request->validate([
            'productId' => 'required|exists:produtos,id_produto',
            'quantity' => 'required|numeric|min:0',
            'type' => 'required|in:entrada,saida,ajuste',
            'reason' => 'nullable|string',
            'supplierId' => 'nullable|exists:fornecedores,id_fornecedor',
            'purchasePrice' => 'nullable|numeric|min:0',
            'invoiceNumber' => 'nullable|string|max:50'
        ]);

        $produto = Produto::where('id_produto', $request->productId)->firstOrFail();
        
        // Para entradas de estoque, registrar na nova tabela entradas_estoque
        if ($request->type === 'entrada' && $request->supplierId && $request->purchasePrice) {
            $valorTotal = $request->quantity * $request->purchasePrice;
            
            // Registrar entrada de estoque detalhada
            \App\Models\EntradaEstoque::create([
                'id_produto' => $request->productId,
                'id_fornecedor' => $request->supplierId,
                'quantidade' => $request->quantity,
                'preco_unitario' => $request->purchasePrice,
                'valor_total' => $valorTotal,
                'numero_nota_fiscal' => $request->invoiceNumber,
                'data_entrada' => now(),
                'id_usuario' => auth()->id(),
                'observacoes' => $request->reason
            ]);

            // Atualizar preço de custo com média ponderada
            $novoPrecoMedio = \App\Models\EntradaEstoque::precoMedioPonderado($request->productId, 90);
            if ($novoPrecoMedio > 0) {
                $produto->preco_custo = $novoPrecoMedio;
            }

            // Atualizar preço do fornecedor na tabela pivot
            $produto->fornecedores()->updateExistingPivot($request->supplierId, [
                'preco_custo_fornecedor' => $request->purchasePrice,
                'updated_at' => now()
            ]);
        }
        
        // Atualizar estoque do produto
        if ($request->type === 'entrada' || $request->type === 'ajuste') {
            $produto->estoque_atual += $request->quantity;
        } else {
            $produto->estoque_atual = max(0, $produto->estoque_atual - $request->quantity);
        }
        
        $produto->save();

        // Registrar movimentação de estoque (mantém compatibilidade)
        MovimentacaoEstoque::create([
            'id_produto' => $request->productId,
            'id_usuario' => auth()->id(),
            'tipo_movimentacao' => $request->type,
            'quantidade' => $request->quantity,
            'observacoes' => $request->reason,
            'data_movimentacao' => now()
        ]);

        return back()->with('success', 'Estoque atualizado com sucesso!');
    }

    public function getProductStatistics($productId)
    {
        $produto = Produto::where('id_produto', $productId)->firstOrFail();
        
        $statistics = [
            'preco_medio_30_dias' => \App\Models\EntradaEstoque::precoMedioPonderado($productId, 30),
            'preco_medio_90_dias' => \App\Models\EntradaEstoque::precoMedioPonderado($productId, 90),
            'preco_medio_geral' => \App\Models\EntradaEstoque::precoMedioPonderado($productId),
            'fornecedor_mais_barato' => \App\Models\EntradaEstoque::fornecedorMaisBarato($productId),
            'evolucao_precos' => \App\Models\EntradaEstoque::evolucaoPrecos($productId),
            'total_entradas_30_dias' => \App\Models\EntradaEstoque::where('id_produto', $productId)
                ->where('data_entrada', '>=', now()->subDays(30))
                ->count(),
        ];

        return response()->json($statistics);
    }

    public function getSupplierStatistics($supplierId)
    {
        $fornecedor = \App\Models\Fornecedor::where('id_fornecedor', $supplierId)->firstOrFail();
        
        $statistics = \App\Models\EntradaEstoque::estatisticasFornecedor($supplierId);
        
        return response()->json([
            'fornecedor' => $fornecedor,
            'estatisticas' => $statistics
        ]);
    }

    public function getStockHistory($productId)
    {
        $entradas = \App\Models\EntradaEstoque::where('id_produto', $productId)
            ->with(['fornecedor', 'usuario'])
            ->orderBy('data_entrada', 'desc')
            ->paginate(20);

        return response()->json($entradas);
    }

    public function getLatestStockEntries(Request $request)
    {
        $productId = $request->query('product_id');
        
        if (!$productId) {
            return response()->json([]);
        }
        
        $entradas = \App\Models\EntradaEstoque::with(['fornecedor', 'produto'])
            ->where('id_produto', $productId)
            ->orderBy('data_entrada', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($entrada) {
                return [
                    'id' => $entrada->id_entrada,
                    'fornecedor_nome' => $entrada->fornecedor->nome ?? 'Não informado',
                    'produto_nome' => $entrada->produto->nome ?? 'Produto não encontrado',
                    'quantidade' => $entrada->quantidade,
                    'valor_entrada' => $entrada->valor_total,
                    'data_entrada' => $entrada->data_entrada->format('d/m/Y H:i'),
                    'numero_nota_fiscal' => $entrada->numero_nota_fiscal
                ];
            });

        return response()->json($entradas);
    }
}