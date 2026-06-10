<?php

namespace Database\Factories;

use App\Models\Produto;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Produto>
 */
class ProdutoFactory extends Factory
{
    protected $model = Produto::class;

    public function definition(): array
    {
        $nome = $this->faker->words(3, true);

        return [
            'nome' => $nome,
            'slug' => Str::slug($nome).'-'.$this->faker->unique()->numberBetween(1, 999999),
            'codigo_interno' => $this->faker->unique()->numerify('PRD-#####'),
            'preco_custo' => 10.00,
            'preco_venda' => 20.00,
            'preco_promocional' => null,
            'estoque_atual' => 10,
            'estoque_minimo' => 0,
            'unidade' => 'un',
            'permite_fracao' => false,
            'ativo' => true,
            'visivel_ecommerce' => true,
            'peso_gramas' => 500,
            'em_promocao' => false,
            'destaque' => false,
            'novo' => false,
        ];
    }
}
