<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\RelatorioAgendamento;
use App\Models\RelatorioFavorito;
use App\Services\Relatorios\RelatorioBuilder;
use App\Services\Relatorios\RelatorioExportService;
use App\Services\Relatorios\RelatorioNaoEncontradoException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class RelatorioAdminController extends Controller
{
    public function __construct(
        private readonly RelatorioBuilder $builder,
        private readonly RelatorioExportService $exporter,
    ) {
    }

    /** GET /painel/relatorios — lista relatórios agrupados + favoritos do usuário. */
    public function index(Request $request): JsonResponse
    {
        $grupos = config('relatorios.grupos');
        $defs = $this->builder->definicoes();

        $lista = [];
        foreach ($defs as $slug => $def) {
            $lista[] = [
                'slug' => $slug,
                'nome' => $def['nome'],
                'grupo' => $def['grupo'],
                'grupo_label' => $grupos[$def['grupo']] ?? $def['grupo'],
                'filtros' => $def['filtros'],
            ];
        }

        return response()->json([
            'data' => $lista,
            'grupos' => $grupos,
            'favoritos' => RelatorioFavorito::where('user_id', $request->user()->id)->get(),
        ]);
    }

    /** GET /painel/relatorios/{slug} — dados do relatório. */
    public function show(Request $request, string $slug): JsonResponse
    {
        try {
            $resultado = $this->builder->dados($slug, $this->filtros($request));
        } catch (RelatorioNaoEncontradoException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }

        return response()->json([
            'definicao' => $resultado['definicao'],
            'linhas' => $resultado['linhas'],
            'total' => count($resultado['linhas']),
        ]);
    }

    /** GET /painel/relatorios/{slug}/export?formato=csv|pdf|xlsx */
    public function export(Request $request, string $slug)
    {
        $formato = $request->query('formato', 'csv');
        if (! in_array($formato, config('relatorios.formatos'), true)) {
            $formato = 'csv';
        }

        try {
            $resultado = $this->builder->dados($slug, $this->filtros($request));
        } catch (RelatorioNaoEncontradoException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }

        $arquivo = $this->exporter->exportar($resultado['definicao'], $resultado['linhas'], $formato);

        return response($arquivo['conteudo'], 200, [
            'Content-Type' => $arquivo['content_type'],
            'Content-Disposition' => 'attachment; filename="'.$arquivo['filename'].'"',
        ]);
    }

    // ---- favoritos ------------------------------------------------------

    public function favoritar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slug' => ['required', 'string'],
            'nome' => ['required', 'string', 'max:120'],
            'filtros' => ['nullable', 'array'],
        ]);

        $fav = RelatorioFavorito::create([
            'user_id' => $request->user()->id,
            'slug' => $data['slug'],
            'nome' => $data['nome'],
            'filtros' => $data['filtros'] ?? [],
        ]);

        return response()->json(['data' => $fav], 201);
    }

    public function removerFavorito(Request $request, int $id): JsonResponse
    {
        RelatorioFavorito::where('user_id', $request->user()->id)->where('id', $id)->delete();

        return response()->json(null, 204);
    }

    // ---- agendamentos ---------------------------------------------------

    public function agendamentos(Request $request): JsonResponse
    {
        return response()->json([
            'data' => RelatorioAgendamento::where('user_id', $request->user()->id)->latest()->get(),
        ]);
    }

    public function agendar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slug' => ['required', 'string'],
            'filtros' => ['nullable', 'array'],
            'frequencia' => ['required', 'in:diaria,semanal,mensal'],
            'emails' => ['required', 'string'],
            'formato' => ['required', 'in:csv,pdf,xlsx'],
            'favorito_id' => ['nullable', 'integer', 'exists:relatorios_favoritos,id'],
        ]);

        $proxima = match ($data['frequencia']) {
            'diaria' => Carbon::now()->addDay(),
            'semanal' => Carbon::now()->addWeek(),
            default => Carbon::now()->addMonth(),
        };

        $ag = RelatorioAgendamento::create(array_merge($data, [
            'user_id' => $request->user()->id,
            'proxima_execucao' => $proxima->toDateString(),
            'ativo' => true,
        ]));

        return response()->json(['data' => $ag], 201);
    }

    public function removerAgendamento(Request $request, int $id): JsonResponse
    {
        RelatorioAgendamento::where('user_id', $request->user()->id)->where('id', $id)->delete();

        return response()->json(null, 204);
    }

    private function filtros(Request $request): array
    {
        return array_filter([
            'de' => $request->query('de'),
            'ate' => $request->query('ate'),
            'dias' => $request->query('dias'),
        ], fn ($v) => $v !== null && $v !== '');
    }
}
