<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Categoria;

class CapasCategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [
            ['nome' => 'Capas para Celular',          'descricao' => 'Capas e cases para diversos modelos de smartphones'],
            ['nome' => 'Películas e Protetores',      'descricao' => 'Películas de vidro, hidrogel e protetores de tela'],
            ['nome' => 'Carregadores',                'descricao' => 'Carregadores de parede, veiculares e sem fio'],
            ['nome' => 'Cabos USB',                   'descricao' => 'Cabos Lightning, USB-C, Micro USB e adaptadores'],
            ['nome' => 'Fones de Ouvido',             'descricao' => 'Fones com fio, Bluetooth, in-ear e headsets'],
            ['nome' => 'Caixas de Som Bluetooth',     'descricao' => 'Speakers portáteis e caixas de som sem fio'],
            ['nome' => 'Suportes e Acessórios',       'descricao' => 'Suportes veiculares, pop sockets, anéis e tripés'],
            ['nome' => 'Power Banks',                 'descricao' => 'Carregadores portáteis e baterias externas'],
        ];

        foreach ($categorias as $categoria) {
            Categoria::firstOrCreate(
                ['nome' => $categoria['nome']],
                ['descricao' => $categoria['descricao'], 'ativo' => true]
            );
        }
    }
}
