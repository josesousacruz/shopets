<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class CepController extends Controller
{
    public function __invoke(string $cep): JsonResponse
    {
        $cep = preg_replace('/\D/', '', $cep);

        if (strlen($cep) !== 8) {
            return response()->json(['message' => 'CEP inválido.'], 404);
        }

        $response = Http::get("https://viacep.com.br/ws/{$cep}/json/");

        if ($response->failed() || ($response->json('erro') ?? false)) {
            return response()->json(['message' => 'CEP não encontrado.'], 404);
        }

        $data = $response->json();

        return response()->json([
            'cep' => $data['cep'] ?? $cep,
            'logradouro' => $data['logradouro'] ?? null,
            'bairro' => $data['bairro'] ?? null,
            'cidade' => $data['localidade'] ?? null,
            'uf' => $data['uf'] ?? null,
        ]);
    }
}
