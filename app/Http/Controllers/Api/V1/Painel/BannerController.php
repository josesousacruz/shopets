<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\BannerHome;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BannerController extends Controller
{
    public function index(): JsonResponse
    {
        $banners = BannerHome::query()
            ->orderBy('ordem')
            ->orderBy('id_banner')
            ->get()
            ->map(fn (BannerHome $b) => $this->serialize($b))
            ->all();

        return response()->json(['data' => $banners]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['data' => $this->serialize(BannerHome::findOrFail($id))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validar($request);

        $banner = BannerHome::create($data);

        return response()->json(['data' => $this->serialize($banner)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $banner = BannerHome::findOrFail($id);
        $data = $this->validar($request);

        $banner->update($data);

        return response()->json(['data' => $this->serialize($banner->fresh())]);
    }

    public function destroy(int $id): JsonResponse
    {
        BannerHome::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function validar(Request $request): array
    {
        $data = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'subtitulo' => ['nullable', 'string', 'max:255'],
            'imagem_path' => ['nullable', 'string', 'max:2048'],
            'imagem' => ['nullable', 'image', 'max:8192'],
            'link' => ['nullable', 'string', 'max:2048'],
            'ordem' => ['sometimes', 'integer', 'min:0'],
            'ativo' => ['sometimes', 'boolean'],
            'vigencia_de' => ['nullable', 'date'],
            'vigencia_ate' => ['nullable', 'date'],
        ]);

        // Upload opcional: salva em storage/public e usa o path retornado.
        if ($request->hasFile('imagem')) {
            $data['imagem_path'] = $request->file('imagem')->store('banners', 'public');
        }

        unset($data['imagem']);

        return $data;
    }

    private function serialize(BannerHome $b): array
    {
        return [
            'id' => $b->id_banner,
            'titulo' => $b->titulo,
            'subtitulo' => $b->subtitulo,
            'imagem_path' => $b->imagem_path,
            'link' => $b->link,
            'ordem' => (int) $b->ordem,
            'ativo' => (bool) $b->ativo,
            'vigencia_de' => optional($b->vigencia_de)->toIso8601String(),
            'vigencia_ate' => optional($b->vigencia_ate)->toIso8601String(),
        ];
    }
}
