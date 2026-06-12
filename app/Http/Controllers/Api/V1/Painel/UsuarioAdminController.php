<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Http\Requests\Painel\UsuarioStoreRequest;
use App\Http\Requests\Painel\UsuarioUpdateRequest;
use App\Mail\UsuarioPainelCriado;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UsuarioAdminController extends Controller
{
    public function index(Request $request)
    {
        $q = User::query()->where('nivel_acesso', 'admin');

        if ($busca = $request->query('q')) {
            $q->where(function ($w) use ($busca) {
                $w->where('name', 'like', "%{$busca}%")
                  ->orWhere('email', 'like', "%{$busca}%");
            });
        }

        if ($status = $request->query('status')) {
            $q->where('ativo', $status === 'ativo' ? 1 : 0);
        }

        if ($papel = $request->query('papel')) {
            $q->whereHas('roles', fn ($r) => $r->where('name', $papel));
        }

        $page = $q->with('roles:id,name')->orderBy('name')->paginate(20);

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

    public function store(UsuarioStoreRequest $request)
    {
        $senha = Str::random(12);

        $user = User::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'cpf' => $request->input('cpf'),
            'password' => Hash::make($senha),
            'nivel_acesso' => 'admin',
            'ativo' => true,
        ]);

        $user->syncRoles($request->input('papeis', []));

        Mail::to($user->email)->queue(new UsuarioPainelCriado($user, $senha));

        return response()->json([
            'data' => $this->present($user->load('roles')),
        ], 201);
    }

    public function show(User $usuario)
    {
        return response()->json([
            'data' => $this->present($usuario->load('roles')),
        ]);
    }

    public function update(UsuarioUpdateRequest $request, User $usuario)
    {
        $usuario->update($request->only(['name', 'email', 'cpf']));
        $usuario->syncRoles($request->input('papeis', []));

        return response()->json([
            'data' => $this->present($usuario->refresh()->load('roles')),
        ]);
    }

    public function toggle(User $usuario)
    {
        $usuario->update(['ativo' => ! $usuario->ativo]);

        return response()->json([
            'data' => ['id' => $usuario->id, 'ativo' => $usuario->ativo],
        ]);
    }

    public function destroy(Request $request, User $usuario)
    {
        if ($usuario->id === $request->user()->id) {
            throw ValidationException::withMessages([
                'id' => 'Você não pode excluir a sua própria conta.',
            ]);
        }

        $usuario->delete();

        return response()->noContent();
    }

    private function present(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'cpf' => $u->cpf,
            'ativo' => $u->ativo,
            'nivel_acesso' => $u->nivel_acesso,
            'papeis' => $u->roles->pluck('name')->all(),
        ];
    }
}
