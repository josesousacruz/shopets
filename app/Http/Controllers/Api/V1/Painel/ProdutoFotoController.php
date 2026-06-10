<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class ProdutoFotoController extends Controller
{
    public function store(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'foto' => ['required', 'image', 'max:8192'],
        ]);

        $produto = Produto::findOrFail($id);

        $media = $produto
            ->addMediaFromRequest('foto')
            ->toMediaCollection('images');

        return response()->json([
            'data' => [
                'id' => $media->id,
                'url' => $media->getUrl(),
                'ordem' => $media->order_column,
            ],
        ], 201);
    }

    public function destroy(int $id, int $media): JsonResponse
    {
        $produto = Produto::findOrFail($id);

        $item = $produto->getMedia('images')->firstWhere('id', $media);

        abort_unless($item !== null, 404);

        $item->delete();

        return response()->json(null, 204);
    }

    public function ordem(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'ordem' => ['required', 'array'],
            'ordem.*' => ['integer'],
        ]);

        $produto = Produto::findOrFail($id);
        $validos = $produto->getMedia('images')->pluck('id')->all();

        $ids = array_values(array_filter($data['ordem'], fn ($mid) => in_array($mid, $validos, true)));

        Media::setNewOrder($ids);

        return response()->json(['data' => ['ordem' => $ids]]);
    }
}
