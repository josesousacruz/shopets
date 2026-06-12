<?php

namespace App\Http\Requests\Painel;

use Illuminate\Foundation\Http\FormRequest;

class UsuarioStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160', 'unique:users,email'],
            'cpf' => ['required', 'string', 'max:14', 'unique:users,cpf'],
            'papeis' => ['nullable', 'array'],
            'papeis.*' => ['string', 'exists:roles,name'],
        ];
    }
}
