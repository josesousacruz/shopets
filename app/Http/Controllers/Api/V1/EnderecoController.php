<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\EnderecoResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class EnderecoController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $enderecos = $request->user()->enderecos()->latest('id_endereco')->get();

        return EnderecoResource::collection($enderecos);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $cliente = $request->user();

        // Primeiro endereço sempre vira principal.
        $primeiro = $cliente->enderecos()->count() === 0;
        $tornarPrincipal = ($data['principal'] ?? false) || $primeiro;

        $endereco = DB::transaction(function () use ($cliente, $data, $tornarPrincipal) {
            if ($tornarPrincipal) {
                $cliente->enderecos()->update(['principal' => false]);
            }

            $data['principal'] = $tornarPrincipal;

            return $cliente->enderecos()->create($data);
        });

        return (new EnderecoResource($endereco))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, int $endereco): EnderecoResource
    {
        $cliente = $request->user();
        $model = $cliente->enderecos()->where('id_endereco', $endereco)->firstOrFail();

        $data = $this->validateData($request);

        DB::transaction(function () use ($cliente, $model, $data) {
            if (($data['principal'] ?? false)) {
                $cliente->enderecos()->where('id_endereco', '!=', $model->id_endereco)
                    ->update(['principal' => false]);
            }

            $model->update($data);
        });

        return new EnderecoResource($model->fresh());
    }

    public function destroy(Request $request, int $endereco): JsonResponse
    {
        $model = $request->user()->enderecos()->where('id_endereco', $endereco)->firstOrFail();
        $model->delete();

        return response()->json(null, 204);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'apelido' => ['nullable', 'string', 'max:50'],
            'cep' => ['required', 'string', 'max:9'],
            'logradouro' => ['required', 'string', 'max:150'],
            'numero' => ['required', 'string', 'max:20'],
            'complemento' => ['nullable', 'string', 'max:100'],
            'bairro' => ['required', 'string', 'max:100'],
            'cidade' => ['required', 'string', 'max:100'],
            'uf' => ['required', 'string', 'size:2'],
            'tipo' => ['sometimes', 'in:entrega,cobranca,ambos'],
            'principal' => ['sometimes', 'boolean'],
        ]);
    }
}
