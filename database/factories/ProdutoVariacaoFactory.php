<?php

namespace Database\Factories;

use App\Models\Produto;
use App\Models\ProdutoVariacao;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ProdutoVariacao>
 */
class ProdutoVariacaoFactory extends Factory
{
    protected $model = ProdutoVariacao::class;

    public function definition(): array
    {
        return [
            'id_produto' => Produto::factory(),
            'sku' => $this->faker->unique()->numerify('SKU-######'),
            'nome_variacao' => $this->faker->randomElement(['P', 'M', 'G', 'GG']),
            'atributos' => ['tamanho' => $this->faker->randomElement(['P', 'M', 'G'])],
            'preco_venda' => 25.00,
            'preco_promocional' => null,
            'estoque_atual' => 10,
            'estoque_minimo' => 0,
            'peso_gramas' => 300,
            'ativo' => true,
        ];
    }
}
