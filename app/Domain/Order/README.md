# Domain: Order

Ciclo de vida do pedido após criação: pago → em separação → enviado → entregue → devolvido/cancelado.

## Responsabilidades
- Transições de status
- Eventos do pedido (timeline)
- Ponte Pedido → Venda fiscal (`PromoverPedidoEmVendaAction`)
- Devoluções

## Namespace
`App\Domain\Order`

## Quando preencher
Sprint 4 (criação + pago); Sprint 5 (logística); Sprint 6 (devoluções).
