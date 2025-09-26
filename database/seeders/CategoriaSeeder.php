<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Categoria;

class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [
            [
                'nome' => 'Ração para Cães',
                'descricao' => 'Rações e alimentos para cães de todas as idades',
                'ativo' => true,
            ],
            [
                'nome' => 'Ração para Gatos',
                'descricao' => 'Rações e alimentos para gatos de todas as idades',
                'ativo' => true,
            ],
            [
                'nome' => 'Brinquedos',
                'descricao' => 'Brinquedos para pets se divertirem',
                'ativo' => true,
            ],
            [
                'nome' => 'Higiene e Beleza',
                'descricao' => 'Produtos para higiene e cuidados estéticos',
                'ativo' => true,
            ],
            [
                'nome' => 'Acessórios',
                'descricao' => 'Coleiras, guias, camas e outros acessórios',
                'ativo' => true,
            ],
            [
                'nome' => 'Medicamentos',
                'descricao' => 'Medicamentos e suplementos veterinários',
                'ativo' => true,
            ],
            [
                'nome' => 'Aquarismo',
                'descricao' => 'Produtos para aquários e peixes',
                'ativo' => true,
            ],
            [
                'nome' => 'Aves',
                'descricao' => 'Produtos específicos para aves',
                'ativo' => true,
            ],
        ];

        foreach ($categorias as $categoria) {
            Categoria::create($categoria);
        }
    }
}