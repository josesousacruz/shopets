# Sprint 1b — Follow-ups (não-bloqueantes)

Itens identificados no review final do storefront. 4 fixes aplicados inline (shadow-card no tailwind, breadcrumb `<a>`→`<Link>`, og: tags vazias removidas, CategoryFilters preserva params). Restantes ficam pra polish/Sprint 2+.

## 1. Paginação `loja._index` sem janela
Renderiza N links lado a lado. Para `last_page > 10` quebra layout mobile. Implementar janela tipo `1, 2, ... current-1, current, current+1, ... last` ou `flex-wrap`.

## 2. Acessibilidade da galeria
`Gallery.tsx`: thumbnails ativos só com borda visual. Adicionar `aria-pressed={i === ativa}` ou `aria-current`. Mobile thumb button também precisa `aria-label`.

## 3. Busca no mobile
`Header.tsx` esconde input de busca em telas < md. `MobileNav` não tem busca. Adicionar `<Form action="/busca">` no drawer.

## 4. `AggregateOffer` no JSON-LD quando há variações
`seo.ts::jsonLdProduct` usa preço do produto pai mesmo quando há variações com preço diferente. Considerar `AggregateOffer` com `lowPrice`/`highPrice`, ou array de `offers`.

## 5. Sitemap paginado (só inclui 100 primeiros produtos)
`sitemap[.]xml` faz uma chamada `por_pagina: 100`. Loop por todas as páginas (ou `?por_pagina=1000` se Laravel permitir, ou paginação interna).

## 6. Cache em `robots.txt`
Adicionar header `Cache-Control: public, max-age=86400` (igual sitemap).

## 7. Link `/carrinho` no Header gera 404
Rota não existe (vem na Sprint 3). Esconder o link ou usar `disabled` até lá.

## 8. Placeholder visível nas páginas institucionais
Texto "Texto placeholder — edite..." precisa sair antes de produção. Envolver em `{process.env.NODE_ENV !== "production" && ...}` ou usar `// TODO:` no código.

## 9. Deps órfãs `clsx` e `tailwind-merge`
`lib/format.ts::cn` reimplementa o que `clsx` faz; `tailwind-merge` foi instalado e nunca usado. Decidir: usar `twMerge(clsx(...))` (qualidade superior na hora de combinar classes Tailwind conflitantes) ou desinstalar.

## 10. Loaders sem ErrorBoundary específico
`api.server.ts` lança Response 404 para produto inexistente, mas as rotas (`produto.$slug`, `loja.$categoria`) não têm `ErrorBoundary` próprio. Cai no default do Remix, sem branding. Sprint 2.

## 11. Galeria não atualiza quando troca variação
`VariationPicker` muda `selecionada` no `BuyBox` mas a `Gallery` mantém imagens do produto pai. Em produtos com fotos específicas por variação, vale conectar.

## 12. `VariationPicker` assume único atributo
`Object.keys(atributos)[0]` pega só o primeiro. Produtos com cor + tamanho aparecem só como "cor". Implementar agrupamento por múltiplos atributos.

## 13. Busca vazia em `/busca` sem feedback
Quando `q=""`, mostra "Use o campo de busca no topo". Em mobile não tem campo no topo (item #3). Adicionar formulário inline na própria rota `/busca`.

## 14. `--radius-card` definido em tokens.css mas nunca usado
Componentes usam `rounded-2xl` direto. Decidir: usar a var ou remover do tokens.
