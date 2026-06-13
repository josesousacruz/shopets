<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\PontoVenda;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PontoVendaAdminController extends Controller
{
    /** GET /api/v1/painel/pontos-venda */
    public function index(): JsonResponse
    {
        $pdvs = PontoVenda::query()
            ->with('deposito:id,nome')
            ->withCount('users')
            ->orderBy('nome_pdv')
            ->get();

        return response()->json(['data' => $pdvs]);
    }

    public function show(int $id): JsonResponse
    {
        $pdv = PontoVenda::with(['deposito:id,nome', 'users:id,name,email'])->findOrFail($id);

        return response()->json(['data' => $pdv]);
    }

    public function store(Request $request): JsonResponse
    {
        $pdv = PontoVenda::create($this->validar($request));

        return response()->json(['data' => $pdv], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $pdv = PontoVenda::where('id_pdv', $id)->firstOrFail();
        $pdv->update($this->validar($request, parcial: true));

        return response()->json(['data' => $pdv->fresh()->load('deposito:id,nome')]);
    }

    public function destroy(int $id): JsonResponse
    {
        PontoVenda::where('id_pdv', $id)->firstOrFail()->update(['ativo' => false]);

        return response()->json(null, 204);
    }

    /** POST /pontos-venda/{id}/operadores — sync de usuários autorizados. */
    public function syncOperadores(Request $request, int $id): JsonResponse
    {
        $pdv = PontoVenda::where('id_pdv', $id)->firstOrFail();
        $data = $request->validate([
            'user_ids' => ['present', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $pdv->users()->sync($data['user_ids']);

        return response()->json(['data' => $pdv->users()->get(['users.id', 'name', 'email'])]);
    }

    private function validar(Request $request, bool $parcial = false): array
    {
        $req = $parcial ? 'sometimes' : 'required';

        return $request->validate([
            'nome_pdv' => [$req, 'string', 'max:100'],
            'descricao' => ['nullable', 'string', 'max:200'],
            'endereco' => ['nullable', 'string', 'max:200'],
            'responsavel' => ['nullable', 'string', 'max:100'],
            'telefone' => ['nullable', 'string', 'max:20'],
            'ativo' => ['sometimes', 'boolean'],
            'permite_retirada' => ['sometimes', 'boolean'],
            'deposito_id' => ['nullable', 'integer', 'exists:depositos,id'],
            'serie_fiscal_default' => ['nullable', 'string', 'max:10'],
            'regime_tributario' => ['nullable', 'string', 'max:30'],
        ]);
    }
}
