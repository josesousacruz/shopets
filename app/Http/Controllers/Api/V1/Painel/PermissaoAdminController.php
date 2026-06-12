<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use Spatie\Permission\Models\Permission;

class PermissaoAdminController extends Controller
{
    /**
     * Lista todas as permissões do painel agrupadas por módulo
     * (segundo segmento de "painel.<modulo>.<acao>").
     */
    public function index()
    {
        $grouped = Permission::where('name', 'like', 'painel.%')
            ->pluck('name')
            ->groupBy(fn ($name) => explode('.', $name)[1] ?? 'outro')
            ->map(fn ($group) => $group->values()->all());

        return response()->json(['data' => $grouped]);
    }
}
