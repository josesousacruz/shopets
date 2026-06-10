<?php

namespace Database\Factories;

use App\Models\Cliente;
use App\Models\EnderecoCliente;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\EnderecoCliente>
 */
class EnderecoClienteFactory extends Factory
{
    protected $model = EnderecoCliente::class;

    public function definition(): array
    {
        return [
            'id_cliente' => Cliente::factory(),
            'apelido' => $this->faker->randomElement(['Casa', 'Trabalho']),
            'cep' => $this->faker->numerify('########'),
            'logradouro' => $this->faker->streetName(),
            'numero' => (string) $this->faker->buildingNumber(),
            'complemento' => null,
            'bairro' => $this->faker->citySuffix(),
            'cidade' => $this->faker->city(),
            'uf' => $this->faker->randomElement(['SP', 'RJ', 'BA', 'MG']),
            'tipo' => 'entrega',
            'principal' => false,
        ];
    }
}
