@component('mail::message')
# Bem-vindo à Shopets, {{ $nome }}!

Sua conta foi criada com sucesso. A partir de agora você pode acompanhar seus
pedidos, salvar endereços e aproveitar ofertas exclusivas.

@component('mail::button', ['url' => rtrim(env('STOREFRONT_URL', 'http://localhost:3000'), '/')])
Acessar a loja
@endcomponent

Qualquer dúvida, é só responder este e-mail.

Obrigado,<br>
Equipe Shopets
@endcomponent
