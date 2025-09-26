<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PontoVenda;
use App\Models\User;

class PontoVendaSeeder extends Seeder
{
    public function run()
    {
        // Criar pontos de venda
        $pontoVendaPrincipal = PontoVenda::firstOrCreate([
            'nome_pdv' => 'Loja Principal'
        ], [
            'nome_pdv' => 'Loja Principal',
            'endereco' => 'Rua das Flores, 123 - Centro',
            'telefone' => '(11) 99999-9999',
            'ativo' => true,
        ]);

        $pontoVendaFilial = PontoVenda::firstOrCreate([
            'nome_pdv' => 'Filial Shopping'
        ], [
            'nome_pdv' => 'Filial Shopping',
            'endereco' => 'Shopping Center ABC, Loja 45',
            'telefone' => '(11) 88888-8888',
            'ativo' => true,
        ]);

        // Associar usuários aos pontos de venda
        $admin = User::where('email', 'admin@shopet.com')->first();
        $maria = User::where('email', 'maria@shopet.com')->first();
        $joao = User::where('email', 'joao@shopet.com')->first();

        if ($admin) {
            // Admin tem acesso a todos os pontos de venda
            $admin->pontosVenda()->syncWithoutDetaching([$pontoVendaPrincipal->id_pdv, $pontoVendaFilial->id_pdv]);
        }

        if ($maria) {
            // Maria (gerente) tem acesso a todos os pontos de venda
            $maria->pontosVenda()->syncWithoutDetaching([$pontoVendaPrincipal->id_pdv, $pontoVendaFilial->id_pdv]);
        }

        if ($joao) {
            // João (operador) tem acesso apenas ao ponto de venda principal
            $joao->pontosVenda()->syncWithoutDetaching([$pontoVendaPrincipal->id_pdv]);
        }
    }
}