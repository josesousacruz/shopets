<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Services\Financeiro\FluxoCaixaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FluxoCaixaAdminController extends Controller
{
    public function __construct(private readonly FluxoCaixaService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $modo = $request->query('modo', 'realizado');
        if (! in_array($modo, ['realizado', 'previsto', 'consolidado'], true)) {
            $modo = 'realizado';
        }

        $resultado = $this->service->porDia(
            $modo,
            $request->query('de'),
            $request->query('ate'),
            $request->query('conta_bancaria_id') ? (int) $request->query('conta_bancaria_id') : null,
        );

        return response()->json(['data' => $resultado, 'modo' => $modo]);
    }
}
