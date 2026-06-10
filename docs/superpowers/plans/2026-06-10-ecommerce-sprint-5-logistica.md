# Ecommerce — Sprint 5 (Logística + Banners + LGPD) Plan

> Branch: `ecommerce-sprint-5`. Execução via subagentes.

**Goal:** Fechar a operação logística (etiqueta/rastreio, Melhor Envio real atrás de flag), banners gerenciáveis na home, e o banner LGPD de cookies. Dashboard da loja e gestão de pedidos já existem (PDV + painel storefront) — esta sprint complementa.

**Já entregue antes (não refazer):** dashboard com KPIs (painel storefront), gestão/transição de pedidos (PDV `/admin/loja` + painel `/painel/pedidos`), clientes com origem.

---

## FASE A — Backend

### A1 — Etiqueta + rastreio (campos já existem em pedidos: codigo_rastreio, etiqueta_url)
- `Domain\Shipping`: `GerarEtiquetaAction` — gera etiqueta (no stub: retorna URL fake/placeholder + marca o pedido; com Melhor Envio real: cria no ME). Salva `etiqueta_url`.
- Já existe transição `enviar` recebendo `codigo_rastreio` (Sprint 4 `TransicionarPedidoAction`). Garantir que grava rastreio + dispara e-mail `PedidoEnviado` com link de rastreamento.
- Endpoint admin: `POST /api/v1/painel/pedidos/{numero}/etiqueta` (gera etiqueta). 
- Teste: gerar etiqueta grava url+evento; enviar grava rastreio + dispara e-mail (Mail::fake).

### A2 — Melhor Envio real (atrás de flag, sem token = stub)
- `MelhorEnvioService implements ShippingQuoteInterface` (cotar real via API) — só ativa com `config('services.shipping.driver')==='melhorenvio'` + token. Default continua `StubShippingService`.
- Esqueleto de `cotar`, `gerarEtiqueta`, `rastrear` chamando a API ME (sandbox). Sem token → lança/loga "configurar MELHORENVIO_TOKEN".
- `.env.example`: MELHORENVIO_TOKEN, MELHORENVIO_SANDBOX.
- Teste: bind por config; stub continua default e passa nos testes existentes.

### A3 — banners_home (tabela + CRUD admin)
- Migration `banners_home`: id, id_empresa, titulo, subtitulo nullable, imagem_path nullable, link, ordem, ativo, vigencia_de nullable, vigencia_ate nullable, timestamps.
- Model `BannerHome` (+ BelongsToEmpresa). Scope `vigentes` (ativo && dentro da vigência).
- Admin: `Api\V1\Painel\BannerController` CRUD (auth:sanctum+admin) + upload de imagem (Spatie ou path).
- Público: `GET /api/v1/banners` (vigentes, ordenados) pro storefront.
- Teste: CRUD; só vigentes no público.

### A4 — Cupons (tabela + validação) — habilita Configurações>Cupons do painel
- Migration `cupons`: id, id_empresa, codigo unique, tipo enum(percentual|valor_fixo|frete_gratis), valor, valor_minimo_pedido, valido_de, valido_ate, uso_maximo, usos_atuais, ativo.
- Model `Cupom` + `validarPara(subtotal): {valido, desconto, motivo}`.
- Admin: `Api\V1\Painel\CupomController` CRUD.
- Aplicar no checkout: `POST /api/v1/carrinho/cupom {codigo}` valida e guarda no pedido (campo id_cupom já existe em pedidos); IniciarCheckoutAction aplica desconto.
- Teste: cupom percentual/fixo/frete_gratis; expirado/uso_maximo rejeita; desconto reflete no total.
(Obs: o spec colocou cupons na Sprint 6, mas como o painel já tem a aba "Cupons em breve", habilitar aqui fecha essa lacuna. Se ficar grande, mover pra Sprint 6.)

### A5 — Regressão
- `php artisan test` verde; PDV/cliente/painel intactos.

---

## FASE B — Frontend

### B1 — Rastreio na conta do cliente
- `conta.pedidos.$numero`: quando enviado, mostra código de rastreio + link (Melhor Envio/Correios) + status "Enviado".
- Timeline de status do pedido na conta.

### B2 — Banners na home + gestão no painel
- Home (`_index`): hero/carrossel consome `GET /api/v1/banners` (vigentes); fallback pro hero estático atual se vazio.
- Painel: `painel.banners._index` (CRUD com upload, ordem, vigência) no padrão refinado.
- Configurações do painel: aba Banners deixa de ser "em breve".

### B3 — LGPD (banner de cookies)
- Componente `CookieConsent` no root do storefront: banner discreto (aceitar/recusar), persiste em cookie/localStorage, navy/mint. Liga/desliga os scripts de analytics (GA4/Pixel) conforme consentimento.
- Página `institucional.privacidade` já existe (placeholder) — referenciar.

### B4 — Cupom no carrinho/checkout
- Campo "cupom de desconto" no carrinho/checkout → `POST /carrinho/cupom`; mostra desconto aplicado; painel Configurações>Cupons CRUD.

---

## Critérios de pronto
- Lojista gera etiqueta + marca enviado com rastreio; cliente vê rastreamento + e-mail
- Melhor Envio real plugável por flag (stub default intacto)
- Banners gerenciáveis no painel aparecem na home (vigência respeitada)
- Banner LGPD funcional ligando/desligando analytics
- Cupons CRUD + aplicação no checkout (desconto no total)
- Suite verde; PDV/cliente/painel intactos; design refinado mantido
