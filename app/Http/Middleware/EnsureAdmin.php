<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Garante que o usuário autenticado (via token Sanctum) é um User do PDV
 * com nível de acesso admin ou gerente. Bloqueia tokens de Cliente e
 * vendedores acessando o painel do lojista no storefront.
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user('sanctum');

        if (! $user instanceof User
            || ! $user->ativo
            || ! in_array($user->nivel_acesso, ['admin', 'gerente'], true)) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        return $next($request);
    }
}
