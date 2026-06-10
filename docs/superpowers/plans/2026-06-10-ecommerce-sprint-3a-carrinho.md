# Ecommerce — Sprint 3a (Carrinho + Reserva + Frete + Pedido) Plan

> Execução via subagent-driven-development. Branch: `ecommerce-sprint-3`.

**Goal:** Backend do carrinho server-side, reserva de estoque atômica (anti-overselling), cotação de frete (atrás de interface, com stub de dev), e criação de pedido em `aguardando_pagamento`. SEM pagamento (Sprint 4).

**Domínio:** `estoque_atual` (em produtos/produto_variacoes) é a verdade física (PDV baixa via trigger ao finalizar venda). `estoqueDisponivel = estoque_atual − Σ(reservas ativas não consumidas e não expiradas)`. Reserva criada em transação com `SELECT ... FOR UPDATE` na linha do produto/variação → sem race.

**Frete:** `ShippingQuoteInterface` com `cotar(cepDestino, itens): array de opções{servico, transportadora, preco, prazo_dias}`. Implementação `StubShippingService` (cálculo por peso total + região do CEP). `MelhorEnvioService` fica como esqueleto documentado (precisa token). Binding default = stub; troca por env `SHIPPING_DRIVER`.

**Spec:** Sprint 3 (seção 8) + tabelas seção 4.2.

---

## Tasks

### T1 — reservas_estoque + estoqueDisponivel()
- Migration `create_reservas_estoque_table`: `id_reserva` PK, `id_carrinho` FK NULL, `id_pedido` FK NULL, `id_produto` FK, `id_variacao` FK NULL, `quantidade` decimal(10,3), `expira_em` timestamp, `consumida_em` timestamp NULL, timestamps. Índices: (id_produto, id_variacao), expira_em, consumida_em.
- Service `App\Domain\Order\EstoqueService` (ou trait/método nos models):
  - `disponivel(Produto|ProdutoVariacao $alvo): float` = estoque_atual − reservasAtivas. Reserva ativa = `consumida_em IS NULL AND expira_em > now()`.
  - Método estático/escopo que computa reservado por produto e por variação.
- Acrescentar em `ProdutoVariacao` e `Produto` um accessor `estoque_disponivel` (lê via service).
- Testes: sem reservas, disponível = estoque_atual; com reserva ativa, desconta; reserva expirada ou consumida não desconta.

### T2 — carrinhos + carrinho_itens + endpoints
- Migrations: `carrinhos` (`id_carrinho` PK, `token` uuid unique, `id_cliente` FK NULL, `expira_em` timestamp, timestamps); `carrinho_itens` (`id_carrinho` FK cascade, `id_produto` FK, `id_variacao` FK NULL, `quantidade` int, `preco_unit_snapshot` decimal, timestamps; unique (id_carrinho,id_produto,id_variacao)).
- Models `Carrinho`, `CarrinhoItem` (+ relações; Carrinho tem itens, subtotal computado).
- `CarrinhoService`: resolve carrinho por token (cookie) OU cliente autenticado; merge ao logar (se cliente loga com carrinho guest, mescla). `adicionarItem`, `atualizarQuantidade`, `removerItem`, `limpar`. Valida disponibilidade ao adicionar (não passa de estoqueDisponivel).
- Endpoints `/api/v1/carrinho` (público — identifica por header `X-Cart-Token` OU Bearer cliente):
  - `GET /carrinho` → carrinho atual (cria vazio se não existe; retorna token p/ o front guardar)
  - `POST /carrinho/itens` {id_produto, id_variacao?, quantidade} → adiciona/incrementa (valida estoque)
  - `PUT /carrinho/itens/{id}` {quantidade} → atualiza (valida estoque)
  - `DELETE /carrinho/itens/{id}` → remove
- `CarrinhoResource` com itens (produto snapshot: nome, slug, imagem, preço, variação), subtotal, quantidade_total.
- Testes: adicionar item; incrementar; validar estoque (não deixa exceder disponível); remover; subtotal correto; merge guest→cliente.

### T3 — Frete (interface + stub)
- `App\Domain\Shipping\ShippingQuoteInterface::cotar(string $cepDestino, Collection $itens): array`.
- `StubShippingService`: peso total (soma peso_gramas×qtd, fallback 200g/item), região via 1º dígito do CEP; retorna 2 opções: `PAC` (mais barato, prazo maior) e `SEDEX` (mais caro, rápido). Preço = base + peso×fator + ajuste região. Determinístico.
- `MelhorEnvioService` esqueleto (implementa interface, lança/loga "configurar token" — não usado por padrão).
- Bind no AppServiceProvider conforme `config('services.shipping.driver','stub')`.
- Endpoint `POST /api/v1/frete/cotar` {cep, itens?|usa carrinho} → opções. (público; usa carrinho do token se itens não enviados)
- Testes: stub retorna PAC+SEDEX; preço cresce com peso; CEP inválido → 422.

### T4 — pedidos + pedido_itens + pedido_eventos + checkout/iniciar
- Migrations conforme spec 4.2: `pedidos` (numero, id_cliente, id_empresa, status enum incl. aguardando_pagamento/aguardando_retirada/pago/em_separacao/enviado/entregue/cancelado/devolvido, modalidade enum entrega|retirada, id_endereco_entrega FK NULL, id_ponto_venda_retirada FK NULL, subtotal, frete, desconto, total, frete_servico, prazo_entrega_dias, codigo_rastreio NULL, observacoes, id_venda FK NULL, timestamps de transição); `pedido_itens` (snapshot: nome, sku, preco_unit, quantidade, subtotal, FK opcionais produto/variação); `pedido_eventos` (id_pedido, tipo, descricao, criado_por_user_id NULL, criado_em).
- Models + relações. `Pedido::gerarNumero()` → "PED-2026-000123" (sequencial por ano).
- `App\Domain\Checkout\IniciarCheckoutAction`: recebe (cliente, carrinho, modalidade, endereço|pdv, frete_servico escolhido). Em transação:
  1. Revalida disponibilidade de cada item (FOR UPDATE).
  2. Cria reservas_estoque (expira_em = now()+15min; boleto futuro = 3 dias — por ora 15min).
  3. Cria pedido (status aguardando_pagamento) + pedido_itens (snapshot) + evento "pedido criado".
  4. Vincula reservas ao pedido (id_pedido).
  5. Limpa o carrinho.
  Retorna o pedido. Se algum item indisponível → aborta com erro 422 listando itens.
- Endpoint `POST /api/v1/checkout/iniciar` (auth:sanctum + cliente) {modalidade, id_endereco?|id_pdv?, frete_servico, cep} → PedidoResource (201).
- `PedidoResource` (numero, status, modalidade, itens, totais, frete, endereço, criado_em).
- Endpoint `GET /api/v1/pedidos` + `GET /api/v1/pedidos/{numero}` (auth cliente, escopado) pra acompanhamento.
- Testes: checkout cria pedido+itens+reservas+evento e limpa carrinho; estoque indisponível aborta; número sequencial; pedido escopado por cliente (404 alheio).

### T5 — Job limpar reservas expiradas + PDV coluna reservado
- Job `LimparReservasExpiradas` (deleta/marca reservas com expira_em < now() e consumida_em null). Agendar no scheduler a cada 1 min (routes/console.php ou bootstrap schedule).
- PDV: expor `estoque_disponivel` e `reservado` onde o estoque é listado (EstoqueController index/statistics) — additive, sem quebrar telas. (Só backend/dado; UI do PDV é opcional.)
- Testes: job remove expiradas e não toca ativas/consumidas.

### T6 — Regressão + review
- `php artisan test` — Sprint 0-3a verdes; só as 6 falhas pré-existentes.
- Review: atomicidade da reserva (FOR UPDATE em transação), sem overselling sob concorrência, resources sem vazar, escopo de pedido por cliente, PDV intacto.

## Critérios de pronto 3a
- estoqueDisponivel correto (reserva ativa desconta; expirada/consumida não)
- Carrinho server-side por token/cliente com validação de estoque + merge no login
- Frete cotado (stub PAC/SEDEX) atrás de interface
- checkout/iniciar cria pedido aguardando_pagamento + reservas + limpa carrinho, atômico
- Job de limpeza agendado
- Suite verde; PDV intacto
