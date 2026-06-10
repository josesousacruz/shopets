<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PontoVenda;
use Illuminate\Http\JsonResponse;

class PontoRetiradaController extends Controller
{
    /**
     * GET /api/v1/pontos-retirada (público)
     * Lista PDVs habilitados para retirada e ativos.
     */
    public function index(): JsonResponse
    {
        $pdvs = PontoVenda::query()
            ->where('permite_retirada', true)
            ->where('ativo', true)
            ->orderBy('nome_pdv')
            ->get(['id_pdv', 'nome_pdv', 'endereco', 'telefone']);

        return response()->json([
            'data' => $pdvs->map(fn (PontoVenda $p) => [
                'id' => $p->id_pdv,
                'nome_pdv' => $p->nome_pdv,
                'endereco' => $p->endereco,
                'telefone' => $p->telefone,
            ]),
        ]);
    }
}
