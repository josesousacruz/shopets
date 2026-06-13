<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\MetodoEnvio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MetodoEnvioAdminController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => MetodoEnvio::orderBy('ordem')->orderBy('nome')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['data' => MetodoEnvio::create($this->validar($request))], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $m = MetodoEnvio::findOrFail($id);
        $m->update($this->validar($request));

        return response()->json(['data' => $m->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        MetodoEnvio::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function validar(Request $request): array
    {
        return $request->validate([
            'nome' => ['required', 'string', 'max:100'],
            'tipo' => ['required', 'in:tabela,correios,melhor_envio,frete_gratis'],
            'config' => ['nullable', 'array'],
            'ativo' => ['sometimes', 'boolean'],
            'ordem' => ['nullable', 'integer', 'min:0'],
        ]);
    }
}
