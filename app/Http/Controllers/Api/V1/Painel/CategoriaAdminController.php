<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoriaAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $categorias = Categoria::query()
            ->withCount('produtos')
            ->orderBy('ordem')
            ->orderBy('nome')
            ->get();

        // Ordena pais primeiro com filhos imediatamente abaixo, mantendo ordem/nome.
        $porPai = $categorias->groupBy(fn ($c) => $c->id_categoria_pai);
        $arvore = collect();
        $append = function ($paiId) use (&$append, $porPai, $arvore) {
            foreach ($porPai->get($paiId, collect()) as $c) {
                $arvore->push($c);
                $append($c->id_categoria);
            }
        };
        $append(null);

        return response()->json([
            'data' => $arvore->map(fn ($c) => $this->serialize($c))->all(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['data' => $this->serialize(Categoria::findOrFail($id))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validar($request);
        $data['slug'] = $this->slugUnico($data['slug'] ?? null, $data['nome']);

        $categoria = Categoria::create($data);

        return response()->json(['data' => $this->serialize($categoria)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $categoria = Categoria::findOrFail($id);
        $data = $this->validar($request, $categoria->id_categoria);

        if (array_key_exists('slug', $data)) {
            $data['slug'] = $this->slugUnico($data['slug'] ?: null, $data['nome'] ?? $categoria->nome, $categoria->id_categoria);
        }

        $categoria->update($data);

        return response()->json(['data' => $this->serialize($categoria->fresh())]);
    }

    public function destroy(int $id): JsonResponse
    {
        Categoria::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function validar(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'descricao_seo' => ['nullable', 'string', 'max:500'],
            'ordem' => ['sometimes', 'integer', 'min:0'],
            'visivel_ecommerce' => ['sometimes', 'boolean'],
            'ativo' => ['sometimes', 'boolean'],
            'id_categoria_pai' => ['nullable', 'integer', 'exists:categorias,id_categoria'],
            'slug' => [
                'nullable', 'string', 'max:255',
                Rule::unique('categorias', 'slug')->ignore($ignoreId, 'id_categoria'),
            ],
        ]);
    }

    private function slugUnico(?string $slug, string $nome, ?int $ignoreId = null): string
    {
        $base = Str::slug($slug ?: $nome) ?: 'categoria';
        $candidato = $base;
        $i = 1;

        while (Categoria::withoutGlobalScopes()
            ->where('slug', $candidato)
            ->when($ignoreId, fn ($q) => $q->where('id_categoria', '!=', $ignoreId))
            ->exists()) {
            $candidato = $base.'-'.(++$i);
        }

        return $candidato;
    }

    private function serialize(Categoria $c): array
    {
        return [
            'id' => $c->id_categoria,
            'nome' => $c->nome,
            'slug' => $c->slug,
            'descricao_seo' => $c->descricao_seo,
            'ordem' => (int) $c->ordem,
            'visivel_ecommerce' => (bool) $c->visivel_ecommerce,
            'ativo' => (bool) $c->ativo,
            'id_categoria_pai' => $c->id_categoria_pai,
            'produtos_count' => (int) ($c->produtos_count ?? 0),
        ];
    }
}
