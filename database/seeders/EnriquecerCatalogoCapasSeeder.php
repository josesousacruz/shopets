<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Database\Seeder;

class EnriquecerCatalogoCapasSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            'Capas para Celular'      => ['peso' => 80,  'a' => 18, 'l' => 10, 'c' => 2],
            'Películas e Protetores'  => ['peso' => 30,  'a' => 20, 'l' => 12, 'c' => 1],
            'Carregadores'            => ['peso' => 150, 'a' => 12, 'l' => 8,  'c' => 5],
            'Cabos USB'               => ['peso' => 60,  'a' => 18, 'l' => 12, 'c' => 3],
            'Fones de Ouvido'         => ['peso' => 120, 'a' => 18, 'l' => 14, 'c' => 6],
            'Caixas de Som Bluetooth' => ['peso' => 350, 'a' => 22, 'l' => 18, 'c' => 10],
            'Suportes e Acessórios'   => ['peso' => 90,  'a' => 18, 'l' => 12, 'c' => 4],
            'Power Banks'             => ['peso' => 280, 'a' => 18, 'l' => 14, 'c' => 5],
        ];

        foreach ($defaults as $catNome => $d) {
            $cat = Categoria::where('nome', $catNome)->first();
            if (! $cat) {
                continue;
            }

            Produto::where('id_categoria', $cat->id_categoria)
                ->get()
                ->each(function (Produto $p) use ($d) {
                    $p->peso_gramas ??= $d['peso'];
                    $p->altura_cm ??= $d['a'];
                    $p->largura_cm ??= $d['l'];
                    $p->comprimento_cm ??= $d['c'];
                    $p->visivel_ecommerce = true;
                    $p->descricao_curta ??= mb_substr($p->nome, 0, 200);
                    $p->meta_title ??= $p->nome;
                    $p->meta_description ??= 'Compre '.$p->nome.' com entrega rápida e garantia.';
                    $p->save();
                });
        }
    }
}
