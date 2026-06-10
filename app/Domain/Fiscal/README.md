# Domain: Fiscal

Emissão de documento fiscal a partir de um pedido pago.

## Responsabilidades
- `EmitirNotaFiscalJob` decide NFe (entrega) ou NFCe (retirada)
- Reusa `App\Services\NfceService` existente
- Cria `NfeService` análogo

## Namespace
`App\Domain\Fiscal`

## Quando preencher
Sprint 4.
