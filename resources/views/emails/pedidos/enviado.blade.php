@component('mail::message')
# Seu pedido foi enviado!

O pedido **{{ $numero }}** saiu para entrega.

@if ($rastreio)
**Código de rastreio:** {{ $rastreio }}

@component('mail::button', ['url' => $linkRastreio])
Rastrear pedido
@endcomponent
@else
Em breve disponibilizaremos o código de rastreamento.
@endif

Atenciosamente,<br>
{{ config('app.name') }}
@endcomponent
