<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Models\Pedido;
use App\Models\Produto;
use Illuminate\Http\Request;

class BuscaGlobalController extends Controller
{
    public function __invoke(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        if (mb_strlen($q) < 2) {
            return response()->json([
                'data' => ['pedidos' => [], 'produtos' => [], 'clientes' => []],
            ]);
        }

        $cpfDigits = preg_replace('/\D/', '', $q);

        $pedidos = Pedido::query()
            ->where('numero', 'like', "%{$q}%")
            ->latest()
            ->limit(5)
            ->get(['id', 'numero', 'total', 'status']);

        $produtos = Produto::query()
            ->where(function ($w) use ($q, $cpfDigits) {
                $w->where('nome', 'like', "%{$q}%");
                if ($cpfDigits !== '') {
                    $w->orWhere('codigo_barras', $cpfDigits);
                }
            })
            ->limit(5)
            ->get(['id', 'nome', 'preco_venda']);

        $clientes = Cliente::query()
            ->where(function ($w) use ($q, $cpfDigits) {
                $w->where('nome', 'like', "%{$q}%")
                  ->orWhere('email', 'like', "%{$q}%");
                if ($cpfDigits !== '') {
                    $w->orWhere('cpf', $cpfDigits);
                }
            })
            ->limit(5)
            ->get(['id', 'nome', 'email']);

        return response()->json([
            'data' => [
                'pedidos' => $pedidos,
                'produtos' => $produtos,
                'clientes' => $clientes,
            ],
        ]);
    }
}
