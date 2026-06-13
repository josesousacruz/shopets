<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\ContaBancaria;
use App\Models\ExtratoBancarioLinha;
use App\Services\Financeiro\ConciliacaoOfxException;
use App\Services\Financeiro\ConciliacaoOfxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ConciliacaoOfxController extends Controller
{
    public function __construct(private readonly ConciliacaoOfxService $service)
    {
    }

    /** Lista linhas do extrato de uma conta. */
    public function linhas(Request $request): JsonResponse
    {
        $request->validate(['conta_bancaria_id' => ['required', 'integer', 'exists:contas_bancarias,id']]);

        $linhas = ExtratoBancarioLinha::where('conta_bancaria_id', $request->query('conta_bancaria_id'))
            ->orderByDesc('data')
            ->get()
            ->map(fn ($l) => [
                'id' => $l->id,
                'data' => $l->data->toDateString(),
                'valor' => (float) $l->valor,
                'memo' => $l->memo,
                'conciliada' => $l->conciliada,
            ]);

        return response()->json(['data' => $linhas]);
    }

    /** Upload de arquivo OFX. */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'conta_bancaria_id' => ['required', 'integer', 'exists:contas_bancarias,id'],
            'arquivo' => ['required', 'file'],
        ]);

        $conta = ContaBancaria::findOrFail($request->input('conta_bancaria_id'));
        $conteudo = file_get_contents($request->file('arquivo')->getRealPath());

        try {
            $resultado = $this->service->importar($conta, $conteudo);
        } catch (ConciliacaoOfxException $e) {
            throw ValidationException::withMessages(['arquivo' => $e->getMessage()]);
        }

        return response()->json(['data' => $resultado], 201);
    }

    public function sugestoes(int $linha): JsonResponse
    {
        $l = ExtratoBancarioLinha::findOrFail($linha);

        return response()->json(['data' => $this->service->sugerir($l)]);
    }

    public function aplicar(Request $request, int $linha): JsonResponse
    {
        $l = ExtratoBancarioLinha::findOrFail($linha);
        $data = $request->validate([
            'tipo' => ['required', 'in:pagar,receber'],
            'conta_id' => ['required', 'integer'],
        ]);

        try {
            $l = $this->service->aplicar($l, $data['tipo'], $data['conta_id']);
        } catch (ConciliacaoOfxException $e) {
            throw ValidationException::withMessages(['tipo' => $e->getMessage()]);
        }

        return response()->json(['data' => [
            'id' => $l->id,
            'conciliada' => $l->conciliada,
            'reconciliada_em' => $l->reconciliada_em,
        ]]);
    }
}
