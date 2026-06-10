@component('mail::message')
# Pagamento confirmado

Recebemos o pagamento do seu pedido **{{ $numero }}**.

**Total:** R$ {{ number_format($total, 2, ',', '.') }}

Já estamos preparando tudo. Você receberá novas atualizações por aqui.

Obrigado por comprar com a gente!

@component('mail::button', ['url' => rtrim(env('STOREFRONT_URL', 'http://localhost:3000'), '/').'/conta/pedidos'])
Ver meus pedidos
@endcomponent

Atenciosamente,<br>
{{ config('app.name') }}
@endcomponent
