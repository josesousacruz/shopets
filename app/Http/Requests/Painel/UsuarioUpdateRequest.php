<?php

namespace App\Http\Requests\Painel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UsuarioUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('usuario')?->id ?? $this->route('usuario');

        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160', Rule::unique('users', 'email')->ignore($id)],
            'cpf' => ['nullable', 'string', 'max:14'],
            'papeis' => ['nullable', 'array'],
            'papeis.*' => ['string', 'exists:roles,name'],
        ];
    }
}
