<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Http\Requests\Painel\PapelStoreRequest;
use App\Http\Requests\Painel\PapelUpdateRequest;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class PapelAdminController extends Controller
{
    /** Papéis de sistema não podem ser renomeados nem excluídos. */
    private const PAPEIS_PROTEGIDOS = ['admin', 'super-admin'];

    public function index()
    {
        $papeis = Role::withCount('permissions')->orderBy('name')->get()->map(fn ($r) => [
            'id' => $r->id,
            'nome' => $r->name,
            'descricao' => $r->description ?? null,
            'permissions_count' => $r->permissions_count,
            'sistema' => in_array($r->name, self::PAPEIS_PROTEGIDOS, true),
        ]);

        return response()->json(['data' => $papeis]);
    }

    public function store(PapelStoreRequest $request)
    {
        $papel = Role::create([
            'name' => $request->input('nome'),
            'guard_name' => 'web',
        ]);

        $papel->syncPermissions($request->input('permissions', []));

        return response()->json([
            'data' => $this->present($papel->load('permissions')),
        ], 201);
    }

    public function show(Role $papel)
    {
        return response()->json([
            'data' => $this->present($papel->load('permissions')),
        ]);
    }

    public function update(PapelUpdateRequest $request, Role $papel)
    {
        if (in_array($papel->name, self::PAPEIS_PROTEGIDOS, true)
            && $request->input('nome') !== $papel->name) {
            throw ValidationException::withMessages([
                'nome' => 'Papel de sistema não pode ser renomeado.',
            ]);
        }

        $papel->update(['name' => $request->input('nome')]);
        $papel->syncPermissions($request->input('permissions', []));

        return response()->json([
            'data' => $this->present($papel->refresh()->load('permissions')),
        ]);
    }

    public function destroy(Role $papel)
    {
        if (in_array($papel->name, self::PAPEIS_PROTEGIDOS, true)) {
            throw ValidationException::withMessages([
                'nome' => 'Papel de sistema não pode ser excluído.',
            ]);
        }

        $papel->delete();

        return response()->noContent();
    }

    private function present(Role $papel): array
    {
        return [
            'id' => $papel->id,
            'nome' => $papel->name,
            'descricao' => $papel->description ?? null,
            'sistema' => in_array($papel->name, self::PAPEIS_PROTEGIDOS, true),
            'permissions' => $papel->permissions->pluck('name')->all(),
        ];
    }
}
