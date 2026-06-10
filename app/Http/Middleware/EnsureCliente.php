<?php

namespace App\Http\Middleware;

use App\Models\Cliente;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Garante que o usuário autenticado (via token Sanctum) é um Cliente.
 * Bloqueia tokens de User (PDV) acessando rotas do storefront.
 */
class EnsureCliente
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() instanceof Cliente) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        return $next($request);
    }
}
