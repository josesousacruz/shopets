# Spec — Ecommerce sobre PDV Shopets

**Data:** 2026-06-09
**Autor:** brainstorming session
**Status:** Aprovado para implementação
**Projeto base:** `C:\Projetos\PDV-Ecomerce\shopets` (Laravel 12 + Inertia + React)
**Referência visual:** `C:\Projetos\Física Comigo Design System (Remix)` (usado como inspiração estrutural; identidade visual será nova)

---

## 1. Objetivo

Escalar o PDV Shopets para também operar como ecommerce B2C, compartilhando o cadastro de produtos, estoque e dados de cliente entre os dois canais. O PDV continua funcionando sem alteração de UX. O ecommerce é um novo storefront público, em Remix, conectado por API REST ao mesmo Laravel.

Loja-piloto: capas e acessórios para celular (50 produtos já seedados).

## 2. Decisões fechadas

| # | Decisão | Escolha |
|---|---|---|
| 1 | Modelo de operação | B2C completo + híbrido: cliente escolhe entrega ou retirada; paga online ou na retirada |
| 2 | Gateway de pagamento | Mercado Pago no MVP, atrás de `PaymentGatewayInterface` (Asaas/Stripe ficam pra Fase 2) |
| 3 | Variações de produto | Tabela `produto_variacoes` (1 produto → N variações com SKU/preço/estoque próprios) |
| 4 | Estoque entre canais | Único, compartilhado |
| 5 | Reserva de estoque | Criada ao iniciar checkout, expira em 15 min (3 dias para boleto) |
| 6 | Autenticação cliente | Conta obrigatória (cadastro/login com e-mail + senha) |
| 7 | Frete | Melhor Envio (PAC, SEDEX, Jadlog) |
| 8 | Pedido x Venda | Entidades separadas; ao confirmar pagamento gera Venda + documento fiscal |
| 9 | Emissão fiscal | NFe para entrega, NFCe para retirada — automática ao pagar |
| 10 | Arquitetura | 2 apps: Laravel API + Remix frontend, mesmo VPS Docker |
| 11 | Stack frontend | Remix (alinha com referência visual) |
| 12 | MVP | Catálogo + busca + filtros, checkout completo, conta cliente, painel admin |
| 13 | Fase 2 | Wishlist, reviews, cupons avançados, programa de fidelidade no ecommerce |
| 14 | Branding | Nova identidade do zero (estrutura/componentes do DS referenciado, identidade própria) |
| 15 | Cliente unificado | Mesma tabela `clientes`, com flag `origem` (pdv/ecommerce/ambos) |
| 16 | Dados cliente | Cadastro com e-mail + senha + nome; CPF pedido só no checkout |
| 17 | E-mail | SMTP próprio/Gmail no MVP (risco de spam — ver R4) |
| 18 | Domínios (produção) | `dominio.com.br` = storefront; `pdv.dominio.com.br` = PDV/admin; `api.dominio.com.br` = API |
| 19 | Dev | Localhost. Remix em `:3000`, Laravel em `:8000` |
| 20 | Páginas estáticas | Sobre, FAQ, Trocas, Privacidade, Termos (placeholders no spec) |
| 21 | Devolução | Cliente solicita pelo site, lojista aprova; reusa lógica de devolução do PDV |
| 22 | LGPD | Banner de cookies + página de Privacidade obrigatórios |
| 23 | Analytics | Google Analytics 4 + Meta Pixel |
| 24 | PWA | Mobile-first responsivo + PWA básico (manifest + SW simples) |
| 25 | Imagens | Storage local servido pelo Laravel (Spatie MediaLibrary já instalado) |
| 26 | Busca | MySQL FULLTEXT no MVP (migração para Meilisearch só se passar de ~2k SKUs) |
| 27 | Multi-tenant | "Ready" no schema (`id_empresa` nas tabelas-chave, default 1), não ativo |
| 28 | Campos novos de produto | Slug, descricao_longa, fotos múltiplas, peso/dim, SEO, badges, `visivel_ecommerce` |
| 29 | Painel admin | Dentro do Laravel atual, novo grupo `/admin/loja/*` |
| 30 | Workflow de pedido | aguardando_pagamento → pago → em_separacao → enviado → entregue (+ aguardando_retirada para "pagar na retirada", cancelado, devolvido) |

## 3. Arquitetura

### 3.1 Topologia

```
                  ┌──────────────────────────────────────────────┐
                  │  Nginx (reverse proxy + TLS)                 │
                  └──┬───────────────────────────────┬───────────┘
                     │                               │
       dominio.com.br                       pdv.dominio.com.br
       (storefront público — Remix)         (PDV + admin — Laravel/Inertia)
                     │                               │
            ┌────────▼────────┐              ┌───────▼────────┐
            │ Remix (Node)    │              │ Laravel 12     │
            │ SSR + Vite      │              │ PHP-FPM        │
            │ Tailwind        │              │ Inertia + React│
            └────────┬────────┘              └───────┬────────┘
                     │  HTTP REST                    │
                     └──── api.dominio.com.br ───────┤
                                                     │
                                          ┌──────────▼─────────┐
                                          │ MySQL 8 (compart.) │
                                          │ Redis (cache+queue)│
                                          └────────────────────┘
```

Em desenvolvimento (localhost): Remix em `http://localhost:3000`, Laravel em `http://localhost:8000`. Sanctum SPA com CORS liberado para `localhost:3000`; cookie de sessão em `.localhost` (ou Bearer token paralelo durante dev).

### 3.2 Princípios

- **Laravel é fonte única da verdade.** Domínio vive no Laravel; Remix nunca toca o banco.
- **API REST nova versionada:** `app/Http/Controllers/Api/Storefront/*` sob `/api/v1/*`.
- **Domínio reorganizado:** `app/Domain/{Catalog, Cart, Checkout, Order, Shipping, Payment, Fiscal}` com Services/Actions; PDV e ecommerce chamam as mesmas Actions críticas (`ReservarEstoqueAction`, `EmitirNotaFiscalAction`, etc).
- **Auth do cliente:** Laravel Sanctum SPA mode (cookie de sessão + CSRF).
- **Queues (Redis):** emissão de NFe, e-mails, geração de etiqueta Melhor Envio, webhook MP.
- **Multi-empresa ready:** coluna `id_empresa` nas tabelas-chave com global scope (default 1).

### 3.3 Por que não outras abordagens

- Não Inertia mono-app: storefront público precisa de SSR forte (SEO), e separar isola o ritmo de iteração da loja vs PDV.
- Não micro-serviços: domínio é coeso, separação física não traz ganho real.
- Mesmo VPS Docker: custo previsível, deploy simples; CDN Cloudflare grátis cobre estáticos.

## 4. Mudanças no banco

Todas aditivas; nada quebra o PDV.

### 4.1 Alterações em tabelas existentes

**`produtos`** — colunas novas:
- `slug` VARCHAR(220) UNIQUE
- `descricao_curta` VARCHAR(500)
- `descricao_longa` TEXT
- `peso_gramas` INT NULL
- `altura_cm`, `largura_cm`, `comprimento_cm` DECIMAL(6,2) NULL
- `meta_title`, `meta_description` VARCHAR
- `og_image_path` VARCHAR NULL
- `destaque`, `novo`, `em_promocao` BOOL DEFAULT false
- `preco_promocional` DECIMAL(10,2) NULL
- `visivel_ecommerce` BOOL DEFAULT false
- `id_empresa` UNSIGNED BIGINT (default 1)
- Index FULLTEXT (`nome`, `descricao_curta`, `descricao_longa`)

**`clientes`** — colunas novas:
- `email` VARCHAR(190) UNIQUE NULL
- `email_verified_at` TIMESTAMP NULL
- `password` VARCHAR(255) NULL
- `origem` ENUM('pdv','ecommerce','ambos') DEFAULT 'pdv'
- `aceita_marketing` BOOL DEFAULT false
- `id_empresa` UNSIGNED BIGINT
- `remember_token`

**`categorias`** — colunas novas:
- `slug` VARCHAR(150) UNIQUE
- `descricao_seo` TEXT NULL
- `imagem_path` VARCHAR NULL
- `ordem` INT DEFAULT 0
- `visivel_ecommerce` BOOL DEFAULT true
- `id_categoria_pai` FK self NULL

### 4.2 Tabelas novas

**`produto_variacoes`** — `id_variacao` PK, `id_produto` FK, `sku` UNIQUE, `nome_variacao`, `atributos` JSON, `preco_venda`, `preco_promocional` NULL, `estoque_atual`, `estoque_minimo`, peso/dim opcionais (sobrescrevem pai), `ativo`. Quando produto tem variações, PDV e ecommerce vendem a variação; sem variações, vendem o produto direto.

**`enderecos_cliente`** — `id_endereco` PK, `id_cliente` FK, `apelido`, CEP/logradouro/numero/complemento/bairro/cidade/uf, `tipo` ENUM('entrega','cobranca','ambos'), `principal` BOOL.

**`carrinhos`** — `id_carrinho` PK, `token` UUID UNIQUE, `id_cliente` FK NULL, `expira_em`. Identificado por cookie `cart_token`; convertido a `id_cliente` no login.

**`carrinho_itens`** — `id_carrinho` FK, `id_produto` FK, `id_variacao` FK NULL, `quantidade`, `preco_unit_snapshot`.

**`pedidos`** — `id_pedido` PK, `numero` VARCHAR ("PED-2026-000123"), `id_cliente` FK, `id_empresa` FK, `status` ENUM('aguardando_pagamento','aguardando_retirada','pago','em_separacao','enviado','entregue','cancelado','devolvido'), `modalidade` ENUM('entrega','retirada'), `id_endereco_entrega` FK NULL, `id_ponto_venda_retirada` FK NULL, `subtotal`, `frete`, `desconto`, `total`, `id_cupom` FK NULL, `frete_servico`, `prazo_entrega_dias`, `codigo_rastreio` NULL, `etiqueta_url` NULL, `observacoes`, `id_venda` FK NULL, timestamps de transição (`pago_em`, `enviado_em`, `entregue_em`, `cancelado_em`).

**`pedido_itens`** — snapshot completo: nome, sku, preco_unit, qtd, subtotal, peso, FK opcional para produto/variação.

**`reservas_estoque`** — `id_reserva` PK, `id_pedido` FK NULL, `id_carrinho` FK NULL, `id_produto` FK, `id_variacao` FK NULL, `quantidade`, `expira_em`, `consumida_em` NULL. Estoque disponível = `estoque_atual - SUM(reservas ativas não consumidas)`.

**`pagamentos_pedido`** — `id_pagamento` PK, `id_pedido` FK, `gateway` ENUM('mercadopago','asaas','stripe','retirada_loja'), `gateway_id_externo`, `metodo` ENUM('pix','cartao_credito','boleto','dinheiro','outros'), `status` ENUM('pendente','aprovado','rejeitado','estornado'), `valor`, `dados_brutos` JSON, `processado_em`.

**`cupons`** — `id_cupom`, `codigo` UNIQUE, `tipo` ENUM('percentual','valor_fixo','frete_gratis'), `valor`, `valor_minimo_pedido`, `valido_de`, `valido_ate`, `uso_maximo`, `usos_atuais`, `ativo`.

**`pedido_eventos`** — `id_evento`, `id_pedido`, `tipo`, `descricao`, `criado_por_user_id` NULL, `criado_em`. Timeline para cliente e admin.

**`devolucoes_pedido`** + **`devolucao_itens`** — solicitação aberta pelo cliente; `status` ENUM('solicitada','aprovada','recebida','reembolsada','rejeitada').

**`banners_home`** — `id_banner`, `imagem_path`, `link`, `titulo`, `ordem`, `vigencia_de`, `vigencia_ate`, `ativo`.

### 4.3 O que não muda no PDV

`vendas`, `itens_venda`, `pagamentos_venda`, `movimentacoes_estoque`, `fluxo_caixa`, `formas_pagamento`, `contas_*` permanecem intactas. PDV continua funcionando igual no dia 0. Único acréscimo: a tela de Vendas ganha filtro de origem (PDV / Ecommerce) via JOIN com `pedidos`.

## 5. Fluxos críticos

### 5.1 Compra com entrega (caminho feliz)

1. Cliente navega `/loja` → catálogo (SSR, `GET /api/v1/produtos`).
2. `/produto/{slug}` → escolhe variação → "Adicionar ao carrinho" → `POST /api/v1/carrinho/itens` (carrinho via cookie `cart_token`).
3. `/carrinho` → revisa.
4. `/checkout`:
   - Passo 1: endereço de entrega (ViaCEP), salvo em `enderecos_cliente`.
   - Passo 2: cotação de frete (`POST /api/v1/frete/cotar` → Melhor Envio); cliente escolhe serviço.
   - Passo 3: pagamento (Pix/Cartão/Boleto via Mercado Pago Checkout Transparente).
   - Ao avançar para pagamento: `ReservarEstoqueAction` cria `reservas_estoque` (expira em 15 min — 3 dias se boleto) e cria `pedidos` com `status='aguardando_pagamento'`.
5. Cliente paga. Webhook `/api/v1/webhooks/mercadopago` → `MarcarPedidoPagoAction`:
   - `status='pago'`
   - Despacha `EmitirNotaFiscalJob` (NFe, pois é entrega)
   - Despacha `EnviarEmailConfirmacaoJob`
   - Consome reservas → cria `vendas` + `movimentacoes_estoque` (baixa real)
6. Lojista no painel admin: "Gerar etiqueta" (`GerarEtiquetaMelhorEnvioJob`) → `em_separacao` → "Marcar enviado" (insere código de rastreio) → `enviado` → e-mail ao cliente.
7. Cliente acompanha em `/conta/pedidos/{numero}`.

### 5.2 Compra com retirada

Passo 1 do checkout = escolher PDV de retirada. Sem frete. Pagamento online opcional ("pagar na retirada" cria pedido `aguardando_retirada`). No PDV: atendente abre "Retirada de pedido online" → busca por número/CPF → finaliza no PDV (cobra se necessário) → emite NFCe.

### 5.3 Estoque compartilhado seguro

Função canônica `estoqueDisponivel(produto, variacao)`:
```
estoque_atual - SUM(reservas_estoque.quantidade WHERE não consumida AND não expirada)
```

Reserva criada em transação atômica com `SELECT ... FOR UPDATE` no produto. Job `LimparReservasExpiradas` roda a cada 1 minuto.

Conflito raro (PDV vende presencial enquanto site processa pedido): PDV tem prioridade (vira movimentação imediata). Se a reserva online resultar em estoque indisponível, sistema cancela o pedido online com motivo "estoque indisponível", dispara estorno automático no MP e e-mail ao cliente.

### 5.4 Pedido → Venda (fiscal)

`EmitirNotaFiscalJob`:
- Pedido pago → cria `Venda` copiando dados
- Decide documento: `modalidade='entrega'` → NFe; `'retirada'` → NFCe
- Reusa `NfceService` existente; cria `NfeService` análogo
- Erro fiscal não cancela pagamento: pedido vai para `aguardando_revisao_fiscal`, lojista resolve no admin

### 5.5 Devolução

Cliente em `/conta/pedidos/{n}` → "Solicitar devolução" → escolhe itens e motivo → cria `devolucoes_pedido` (status `solicitada`) → e-mail ao lojista. Lojista aprova → envia etiqueta reversa (Melhor Envio). Cliente posta → admin "Marcar recebida" → estorno MP via API → `reembolsada`. Reusa `processDevolucao` existente no `PDVController`.

### 5.6 Auth do cliente

Sanctum SPA. Login: e-mail + senha. Cadastro: e-mail + senha + nome (CPF só no checkout). Recuperação por e-mail. Sessão dura 7 dias com "remember me".

## 6. Storefront Remix

### 6.1 Estrutura

```
storefront/
├── app/
│   ├── root.tsx                       # layout raiz, fontes, GA4/Pixel
│   ├── routes/
│   │   ├── _index.tsx                 # Home
│   │   ├── loja._index.tsx
│   │   ├── loja.$categoria.tsx
│   │   ├── produto.$slug.tsx
│   │   ├── carrinho.tsx
│   │   ├── checkout.{endereco,frete,pagamento,sucesso.$pedido}.tsx
│   │   ├── conta.{_index,pedidos,pedidos.$numero,enderecos,perfil,devolucoes.$numero}.tsx
│   │   ├── {login,cadastro,esqueci-senha,redefinir-senha.$token}.tsx
│   │   ├── institucional.{sobre,faq,trocas,privacidade,termos}.tsx
│   │   └── api.search.tsx
│   ├── components/{layout,catalog,product,checkout,account,ui,marketing}/
│   ├── lib/{api.server,auth.server,cart.server,seo,tracking,format}.ts
│   ├── styles/{tokens.css,tailwind.css}
│   └── types/
├── public/                            # logos, manifest, OG default
├── tailwind.config.ts
├── vite.config.ts
└── Dockerfile
```

### 6.2 Comunicação Remix ↔ Laravel

- Loaders chamam `api.server.ts` → `fetch('http://laravel:8000/api/v1/...')` na rede Docker; em dev local, `http://localhost:8000`.
- Cookie de sessão repassado de cliente → Remix loader → Laravel.
- Actions usam CSRF token do Sanctum (`GET /sanctum/csrf-cookie` no primeiro acesso).
- Cliente nunca chama Laravel direto (CORS restrito).

### 6.3 Design tokens

`tokens.css` define cores, tipografia (Manrope display + Inter body), escala 12/14/16/20/24/36/48, spacing 4/8/12/16/24/32/48/64, radii 8/12/16/9999. Identidade visual da loja (paleta e logo) será definida antes da Sprint 1 — placeholders ficam no spec.

Componentes herdam estrutura do DS Física Comigo (cards, ribbons, layout de catálogo/PDP), mas com identidade própria.

### 6.4 SEO e performance

- Cada rota define `meta()` com title/description/OG.
- JSON-LD `Product` + `BreadcrumbList` nas PDPs.
- `/sitemap.xml` e `/robots.txt` como resource routes.
- Imagens com `srcset` (thumb/medium/large via Spatie) + `loading="lazy"`.
- Cache HTTP nos loaders de catálogo (`s-maxage=300`); PDP usa ETag.

### 6.5 PWA básico

`manifest.json` instalável + service worker Workbox mínimo (cache de assets). Sem offline complexo no MVP.

### 6.6 Dev local

`docker-compose.yml` sobe `mysql`, `redis`, `php-fpm`, `nginx`, `node`. Acessos: storefront `localhost:3000`, PDV/admin/API `localhost:8000`, MySQL `localhost:3306`.

## 7. Painel admin (Laravel/Inertia)

Novo grupo `/admin/loja/*` em `pdv.dominio.com.br`. Reusa Spatie Permission com roles novos: `admin_loja`, `operador_loja`.

### 7.1 Telas

- **`/admin/loja/dashboard`** — KPIs (pedidos hoje, aguardando ação, faturamento, ticket médio, top 5), gráfico 30 dias, alertas (certificado NFe vencendo, webhook MP falhando, produtos visíveis sem foto).
- **`/admin/loja/pedidos`** — lista filtrável (status, modalidade, data, busca); drawer de detalhes; ações inline e em bulk; exportar CSV.
- **`/admin/loja/pedidos/{numero}`** — detalhe com timeline, itens, pagamento (estorno MP), frete (gerar etiqueta, marcar enviado, marcar entregue), fiscal (NFe/NFCe + reemissão), eventos, notas internas.
- **`/admin/loja/catalogo`** — estende a tela de Estoque atual: toggle `visivel_ecommerce`, edição inline de badges, painel lateral com descrição rica, galeria, SEO, peso/dim, tabela de variações.
- **`/admin/loja/categorias`** — CRUD com hierarquia drag-drop.
- **`/admin/loja/cupons`** — CRUD MVP.
- **`/admin/loja/devolucoes`** — fila + transições de estado.
- **`/admin/loja/banners`** — CRUD de banners da home com vigência.
- **`/admin/loja/clientes`** — extensão da tela atual com coluna Origem e aba "Pedidos online".
- **`/admin/loja/configuracoes`** — abas: Geral, Frete, Pagamento, E-mail SMTP, Marketing (GA4/Pixel), Fiscal, LGPD.

### 7.2 PDV: pequenas extensões

- Tela de Vendas ganha filtro de origem (PDV / Ecommerce).
- Tela de Estoque mostra coluna "Reservado" e "Disponível".
- Novo botão **"Retirada de pedido online"** no PDV → modal busca pedido → finaliza no caixa.

### 7.3 Permissões

Permissions novas: `loja.pedidos.{ver,gerenciar}`, `loja.catalogo.editar`, `loja.cupons.gerenciar`, `loja.devolucoes.gerenciar`, `loja.configuracoes.editar`, `loja.banners.gerenciar`.

### 7.4 Componentes

- Reuso: `DataTable` (TanStack), Radix Dialog/Drawer, layout Inertia, sweetalert2.
- Novos: `OrderStatusBadge`, `OrderTimeline`, `ShippingLabelButton`, `RichTextEditor` (Tiptap), `MediaGallery`, `VariationTableEditor`.

### 7.5 Notificações em tempo real

Laravel Reverb (auto-hospedado) → toast "Novo pedido pago!" para lojista logado. Pequeno custo, alto valor operacional.

## 8. Fases de entrega

7 sprints. Cada sprint terá seu próprio plano de implementação (próxima skill — `writing-plans`).

### Sprint 0 — Fundação
Docker Compose; refator Laravel para `app/Domain/*`; Sanctum + CORS; `id_empresa` nas tabelas-chave; colunas aditivas em `produtos`/`categorias`/`clientes`; scheduler `LimparReservasExpiradas`. Sem UI nova; PDV intacto.
**Pronto quando:** PDV passa em todos fluxos atuais; migrations limpas; testes verdes.

### Sprint 1 — Catálogo (API + Storefront leitura)
`produto_variacoes`; migração das 50 capas; endpoints públicos (`produtos`, `categorias`, `busca`); rotas Remix iniciais (home, catálogo, PDP, institucional); design tokens placeholder; componentes base; SEO básico; GA4 + Pixel (PageView).
**Pronto quando:** `localhost:3000` navegável, busca funciona, indexável.

### Sprint 2 — Cliente & conta
Sanctum endpoints; `enderecos_cliente`; rotas Remix de login/cadastro/conta; ViaCEP; e-mails SMTP transacionais.
**Pronto quando:** crio conta, faço login, salvo endereços, recebo e-mails.

### Sprint 3 — Carrinho & Checkout (sem pagamento)
`carrinhos`, `carrinho_itens`, `reservas_estoque`; integração Melhor Envio; `pedidos`, `pedido_itens`, `pedido_eventos`; `estoqueDisponivel()` consumida pelos dois canais; PDV ganha colunas Reservado/Disponível.
**Pronto quando:** carrinho → checkout → pedido `aguardando_pagamento` criado com frete cotado.

### Sprint 4 — Pagamento & Pedido → Venda
`PaymentGatewayInterface` + `MercadoPagoGateway`; `pagamentos_pedido`; checkout transparente (Pix/Cartão/Boleto); webhook + `MarcarPedidoPagoAction`; `EmitirNotaFiscalJob` (NFe + NFCe); telas de checkout, sucesso e conta de pedidos no Remix; `/admin/loja/pedidos`; modalidade retirada (pagar na retirada + busca no PDV).
**Pronto quando:** compra Pix end-to-end (sandbox MP) gera NFe e fica gerenciável no admin.

### Sprint 5 — Logística & Operação
Etiqueta Melhor Envio; marcar enviado + rastreio; `/admin/loja/dashboard`; `/admin/loja/clientes`; `/admin/loja/banners` + hero da home; Reverb (toast novo pedido); banner LGPD.
**Pronto quando:** lojista opera da recepção à entrega só pelo painel; cliente vê tracking.

### Sprint 6 — Devoluções & polimento
`devolucoes_pedido`; rotas Remix de devolução; `/admin/loja/devolucoes`; estorno MP; cupons MVP; PWA (manifest + SW); testes E2E (Playwright); rate limit, hardening.
**Pronto quando:** loja pronta para produção; falta apenas apontar DNS.

### Pós-MVP (Fase 2)
Wishlist, reviews, cupons avançados, fidelidade online; Asaas/Stripe; Resend/SES; multi-tenant real; Meilisearch quando volume justificar.

### Sequenciamento

```
0 → 1 → 2 → 3 → 4 → 5 → 6
        │
        └─ (paralelo: identidade visual + assets podem rodar durante 1-3)
```

## 9. Riscos e mitigações

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Overselling | Média | Alto | `SELECT ... FOR UPDATE` + `estoqueDisponivel()` canônica + PDV prioritário + estorno automático |
| R2 | Falha de emissão fiscal | Alta | Alto | Pedido vai para `aguardando_revisao_fiscal`; alerta de certificado <30 dias; job com retry |
| R3 | Webhook MP perdido | Média | Alto | Job de reconciliação diário; idempotência por `gateway_id_externo` |
| R4 | SMTP cai em spam | Alta | Médio | Documentar SPF/DKIM/DMARC; reavaliar Resend após 1º mês |
| R5 | Reserva expira em pagamento lento | Baixa | Médio | 15 min cobre Pix; boleto recebe 3 dias |
| R6 | Race no cupom de uso único | Baixa | Baixo | Incremento atômico com check |
| R7 | PDV "rouba" reserva do site | Baixa | Médio | Cancelamento automático + estorno + e-mail + alerta no dashboard |
| R8 | Refator quebra PDV | Média | Alto | Sprint 0 isolada; suite de testes manuais do PDV antes/depois |
| R9 | Performance do catálogo grande | Baixa hoje | Médio | Cache HTTP; índices; migrar para Meilisearch passando ~2k SKUs |
| R10 | Custo de hosting subestimado | Média | Médio | Métricas dia 1 (Telescope/Sentry); escala vertical antes |
| R11 | LGPD (banner cookies, privacidade) | Alta se ignorar | Alto | Coberto em Sprint 5/6 |
| R12 | CDC art. 49 (7 dias para devolver) | Alta se ignorar | Alto | Devolução integrada + texto visível em Trocas/FAQ |
| R13 | Lojista vende item já reservado | Média | Médio | Coluna "Reservado" visível no PDV + treinamento |
| R14 | Sandbox MP ≠ produção | Média | Alto | Soft launch com 1-2 produtos antes de abrir tudo |

## 10. Decisões pendentes (não bloqueiam dev imediato, mas precisam ser fechadas antes dos sprints indicados)

| Tópico | O que falta | Quando |
|---|---|---|
| Identidade visual | Paleta final, logo, nome da loja, tom de voz | Antes/durante Sprint 1 |
| Domínio real | Comprar `dominio.com.br` e apontar | Antes do go-live |
| Conta Mercado Pago | Abrir conta (CNPJ), pegar credenciais sandbox + produção | Antes da Sprint 4 |
| Conta Melhor Envio | Cadastro + token API | Antes da Sprint 3 |
| Certificado A1 NFe | Confirmar se o atual cobre NFe além de NFCe | Antes da Sprint 4 |
| CEP origem + transportadoras | Definir serviços Melhor Envio habilitados | Antes da Sprint 3 |
| Política de devolução | Prazo (mínimo 7 dias CDC), quem paga frete reverso | Antes da Sprint 6 |
| Textos institucionais | Sobre, FAQ, Trocas, Privacidade, Termos | Antes do go-live |
| Banners home | Imagens, copy, links | Sprint 5 |

## 11. Fora de escopo

- Marketplace (vários vendedores)
- ERP completo (CRM, BI)
- Integração com Mercado Livre, Shopee, Amazon
- Chat ao vivo no site (apenas link de WhatsApp no rodapé)
- App PDV mobile separado
- Multi-tenant real (apenas "ready" no schema)
