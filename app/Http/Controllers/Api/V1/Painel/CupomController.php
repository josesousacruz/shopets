<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\Cupom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CupomController extends Controller
{
    public function index(): JsonResponse
    {
        $cupons = Cupom::query()
            ->orderByDesc('id_cupom')
            ->get()
            ->map(fn (Cupom $c) => $this->serialize($c))
            ->all();

        return response()->json(['data' => $cupons]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['data' => $this->serialize(Cupom::findOrFail($id))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validar($request);
        $data['codigo'] = strtoupper($data['codigo']);

        $cupom = Cupom::create($data);

        return response()->json(['data' => $this->serialize($cupom)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $cupom = Cupom::findOrFail($id);
        $data = $this->validar($request, $cupom->id_cupom);

        if (array_key_exists('codigo', $data)) {
            $data['codigo'] = strtoupper($data['codigo']);
        }

        $cupom->update($data);

        return response()->json(['data' => $this->serialize($cupom->fresh())]);
    }

    public function destroy(int $id): JsonResponse
    {
        Cupom::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function validar(Request $request, ?int $ignoreId = null): array
    {
        $empresaId = (int) config('app.current_empresa_id', 1);

        return $request->validate([
            'codigo' => [
                'required', 'string', 'max:60',
                Rule::unique('cupons', 'codigo')
                    ->where('id_empresa', $empresaId)
                    ->ignore($ignoreId, 'id_cupom'),
            ],
            'tipo' => ['required', Rule::in(['percentual', 'valor_fixo', 'frete_gratis'])],
            'valor' => ['sometimes', 'numeric', 'min:0'],
            'valor_minimo_pedido' => ['sometimes', 'numeric', 'min:0'],
            'valido_de' => ['nullable', 'date'],
            'valido_ate' => ['nullable', 'date'],
            'uso_maximo' => ['nullable', 'integer', 'min:1'],
            'ativo' => ['sometimes', 'boolean'],
        ]);
    }

    private function serialize(Cupom $c): array
    {
        return [
            'id' => $c->id_cupom,
            'codigo' => $c->codigo,
            'tipo' => $c->tipo,
            'valor' => (float) $c->valor,
            'valor_minimo_pedido' => (float) $c->valor_minimo_pedido,
            'valido_de' => optional($c->valido_de)->toIso8601String(),
            'valido_ate' => optional($c->valido_ate)->toIso8601String(),
            'uso_maximo' => $c->uso_maximo,
            'usos_atuais' => (int) $c->usos_atuais,
            'ativo' => (bool) $c->ativo,
        ];
    }
}
