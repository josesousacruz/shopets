<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Categoria;
use App\Models\Produto;

class CapasProdutoSeeder extends Seeder
{
    public function run(): void
    {
        $cat = fn(string $nome) => Categoria::where('nome', $nome)->value('id_categoria');

        $idCapas       = $cat('Capas para Celular');
        $idPeliculas   = $cat('Películas e Protetores');
        $idCarregador  = $cat('Carregadores');
        $idCabos       = $cat('Cabos USB');
        $idFones       = $cat('Fones de Ouvido');
        $idCaixas      = $cat('Caixas de Som Bluetooth');
        $idSuportes    = $cat('Suportes e Acessórios');
        $idPower       = $cat('Power Banks');

        $produtos = [
            // Capas para Celular (12)
            ['Capa Silicone iPhone 15',                     19.90, 39.90, $idCapas],
            ['Capa Silicone iPhone 15 Pro Max',             22.00, 49.90, $idCapas],
            ['Capa Anti Impacto iPhone 14',                 18.50, 44.90, $idCapas],
            ['Capa Transparente iPhone 13',                  9.90, 24.90, $idCapas],
            ['Capa Couro iPhone 12',                        25.00, 59.90, $idCapas],
            ['Capa Silicone Samsung Galaxy S24',            17.00, 39.90, $idCapas],
            ['Capa Anti Impacto Galaxy S23 Ultra',          21.00, 49.90, $idCapas],
            ['Capa Transparente Galaxy A54',                 8.90, 22.90, $idCapas],
            ['Capa Carteira Galaxy A14',                    14.00, 34.90, $idCapas],
            ['Capa Silicone Xiaomi Redmi Note 13',          12.00, 29.90, $idCapas],
            ['Capa Anti Impacto Motorola Moto G84',         13.50, 32.90, $idCapas],
            ['Capa Transparente Motorola Edge 40',          10.00, 26.90, $idCapas],

            // Películas e Protetores (8)
            ['Película de Vidro 3D iPhone 15',               4.50, 19.90, $idPeliculas],
            ['Película de Vidro iPhone 14 Pro',              4.50, 19.90, $idPeliculas],
            ['Película Hidrogel Galaxy S24',                 3.00, 14.90, $idPeliculas],
            ['Película de Vidro Galaxy A54',                 3.50, 15.90, $idPeliculas],
            ['Película Privacidade iPhone 13',               7.00, 29.90, $idPeliculas],
            ['Película de Vidro Xiaomi Redmi 12',            3.00, 14.90, $idPeliculas],
            ['Película Cerâmica Fosca Galaxy S23',           6.00, 24.90, $idPeliculas],
            ['Kit 3 Películas Hidrogel Universal',           5.00, 22.90, $idPeliculas],

            // Carregadores (6)
            ['Carregador Tipo C 20W USB-C PD',              22.00, 59.90, $idCarregador],
            ['Carregador iPhone 20W Original',              45.00, 99.90, $idCarregador],
            ['Carregador Samsung 25W Super Fast',           28.00, 69.90, $idCarregador],
            ['Carregador Veicular Dual USB 3.4A',           15.00, 39.90, $idCarregador],
            ['Carregador Sem Fio Qi 15W',                   30.00, 79.90, $idCarregador],
            ['Carregador GaN 65W 3 Portas',                 75.00, 169.90, $idCarregador],

            // Cabos USB (6)
            ['Cabo Lightning 1m Reforçado',                  8.00, 24.90, $idCabos],
            ['Cabo USB-C para Lightning 1m PD',             18.00, 49.90, $idCabos],
            ['Cabo USB-C 2m 60W',                           10.00, 29.90, $idCabos],
            ['Cabo Micro USB 1m Reforçado',                  5.00, 14.90, $idCabos],
            ['Cabo 3 em 1 (Lightning, USB-C, Micro USB)',   12.00, 34.90, $idCabos],
            ['Adaptador USB-C para 3.5mm',                   6.00, 19.90, $idCabos],

            // Fones de Ouvido (7)
            ['Fone Bluetooth TWS i12',                      18.00, 49.90, $idFones],
            ['Fone Bluetooth TWS Pro 6',                    35.00, 89.90, $idFones],
            ['Fone com Fio Intra-Auricular P2',              7.00, 19.90, $idFones],
            ['Headset Gamer com Microfone',                 55.00, 129.90, $idFones],
            ['Fone JBL Tune 510BT Bluetooth',              180.00, 299.90, $idFones],
            ['Fone Lightning para iPhone',                  15.00, 39.90, $idFones],
            ['Fone USB-C In-Ear',                           14.00, 34.90, $idFones],

            // Caixas de Som Bluetooth (4)
            ['Caixa de Som Bluetooth Mini',                 25.00, 59.90, $idCaixas],
            ['Caixa de Som JBL Go 3',                      180.00, 299.90, $idCaixas],
            ['Caixa de Som Bluetooth 20W à Prova D\'Água', 60.00, 149.90, $idCaixas],
            ['Caixa de Som JBL Charge 5',                  650.00, 999.90, $idCaixas],

            // Suportes e Acessórios (4)
            ['Suporte Veicular Magnético',                  10.00, 29.90, $idSuportes],
            ['Suporte Veicular para Saída de Ar',            8.00, 24.90, $idSuportes],
            ['Pop Socket Universal',                         4.00, 14.90, $idSuportes],
            ['Tripé Selfie Stick Bluetooth 1m',             22.00, 59.90, $idSuportes],

            // Power Banks (3)
            ['Power Bank 10000mAh USB-C',                   45.00, 99.90, $idPower],
            ['Power Bank 20000mAh PD 22.5W',                85.00, 179.90, $idPower],
            ['Power Bank Magnético MagSafe 5000mAh',        70.00, 149.90, $idPower],
        ];

        foreach ($produtos as $i => $p) {
            [$nome, $custo, $venda, $idCategoria] = $p;

            Produto::firstOrCreate(
                ['nome' => $nome],
                [
                    'codigo_interno' => 'CAP' . str_pad((string)($i + 1), 4, '0', STR_PAD_LEFT),
                    'codigo_barras'  => '789' . str_pad((string)(100000000 + $i), 10, '0', STR_PAD_LEFT),
                    'descricao'      => $nome,
                    'preco_custo'    => $custo,
                    'preco_venda'    => $venda,
                    'margem_lucro'   => round((($venda - $custo) / $custo) * 100, 2),
                    'estoque_atual'  => 20,
                    'estoque_minimo' => 5,
                    'estoque_maximo' => 100,
                    'unidade'        => 'un',
                    'permite_fracao' => false,
                    'id_categoria'   => $idCategoria,
                    'origem'         => 'nacional',
                    'ativo'          => true,
                ]
            );
        }
    }
}
