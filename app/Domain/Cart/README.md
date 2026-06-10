# Domain: Cart

Carrinho persistido server-side identificado por cookie `cart_token` (guest) ou `id_cliente` (logado).

## Responsabilidades
- Adicionar/remover/atualizar itens
- Mesclar carrinho guest com cliente ao logar
- Calcular subtotal sem desconto

## Namespace
`App\Domain\Cart`

## Quando preencher
Sprint 3.
