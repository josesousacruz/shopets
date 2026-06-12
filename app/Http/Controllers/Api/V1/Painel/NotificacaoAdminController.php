<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\Notificacao;
use Illuminate\Http\Request;

class NotificacaoAdminController extends Controller
{
    /** Lista do usuário (próprias + globais user_id=null). Filtro ?unread=1, ?tipo=, ?page=. */
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $q = Notificacao::query()
            ->where(function ($w) use ($userId) {
                $w->where('user_id', $userId)->orWhereNull('user_id');
            })
            ->latest();

        if ($request->query('unread') === '1') {
            $q->whereNull('lida_em');
        }

        if ($tipo = $request->query('tipo')) {
            $q->where('tipo', $tipo);
        }

        $page = $q->paginate(20);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'total' => $page->total(),
                'per_page' => $page->perPage(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'unread_count' => $this->unreadCount($userId),
            ],
        ]);
    }

    public function unreadCount(int $userId): int
    {
        return Notificacao::where(function ($w) use ($userId) {
            $w->where('user_id', $userId)->orWhereNull('user_id');
        })->whereNull('lida_em')->count();
    }

    public function summary(Request $request)
    {
        return response()->json([
            'data' => ['unread_count' => $this->unreadCount($request->user()->id)],
        ]);
    }

    public function marcarLida(Request $request, Notificacao $notificacao)
    {
        $userId = $request->user()->id;
        abort_unless($notificacao->user_id === null || $notificacao->user_id === $userId, 403);

        if (!$notificacao->lida_em) {
            $notificacao->update(['lida_em' => now()]);
        }

        return response()->json(['data' => $notificacao]);
    }

    public function marcarTodasLidas(Request $request)
    {
        $userId = $request->user()->id;
        Notificacao::where(function ($w) use ($userId) {
            $w->where('user_id', $userId)->orWhereNull('user_id');
        })->whereNull('lida_em')->update(['lida_em' => now()]);

        return response()->json(['data' => ['ok' => true]]);
    }
}
