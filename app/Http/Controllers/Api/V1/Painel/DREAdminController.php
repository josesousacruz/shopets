<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Services\Financeiro\DREService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DREAdminController extends Controller
{
    public function __construct(private readonly DREService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->gerar($request->query('de'), $request->query('ate')),
        ]);
    }
}
