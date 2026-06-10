<?php

namespace Database\Factories;

use App\Models\Carrinho;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Carrinho>
 */
class CarrinhoFactory extends Factory
{
    protected $model = Carrinho::class;

    public function definition(): array
    {
        return [
            'token' => (string) Str::uuid(),
            'id_cliente' => null,
        ];
    }
}
