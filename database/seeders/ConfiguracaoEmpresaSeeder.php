<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ConfiguracaoEmpresa;

class ConfiguracaoEmpresaSeeder extends Seeder
{
    public function run(): void
    {
        ConfiguracaoEmpresa::create([
            'nome_empresa' => 'ShopPet - Pet Shop',
            'cnpj' => '12.345.678/0001-90',
            'endereco' => 'Rua das Flores, 123 - São Paulo/SP - CEP: 01234-567',
            'telefone' => '(11) 1234-5678',
            'email' => 'contato@shopet.com',
            'logo_path' => null,
            'taxa_entrega' => 5.00,
            'valor_minimo_entrega' => 30.00,
        ]);
    }
}