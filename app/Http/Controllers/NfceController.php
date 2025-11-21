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

        $dados = $request->validate([
            'emitente' => 'required|array',
            'emitente.cnpj' => 'required|string|size:14',
            'emitente.nome' => 'required|string',

            'destinatario' => 'required|array',
            'destinatario.cpf' => 'required|string|size:11',
            'destinatario.nome' => 'required|string',

            'produtos' => 'required|array|min:1',
            'produtos.*.codigo' => 'required|string',
            'produtos.*.descricao' => 'required|string',
            'produtos.*.quantidade' => 'required|numeric|min:0.01',
            'produtos.*.valor_unitario' => 'required|numeric|min:0.01',
            'produtos.*.valor_total' => 'required|numeric|min:0.01',

            'pagamento' => 'required|array',
            'pagamento.metodo' => 'required|string',
            'pagamento.valor' => 'required|numeric|min:0.01',

            'total' => 'required|array',
            'total.valor_total' => 'required|numeric|min:0.01',
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
