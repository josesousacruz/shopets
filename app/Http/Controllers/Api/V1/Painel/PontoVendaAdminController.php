<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\PontoVenda;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PontoVendaAdminController extends Controller
{
    /**
     * GET /api/v1/painel/pontos-venda
     */
    public function index(): JsonResponse
    {
        $pdvs = PontoVenda::query()
            ->orderBy('nome_pdv')
            ->get(['id_pdv', 'nome_pdv', 'endereco', 'telefone', 'ativo', 'permite_retirada']);

        return response()->json(['data' => $pdvs]);
    }

    /**
     * PUT /api/v1/painel/pontos-venda/{id}
     * Toggle de retirada (e outros campos simples) por PDV.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'permite_retirada' => ['sometimes', 'boolean'],
            'ativo' => ['sometimes', 'boolean'],
        ]);

        $pdv = PontoVenda::where('id_pdv', $id)->firstOrFail();
        $pdv->update($data);

        return response()->json([
            'data' => [
                'id' => $pdv->id_pdv,
                'nome_pdv' => $pdv->nome_pdv,
                'permite_retirada' => $pdv->permite_retirada,
                'ativo' => $pdv->ativo,
            ],
        ]);
    }
}
