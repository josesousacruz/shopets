<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'shipping' => [
        'driver' => env('SHIPPING_DRIVER', 'stub'),
        'melhor_envio' => [
            'token' => env('MELHOR_ENVIO_TOKEN'),
        ],
        'melhorenvio' => [
            // Token estático (fluxo "conta única"). Ignorado quando o OAuth abaixo
            // está configurado (client_id presente) — nesse caso o token vem da loja.
            'token' => env('MELHORENVIO_TOKEN'),
            // O ambiente (sandbox/produção) vem de `configuracoes_empresa.melhor_envio_sandbox`
            // (tela Configurações → Pagamento/Frete), não mais do .env.
            'cep_origem' => env('MELHORENVIO_CEP_ORIGEM', '01001000'),
            // Credenciais do app Pontto registrado no Melhor Envio (nível aplicação).
            'client_id' => env('MELHORENVIO_CLIENT_ID'),
            'client_secret' => env('MELHORENVIO_CLIENT_SECRET'),
            'redirect_uri' => env('MELHORENVIO_REDIRECT_URI'),
            // Obrigatório pelo Melhor Envio: identifica o app + contato.
            'user_agent' => env('MELHORENVIO_USER_AGENT', 'Pontto (contato@pontto.com.br)'),
        ],
    ],

    'payment' => [
        // Driver ativo e credenciais do Yapay agora vêm de `configuracoes_empresa`
        // (tela Configurações → Integrações no painel), não mais do .env — ver
        // AppServiceProvider::register() e ConfiguracaoController.
        //
        // Secret genérico que autentica a URL de notificação
        // (POST /api/v1/webhooks/pagamento?wh_secret=...), independente do driver
        // ativo. Sem ele configurado, o webhook rejeita tudo (fail-closed). Esse
        // continua no .env por ser um segredo interno, não uma credencial de terceiro.
        'webhook_secret' => env('PAYMENT_WEBHOOK_SECRET'),
        'mercadopago' => [
            // O access token vem de `configuracoes_empresa.mercadopago_access_token`
            // (tela do painel). Aqui fica só o secret de assinatura do webhook
            // (x-signature) — segredo interno de infra, como o webhook_secret acima.
            'webhook_secret' => env('MERCADOPAGO_WEBHOOK_SECRET'),
        ],
    ],

];
