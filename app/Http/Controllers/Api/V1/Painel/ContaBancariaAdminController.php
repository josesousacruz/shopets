<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\ContaBancaria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContaBancariaAdminController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => ContaBancaria::orderBy('nome')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $conta = ContaBancaria::create($this->validar($request));

        return response()->json(['data' => $conta], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $conta = ContaBancaria::findOrFail($id);
        $conta->update($this->validar($request));

        return response()->json(['data' => $conta->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        ContaBancaria::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function validar(Request $request): array
    {
        return $request->validate([
            'tipo' => ['required', 'in:banco,caixa,cartao,digital'],
            'nome' => ['required', 'string', 'max:120'],
            'banco' => ['nullable', 'string', 'max:80'],
            'agencia' => ['nullable', 'string', 'max:20'],
            'conta' => ['nullable', 'string', 'max:30'],
            'saldo_inicial' => ['nullable', 'numeric'],
            'data_saldo_inicial' => ['nullable', 'date'],
            'ativo' => ['sometimes', 'boolean'],
        ]);
    }
}
