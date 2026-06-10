<?php

namespace Database\Seeders;

use App\Models\PontoVenda;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Cria a infraestrutura de origem ecommerce, idempotente:
 *  - Usuário-sistema (vendedor das vendas geradas pelo ecommerce).
 *  - PDV "Loja Online" (ponto de venda das vendas geradas pelo ecommerce).
 *
 * A tabela `vendas` exige id_usuario e id_pdv NOT NULL; estes registros suprem
 * essa constraint para vendas que nascem de pedidos do storefront.
 */
class EcommerceInfraSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('ecommerce.system_user_email', 'ecommerce@sistema.local');
        $pdvNome = config('ecommerce.pdv_nome', 'Loja Online');

        User::firstOrCreate(
            ['email' => $email],
            [
                'name' => 'Ecommerce (Sistema)',
                'cpf' => '99999999999',
                'nivel_acesso' => 'admin',
                'ativo' => true,
                'password' => Hash::make(str()->random(40)),
            ]
        );

        $pdv = PontoVenda::firstOrCreate(
            ['nome_pdv' => $pdvNome],
            [
                'descricao' => 'Ponto de venda virtual para pedidos do ecommerce',
                'responsavel' => 'Ecommerce',
                'ativo' => true,
            ]
        );

        // A Loja Online aceita retirada por padrão (ajustável pelo lojista).
        if (! $pdv->permite_retirada) {
            $pdv->update(['permite_retirada' => true]);
        }
    }
}
