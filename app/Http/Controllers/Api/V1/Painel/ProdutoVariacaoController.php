<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProdutoVariacaoController extends Controller
{
    public function index(int $id): JsonResponse
    {
        $produto = Produto::findOrFail($id);

        return response()->json([
            'data' => $produto->variacoes()->get()->map(fn ($v) => $this->serialize($v))->all(),
        ]);
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $produto = Produto::findOrFail($id);
        $data = $this->validar($request);
        $data['id_produto'] = $produto->id_produto;

        $variacao = ProdutoVariacao::create($data);

        return response()->json(['data' => $this->serialize($variacao)], 201);
    }

    public function update(Request $request, int $id, int $variacao): JsonResponse
    {
        $produto = Produto::findOrFail($id);
        $model = $produto->variacoes()->where('id_variacao', $variacao)->firstOrFail();
        $data = $this->validar($request, $model->id_variacao);

        $model->update($data);

        return response()->json(['data' => $this->serialize($model->fresh())]);
    }

    public function destroy(int $id, int $variacao): JsonResponse
    {
        $produto = Produto::findOrFail($id);
        $model = $produto->variacoes()->where('id_variacao', $variacao)->firstOrFail();
        $model->delete();

        return response()->json(null, 204);
    }

    private function validar(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'sku' => [
                'required', 'string', 'max:100',
                Rule::unique('produto_variacoes', 'sku')->ignore($ignoreId, 'id_variacao'),
            ],
            'nome_variacao' => ['nullable', 'string', 'max:100'],
            'atributos' => ['nullable', 'array'],
            'preco_venda' => ['required', 'numeric', 'min:0'],
            'preco_promocional' => ['nullable', 'numeric', 'min:0'],
            'estoque_atual' => ['sometimes', 'numeric', 'min:0'],
            'estoque_minimo' => ['sometimes', 'numeric', 'min:0'],
            'peso_gramas' => ['nullable', 'integer', 'min:0'],
            'ativo' => ['sometimes', 'boolean'],
        ]);
    }

    private function serialize(ProdutoVariacao $v): array
    {
        return [
            'id' => $v->id_variacao,
            'sku' => $v->sku,
            'nome_variacao' => $v->nome_variacao,
            'atributos' => $v->atributos ?? [],
            'preco_venda' => (float) $v->preco_venda,
            'preco_promocional' => $v->preco_promocional !== null ? (float) $v->preco_promocional : null,
            'estoque_atual' => (float) $v->estoque_atual,
            'estoque_minimo' => (float) $v->estoque_minimo,
            'ativo' => (bool) $v->ativo,
        ];
    }
}
