<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Produto;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProdutoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Produto::with('categoria')->where('ativo', true);

        // Filtro por categoria
        if ($request->has('categoria_id')) {
            $query->where('id_categoria', $request->categoria_id);
        }

        // Busca por nome ou código
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                  ->orWhere('codigo_barras', 'like', "%{$search}%")
                  ->orWhere('codigo_interno', 'like', "%{$search}%");
            });
        }

        $produtos = $query->orderBy('nome')->get();

        return response()->json([
            'success' => true,
            'data' => $produtos
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nome' => 'required|string|max:200',
            'codigo_barras' => 'nullable|string|max:50',
            'codigo_interno' => 'nullable|string|max:50',
            'descricao' => 'nullable|string',
            'preco_custo' => 'required|numeric|min:0',
            'preco_venda' => 'required|numeric|min:0',
            'margem_lucro' => 'nullable|numeric',
            'estoque_atual' => 'numeric|min:0',
            'estoque_minimo' => 'numeric|min:0',
            'estoque_maximo' => 'nullable|numeric|min:0',
            'unidade' => 'required|in:un,kg,g,l,ml,cx,m,cm',
            'permite_fracao' => 'boolean',
            'id_categoria' => 'nullable|exists:categorias,id_categoria',
            'ncm' => 'nullable|string|max:10',
            'cest' => 'nullable|string|max:10',
            'ativo' => 'boolean'
        ]);

        $produto = Produto::create($request->all());
        $produto->load('categoria');

        return response()->json([
            'success' => true,
            'data' => $produto,
            'message' => 'Produto criado com sucesso'
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $produto = Produto::with('categoria')->find($id);

        if (!$produto) {
            return response()->json([
                'success' => false,
                'message' => 'Produto não encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $produto
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $produto = Produto::find($id);

        if (!$produto) {
            return response()->json([
                'success' => false,
                'message' => 'Produto não encontrado'
            ], 404);
        }

        $request->validate([
            'nome' => 'required|string|max:200',
            'codigo_barras' => 'nullable|string|max:50',
            'codigo_interno' => 'nullable|string|max:50',
            'descricao' => 'nullable|string',
            'preco_custo' => 'required|numeric|min:0',
            'preco_venda' => 'required|numeric|min:0',
            'margem_lucro' => 'nullable|numeric',
            'estoque_atual' => 'numeric|min:0',
            'estoque_minimo' => 'numeric|min:0',
            'estoque_maximo' => 'nullable|numeric|min:0',
            'unidade' => 'required|in:un,kg,g,l,ml,cx,m,cm',
            'permite_fracao' => 'boolean',
            'id_categoria' => 'nullable|exists:categorias,id_categoria',
            'ncm' => 'nullable|string|max:10',
            'cest' => 'nullable|string|max:10',
            'ativo' => 'boolean'
        ]);

        $produto->update($request->all());
        $produto->load('categoria');

        return response()->json([
            'success' => true,
            'data' => $produto,
            'message' => 'Produto atualizado com sucesso'
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $produto = Produto::find($id);

        if (!$produto) {
            return response()->json([
                'success' => false,
                'message' => 'Produto não encontrado'
            ], 404);
        }

        $produto->delete();

        return response()->json([
            'success' => true,
            'message' => 'Produto removido com sucesso'
        ]);
    }

    /**
     * Get products by category
     */
    public function byCategory(string $categoriaId): JsonResponse
    {
        $produtos = Produto::with('categoria')
            ->where('id_categoria', $categoriaId)
            ->where('ativo', true)
            ->orderBy('nome')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $produtos
        ]);
    }
}
