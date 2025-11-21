<?php

namespace App\Http\Controllers;

use App\Services\NfceService;
use Illuminate\Http\Request;

class NfceController extends Controller
{
    protected $nfceService;

    public function __construct(NfceService $nfceService)
    {
        $this->nfceService = $nfceService;
    }

    public function emitir(Request $request)
    {
        return response()->json(['message' => 'Teste de emissão NFC-e']);

        
        $dados = $request->validate([
            'produtos' => 'required|array',  // Dados da venda
            'cliente' => 'required|array',   // Dados do cliente
            // Outros dados necessários...
        ]);

        try {
            $result = $this->nfceService->emitir($dados);
            return response()->json([
                'success' => true,
                'message' => 'NFC-e emitida com sucesso!',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao emitir NFC-e: ' . $e->getMessage()
            ], 500);
        }
    }
}
