@php
    $rotulos = [
        'aguardando_pagamento' => 'Aguardando pagamento',
        'pago' => 'Pago',
        'em_separacao' => 'Em separação',
        'enviado' => 'Enviado',
        'entregue' => 'Entregue',
        'aguardando_retirada' => 'Aguardando retirada',
        'cancelado' => 'Cancelado',
        'devolvido' => 'Devolvido',
        'aguardando_revisao_fiscal' => 'Em processamento',
    ];
    $rotulo = $rotulos[$novoStatus] ?? $novoStatus;
@endphp
@component('mail::message')
# Atualização do seu pedido

O pedido **{{ $numero }}** mudou de status.

**Status atual:** {{ $rotulo }}

@component('mail::button', ['url' => rtrim(env('STOREFRONT_URL', 'http://localhost:3000'), '/').'/conta/pedidos'])
Acompanhar pedido
@endcomponent

Atenciosamente,<br>
{{ config('app.name') }}
@endcomponent
