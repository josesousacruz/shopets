@component('mail::message')
# Código de rastreio disponível

Seu pedido **{{ $numero }}** já tem código de rastreamento:

**{{ $rastreio }}**

Acompanhe a entrega pelo site dos Correios ou da transportadora.

Obrigado pela preferência,<br>
{{ config('app.name') }}
@endcomponent
