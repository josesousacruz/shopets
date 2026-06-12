<?php

namespace App\Http\Requests\Painel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClienteUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $cliente = $this->route('cliente');
        $id = is_object($cliente) ? $cliente->id_cliente : $cliente;

        return [
            'nome' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:160', Rule::unique('clientes', 'email')->ignore($id, 'id_cliente')],
            'cpf_cnpj' => ['nullable', 'string', 'max:18'],
            'telefone' => ['nullable', 'string', 'max:20'],
            'tipo_pessoa' => ['nullable', 'in:fisica,juridica'],
            'data_nascimento' => ['nullable', 'date'],
            'aceita_marketing' => ['boolean'],
            'ativo' => ['boolean'],
        ];
    }
}
