# Domain: Payment

Abstração de gateway de pagamento. MVP: Mercado Pago.

## Responsabilidades
- `PaymentGatewayInterface` (charge, refund, status)
- `MercadoPagoGateway`
- Processar webhook (idempotente por `gateway_id_externo`)

## Namespace
`App\Domain\Payment`

## Quando preencher
Sprint 4.
