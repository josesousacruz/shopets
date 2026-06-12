<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\Inventario;
use App\Services\Estoque\InventarioFinalizadoException;
use App\Services\Estoque\InventarioService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InventarioAdminController extends Controller
{
    public function __construct(private InventarioService $service) {}

    public function index(Request $request)
    {
        $q = Inventario::query()
            ->with(['deposito:id,nome', 'abertoPor:id,name'])
            ->when($request->query('deposito_id'), fn ($qq, $v) => $qq->where('deposito_id', $v))
            ->when($request->query('status'), fn ($qq, $v) => $qq->where('status', $v))
            ->latest('id');

        $page = $q->paginate(20);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'total' => $page->total(),
                'per_page' => $page->perPage(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'deposito_id' => ['required', 'integer', 'exists:depositos,id'],
            'observacoes' => ['nullable', 'string', 'max:2000'],
        ]);

        $inv = $this->service->abrir($data['deposito_id'], $request->user()->id, $data['observacoes'] ?? null);

        return response()->json(['data' => $inv->load(['deposito:id,nome', 'abertoPor:id,name', 'contagens'])], 201);
    }

    public function show(Inventario $inventario)
    {
        $inventario->load([
            'deposito:id,nome',
            'abertoPor:id,name',
            'contagens.variacao:id_variacao,id_produto,sku',
            'contagens.variacao.produto:id_produto,nome',
        ]);

        return response()->json(['data' => $inventario]);
    }

    public function registrarContagem(Request $request, Inventario $inventario)
    {
        $data = $request->validate([
            'produto_variacao_id' => ['required', 'integer', 'exists:produto_variacoes,id_variacao'],
            'saldo_contado' => ['required', 'integer', 'min:0'],
            'observacoes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $row = $this->service->registrarContagem(
                $inventario->id,
                $data['produto_variacao_id'],
                $data['saldo_contado'],
                $data['observacoes'] ?? null,
            );
        } catch (InventarioFinalizadoException $e) {
            throw ValidationException::withMessages(['inventario' => $e->getMessage()]);
        }

        return response()->json(['data' => $row]);
    }

    public function concluir(Request $request, Inventario $inventario)
    {
        try {
            $inv = $this->service->concluir($inventario->id, $request->user()->id);
        } catch (InventarioFinalizadoException $e) {
            throw ValidationException::withMessages(['inventario' => $e->getMessage()]);
        }

        return response()->json(['data' => $inv]);
    }

    public function cancelar(Inventario $inventario)
    {
        try {
            $inv = $this->service->cancelar($inventario->id);
        } catch (InventarioFinalizadoException $e) {
            throw ValidationException::withMessages(['inventario' => $e->getMessage()]);
        }

        return response()->json(['data' => $inv]);
    }
}
