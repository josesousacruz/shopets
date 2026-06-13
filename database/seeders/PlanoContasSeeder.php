<?php

namespace Database\Seeders;

use App\Models\PlanoConta;
use Illuminate\Database\Seeder;

class PlanoContasSeeder extends Seeder
{
    public function run(): void
    {
        $arvore = [
            ['codigo' => '1', 'nome' => 'Receitas', 'tipo' => 'receita', 'filhos' => [
                ['codigo' => '1.1', 'nome' => 'Vendas Online'],
                ['codigo' => '1.2', 'nome' => 'Vendas PDV'],
                ['codigo' => '1.3', 'nome' => 'Outras Receitas'],
            ]],
            ['codigo' => '2', 'nome' => 'Despesas', 'tipo' => 'despesa', 'filhos' => [
                ['codigo' => '2.1', 'nome' => 'Aluguel'],
                ['codigo' => '2.2', 'nome' => 'Folha de Pagamento'],
                ['codigo' => '2.3', 'nome' => 'Marketing'],
                ['codigo' => '2.4', 'nome' => 'Frete'],
                ['codigo' => '2.5', 'nome' => 'Impostos'],
                ['codigo' => '2.6', 'nome' => 'Compras de Mercadoria'],
            ]],
        ];

        foreach ($arvore as $raiz) {
            $pai = PlanoConta::updateOrCreate(
                ['id_empresa' => null, 'codigo' => $raiz['codigo']],
                ['nome' => $raiz['nome'], 'tipo' => $raiz['tipo'], 'parent_id' => null, 'ativo' => true],
            );

            foreach ($raiz['filhos'] as $filho) {
                PlanoConta::updateOrCreate(
                    ['id_empresa' => null, 'codigo' => $filho['codigo']],
                    ['nome' => $filho['nome'], 'tipo' => $raiz['tipo'], 'parent_id' => $pai->id, 'ativo' => true],
                );
            }
        }
    }
}
