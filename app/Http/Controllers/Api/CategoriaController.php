<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CategoriaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $categorias = Categoria::where('ativo', true)
            ->orderBy('nome')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categorias
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nome' => 'required|string|max:100',
            'descricao' => 'nullable|string|max:200',
            'ativo' => 'boolean'
        ]);

        $categoria = Categoria::create($request->all());

        return response()->json([
            'success' => true,
            'data' => $categoria,
            'message' => 'Categoria criada com sucesso'
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $categoria = Categoria::find($id);

        if (!$categoria) {
            return response()->json([
                'success' => false,
                'message' => 'Categoria não encontrada'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $categoria
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $categoria = Categoria::find($id);

        if (!$categoria) {
            return response()->json([
                'success' => false,
                'message' => 'Categoria não encontrada'
            ], 404);
        }

        $request->validate([
            'nome' => 'required|string|max:100',
            'descricao' => 'nullable|string|max:200',
            'ativo' => 'boolean'
        ]);

        $categoria->update($request->all());

        return response()->json([
            'success' => true,
            'data' => $categoria,
            'message' => 'Categoria atualizada com sucesso'
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $categoria = Categoria::find($id);

        if (!$categoria) {
            return response()->json([
                'success' => false,
                'message' => 'Categoria não encontrada'
            ], 404);
        }

        $categoria->delete();

        return response()->json([
            'success' => true,
            'message' => 'Categoria removida com sucesso'
        ]);
    }
}
