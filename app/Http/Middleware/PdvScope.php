<?php

namespace App\Http\Middleware;

use App\Models\PontoVenda;
use Closure;
use Illuminate\Http\Request;

/**
 * Lê o PDV ativo (header X-Pdv-Ativo ou cookie painel_pdv_ativo) e injeta no
 * request o `pdv_ativo_id` e o `pdv_deposito_id` resolvido, para que os
 * controllers de Estoque/Relatórios possam escopar por loja quando aplicável.
 */
class PdvScope
{
    public function handle(Request $request, Closure $next)
    {
        $pdvId = $request->header('X-Pdv-Ativo') ?? $request->cookie('painel_pdv_ativo');

        if ($pdvId && is_numeric($pdvId)) {
            $pdv = PontoVenda::query()->find((int) $pdvId);
            if ($pdv) {
                $request->attributes->set('pdv_ativo_id', $pdv->id_pdv);
                $request->attributes->set('pdv_deposito_id', $pdv->deposito_id);
            }
        }

        return $next($request);
    }
}
