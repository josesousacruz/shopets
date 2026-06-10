<?php

use App\Models\PontoVenda;
use App\Models\User;

return [
    /*
    |--------------------------------------------------------------------------
    | Infra de origem ecommerce
    |--------------------------------------------------------------------------
    |
    | A tabela `vendas` exige id_usuario (users) e id_pdv (pontos_venda) NOT NULL.
    | Vendas originadas do ecommerce usam um usuário-sistema e um PDV "Loja Online"
    | criados pelo EcommerceInfraSeeder. Os ids são resolvidos por e-mail/nome para
    | não depender de ids fixos.
    |
    */

    'system_user_email' => env('ECOMMERCE_SYSTEM_USER_EMAIL', 'ecommerce@sistema.local'),
    'pdv_nome' => env('ECOMMERCE_PDV_NOME', 'Loja Online'),

    // Closures resolvem por e-mail/nome (idempotente com o seeder).
    'system_user_id' => static fn (): ?int => optional(
        User::where('email', config('ecommerce.system_user_email'))->first()
    )->id,

    'pdv_id' => static fn (): ?int => optional(
        PontoVenda::where('nome_pdv', config('ecommerce.pdv_nome'))->first()
    )->id_pdv,
];
