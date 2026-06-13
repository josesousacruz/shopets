<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\TemplateEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TemplateEmailAdminController extends Controller
{
    /** Valores de exemplo para o preview. */
    private const DUMMY = [
        'numero' => 'PED-2026-000123',
        'cliente' => 'Maria Silva',
        'total' => 'R$ 189,90',
        'rastreio' => 'BR123456789SP',
        'loja' => 'Shopets',
    ];

    public function index(): JsonResponse
    {
        return response()->json(['data' => TemplateEmail::orderBy('nome')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $template = TemplateEmail::create($this->validar($request));

        return response()->json(['data' => $template], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $template = TemplateEmail::findOrFail($id);
        $template->update($this->validar($request, $template->id));

        return response()->json(['data' => $template->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        TemplateEmail::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    /** Preview renderizado com dados de exemplo. */
    public function preview(int $id): JsonResponse
    {
        $template = TemplateEmail::findOrFail($id);

        return response()->json(['data' => $template->render(self::DUMMY)]);
    }

    private function validar(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'slug' => ['required', 'string', 'max:60', Rule::unique('templates_email', 'slug')->ignore($ignoreId)],
            'nome' => ['required', 'string', 'max:120'],
            'assunto' => ['required', 'string', 'max:200'],
            'corpo_html' => ['required', 'string'],
            'variaveis' => ['nullable', 'array'],
            'ativo' => ['sometimes', 'boolean'],
        ]);
    }
}
