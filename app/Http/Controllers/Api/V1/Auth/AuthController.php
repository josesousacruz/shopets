<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ClienteResource;
use App\Mail\BoasVindasCliente;
use App\Models\Cliente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nome' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:clientes,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'telefone' => ['nullable', 'string', 'max:20'],
            'aceita_marketing' => ['sometimes', 'boolean'],
        ]);

        $cliente = Cliente::create([
            'nome' => $data['nome'],
            'email' => $data['email'],
            'telefone' => $data['telefone'] ?? null,
            'password' => $data['password'],
            'origem' => 'ecommerce',
            'aceita_marketing' => $data['aceita_marketing'] ?? false,
        ]);

        Mail::to($cliente->email)->queue(new BoasVindasCliente($cliente));

        $token = $cliente->createToken('storefront')->plainTextToken;

        return response()->json([
            'cliente' => new ClienteResource($cliente),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $cliente = Cliente::where('email', $data['email'])->first();

        if (! $cliente || ! Hash::check($data['password'], $cliente->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas.'],
            ]);
        }

        $token = $cliente->createToken('storefront')->plainTextToken;

        return response()->json([
            'cliente' => new ClienteResource($cliente),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    public function me(Request $request): ClienteResource
    {
        return new ClienteResource($request->user());
    }
}
