<?php

namespace App\Http\Requests\Painel;

use Illuminate\Foundation\Http\FormRequest;

class ClienteStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:160', 'unique:clientes,email'],
            'cpf_cnpj' => ['nullable', 'string', 'max:18'],
            'telefone' => ['nullable', 'string', 'max:20'],
            'tipo_pessoa' => ['nullable', 'in:fisica,juridica'],
            'data_nascimento' => ['nullable', 'date'],
            'aceita_marketing' => ['boolean'],
            'enviar_email' => ['boolean'],
        ];
    }
}
