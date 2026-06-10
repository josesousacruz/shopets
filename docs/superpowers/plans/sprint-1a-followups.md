# Sprint 1a — Follow-ups (não-bloqueantes)

Itens levantados no review final que ficam pra trabalho futuro.

## 1. Estratégia de tenant em `/api/v1/*` (ligado ao followup 1 da Sprint 0)

Endpoints públicos hoje retornam apenas produtos da empresa default (id=1) porque `BelongsToEmpresa` usa `config('app.current_empresa_id', 1)` em tempo de query. Para multi-tenant real:
- Resolver `id_empresa` por domínio/header/sessão antes do controller.
- Bind do `EmpresaContext` no container (singleton por request).
- Trait `BelongsToEmpresa` passa a ler do `EmpresaContext`, não do config.

**Quando:** quando a primeira venda externa (outra empresa) chegar, ou ao implementar a Sprint 8/9 (multi-tenant real).

## 2. `ProdutoVariacao` sem `BelongsToEmpresa` + SKU global-unique

- `ProdutoVariacao` não usa o trait `BelongsToEmpresa` nem tem coluna `id_empresa` — em multi-tenant, queries diretas (`ProdutoVariacao::all()`) vazariam dados de outras empresas.
- Constraint `sku UNIQUE` é global; em multi-tenant duas empresas com o mesmo SKU colidem. Trocar para `UNIQUE(id_empresa, sku)`.

**Quando:** junto da #1.

## 3. Form Requests com validação tipada

`ProdutoController::index` e `BuscaController::__invoke` aceitam parâmetros pela `$request` sem validação:
- `?preco_min=abc` retorna `0.0` silenciosamente
- `?ordem=invalida` cai no default sem aviso
- `?por_pagina=999999` é truncado pra 100 sem erro pro caller

Substituir por `ListarProdutosRequest` e `BuscarProdutosRequest` com regras explícitas.

## 4. Eager-load `media` para evitar N+1 na galeria

`ProdutoListaResource::imagem_capa` chama `$this->getImageUrl('medium')` (Spatie Media Library), que dispara query lazy se a relação `media` não estiver carregada. Em listagem de 24 produtos pode causar 24 queries extras.

Adicionar `->with('media')` em:
- `ProdutoController::index` (listagem)
- `ProdutoController::show` (detalhe, embora 1 query a mais não impacte)
- `BuscaController` (paginator do `BuscaProdutoService::buscar`)

## 5. FULLTEXT NATURAL LANGUAGE x stopwords/palavras curtas

`BuscaProdutoService::buscar` usa `MATCH ... AGAINST(? IN NATURAL LANGUAGE MODE)` em MySQL. Termos < 4 chars (configurável via `ft_min_word_len`) e stopwords retornam zero. Testes rodam em SQLite com LIKE e não pegam isso.

Opções:
- Trocar para `BOOLEAN MODE` com `+` em cada palavra
- Adicionar fallback LIKE quando FULLTEXT retorna zero
- Configurar `ft_min_word_len=2` em produção

**Quando:** quando um cliente reclamar de busca "USB" ou "5G" não retornar resultados.

## 6. Idempotência total no `EnriquecerCatalogoCapasSeeder`

A linha `$p->visivel_ecommerce = true;` força `true` sem checar valor atual. Se o lojista marcar um produto explicitamente como `false` e o seeder rodar de novo, sobrescreve.

Trocar por `$p->visivel_ecommerce ??= true;` ou ter um seeder de "reset" separado.
