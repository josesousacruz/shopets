<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\PlanoConta;
use App\Services\Financeiro\PlanoContaInvalidoException;
use App\Services\Financeiro\PlanoContasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PlanoContaAdminController extends Controller
{
    public function __construct(private readonly PlanoContasService $service)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->service->tree()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'parent_id' => ['nullable', 'integer', 'exists:planos_contas,id'],
            'tipo' => ['required_without:parent_id', 'in:receita,despesa'],
            'codigo' => ['required', 'string', 'max:30'],
            'nome' => ['required', 'string', 'max:120'],
        ]);

        $conta = $this->service->criar($data);

        return response()->json(['data' => $conta], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $conta = PlanoConta::findOrFail($id);
        $data = $request->validate([
            'codigo' => ['sometimes', 'string', 'max:30'],
            'nome' => ['sometimes', 'string', 'max:120'],
            'ativo' => ['sometimes', 'boolean'],
        ]);
        $conta->update($data);

        return response()->json(['data' => $conta->fresh()]);
    }

    public function mover(Request $request, int $id): JsonResponse
    {
        $conta = PlanoConta::findOrFail($id);
        $data = $request->validate([
            'parent_id' => ['nullable', 'integer', 'exists:planos_contas,id'],
        ]);

        try {
            $conta = $this->service->mover($conta, $data['parent_id'] ?? null);
        } catch (PlanoContaInvalidoException $e) {
            throw ValidationException::withMessages(['parent_id' => $e->getMessage()]);
        }

        return response()->json(['data' => $conta]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->service->desativar(PlanoConta::findOrFail($id));

        return response()->json(null, 204);
    }
}
