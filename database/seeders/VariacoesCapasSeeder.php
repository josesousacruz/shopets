<?php

namespace Database\Seeders;

use App\Models\Produto;
use App\Models\ProdutoVariacao;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class VariacoesCapasSeeder extends Seeder
{
    public function run(): void
    {
        $alvos = [
            'Capa Silicone iPhone 15',
            'Capa Silicone iPhone 15 Pro Max',
            'Capa Silicone Samsung Galaxy S24',
            'Capa Anti Impacto Galaxy S23 Ultra',
            'Capa Silicone Xiaomi Redmi Note 13',
        ];

        $cores = ['Preta', 'Azul', 'Rosa', 'Transparente'];

        foreach ($alvos as $nome) {
            $produto = Produto::where('nome', $nome)->first();
            if (! $produto || $produto->variacoes()->exists()) {
                continue;
            }

            foreach ($cores as $cor) {
                ProdutoVariacao::create([
                    'id_produto'        => $produto->id_produto,
                    'sku'               => Str::slug($produto->codigo_interno.'-'.substr($cor, 0, 3), '_'),
                    'nome_variacao'     => "$nome — $cor",
                    'atributos'         => ['cor' => $cor],
                    'preco_venda'       => $produto->preco_venda,
                    'preco_promocional' => $produto->preco_promocional,
                    'estoque_atual'     => 5,
                    'estoque_minimo'    => 1,
                    'peso_gramas'       => $produto->peso_gramas,
                    'altura_cm'         => $produto->altura_cm,
                    'largura_cm'        => $produto->largura_cm,
                    'comprimento_cm'    => $produto->comprimento_cm,
                    'ativo'             => true,
                ]);
            }
        }
    }
}
