# Domain: Catalog

Bounded context de catálogo (produtos, categorias, variações, imagens, SEO).

## Responsabilidades
- Listar e buscar produtos visíveis no ecommerce
- Cadastro/edição de produto (PDV + ecommerce)
- Categorias e hierarquia
- Variações (SKU por modelo/cor)

## Não é responsabilidade
- Estoque disponível para venda → Domain/Order
- Preço com cupom → Domain/Checkout

## Namespace
`App\Domain\Catalog`

## Como popular
Migrar `EstoqueController` e partes do `ProdutoController` para Services/Actions deste namespace nas sprints 1 e 5.
