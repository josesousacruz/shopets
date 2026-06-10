# Ecommerce — Sprint 6 (Retirada + Devoluções + PWA + E2E + Hardening + Institucional) Plan

> Branch: `ecommerce-sprint-6`. Fechamento do MVP. Execução via subagentes.

**Decisões do cliente:**
- Retirada: flag `permite_retirada` por PDV; cliente escolhe entre os habilitados; paga **online OU no balcão** (escolhe).
- Devoluções: cliente solicita em `/conta`; lojista gerencia em `/painel/devolucoes` (design da loja); reusa lógica de devolução do PDV + estorno Mercado Pago.
- Também: PWA, testes E2E (Playwright), hardening, páginas institucionais com conteúdo real (gerar rascunhos pt-BR).

**Já pronto (não refazer):** backend de retirada parcial (checkout aceita modalidade=retirada+id_pdv; EmitirNotaFiscalJob roteia retirada→NFCe). Falta o endpoint de PDVs, UI, pagar-no-balcão e a retirada no PDV.

---

## FASE A — Backend

### A1 — Retirada: pontos de venda
- Migration: add `permite_retirada` bool default false em `pontos_venda`. Seeder marca o PDV "Loja Online" e/ou o principal como permite_retirada=true (ajustável pelo lojista).
- Público `GET /api/v1/pontos-retirada` → PDVs com `permite_retirada=true && ativo` (nome, endereco, telefone). Pro checkout.
- Painel: no CRUD/config, toggle `permite_retirada` por PDV (endpoint admin simples ou via ConfiguracaoController). 
- Teste: lista só habilitados.

### A2 — Retirada: checkout pagar-online-ou-no-balcão
- `CheckoutController`/`IniciarCheckoutAction`: modalidade=retirada → exige `id_pdv` (valida que permite_retirada). Sem frete. Novo campo `pagamento_modo` em pedidos: `online|na_retirada`.
  - `online`: fluxo normal (gera cobrança Pix etc; ao pagar → NFCe + reserva consumida como hoje).
  - `na_retirada`: pedido nasce status `aguardando_retirada` (enum já existe), reserva criada, SEM cobrança online. Estoque só baixa na retirada efetiva.
- Migration: add `pagamento_modo` enum em pedidos.
- Teste: retirada online cria pedido aguardando_pagamento; retirada na_retirada cria aguardando_retirada sem pagamento.

### A3 — Retirada no PDV (atendente finaliza)
- Endpoint `POST /api/v1/painel/pedidos/{numero}/retirar` (admin) OU integração no PDV: busca pedido por número/CPF, e:
  - se `na_retirada`: registra pagamento (forma escolhida no balcão), promove em Venda (PromoverPedidoEmVendaAction) → baixa estoque + NFCe; status → entregue.
  - se já pago online: só confirma retirada (status entregue) + garante NFCe emitida.
- Reusa `PromoverPedidoEmVendaAction` + `EmitirNotaFiscalJob`.
- Teste: retirar pedido na_retirada cria venda + baixa estoque + NFCe; pedido pago online só finaliza.

### A4 — Devoluções
- Migrations: `devolucoes_pedido` (id, id_pedido FK, id_cliente, motivo text, status enum(solicitada|aprovada|recebida|reembolsada|rejeitada), valor_reembolso, criado_em...) + `devolucao_itens` (id_devolucao, id_pedido_item, quantidade).
- Models `DevolucaoPedido`, `DevolucaoItem`.
- Cliente: `POST /api/v1/pedidos/{numero}/devolucao` (auth cliente, escopado) — só pedidos entregues/enviados, dentro do prazo (CDC 7 dias após entrega), escolhe itens+motivo → cria devolucao status solicitada + e-mail lojista.
- Admin (painel): `GET /api/v1/painel/devolucoes` (fila), `PUT .../{id}/aprovar|rejeitar|receber|reembolsar`. Reembolsar → `PaymentGatewayInterface::estornar` (fake aprova; MP real depois) + status reembolsada + (opcional) devolve estoque reusando a lógica de devolução do PDV.
- Teste: solicitar (prazo válido/expirado), transições admin, estorno via gateway fake.

### A5 — Hardening
- Rate limits nos endpoints sensíveis que ainda não têm (cupom, devolução, checkout, webhooks) via `throttle`.
- Validação: garantir FormRequests/validate em todos os POST/PUT públicos; sanitização.
- Logs: logar eventos críticos (pagamento, fiscal, estorno) — checar se já há; complementar.
- Teste: rate limit dispara após N tentativas em login/cupom.

### A6 — Regressão
- `php artisan test` verde; só 6 pré-existentes; PDV/cliente/painel intactos.

---

## FASE B — Frontend

### B1 — Checkout retirada
- `checkout.tsx`: habilitar "Retirar na loja" → carrega `GET /pontos-retirada`, cliente escolhe PDV; some o passo de frete; escolhe **pagar online** ou **pagar na retirada**. Resumo ajusta (sem frete). Confirma → checkout/iniciar com modalidade=retirada + id_pdv + pagamento_modo.
- Sucesso: se na_retirada, mostra "Retire na loja X — pague no balcão"; se online, segue pro Pix.

### B2 — Devoluções
- `conta.pedidos.$numero`: botão "Solicitar devolução" (quando elegível: entregue + dentro do prazo) → form (itens + motivo) → POST devolução; mostra status da devolução.
- `conta.devolucoes._index` (ou dentro de pedidos): lista das solicitações do cliente.
- Painel: `painel.devolucoes._index` (fila + detalhe + transições aprovar/rejeitar/receber/reembolsar) no design refinado; sidebar ganha "Devoluções".

### B3 — Páginas institucionais com conteúdo real
- Preencher `institucional.{sobre,faq,trocas,privacidade,termos}` com conteúdo pt-BR real pra loja de capas/acessórios (Trocas seguindo CDC art.49 7 dias; Privacidade LGPD). Conteúdo de rascunho editável.

### B4 — PWA
- `manifest.json` (nome, ícones 192/512, theme, standalone) + service worker (Workbox ou simples) com cache de assets estáticos + offline básico (página offline). Registrar no root. Ícones placeholder.

### B5 — Regressão front
- typecheck + build ok; design refinado mantido.

---

## FASE C — Testes E2E (Playwright)
- Setup Playwright no storefront (ou na raiz) apontando pra :3000 + API :8888 (driver fake de pagamento).
- Fluxos: (1) cadastro+login cliente; (2) navegar catálogo→produto→adicionar→carrinho→checkout entrega→pagar Pix (aprovar via endpoint dev)→pedido pago; (3) checkout retirada na_retirada→aguardando_retirada; (4) solicitar devolução de um pedido entregue.
- Rodar headless; documentar comando.

---

## Critérios de pronto (MVP fechado)
- Retirada: cliente escolhe loja habilitada, paga online ou no balcão; atendente finaliza retirada no painel/PDV (venda+estoque+NFCe)
- Devoluções: cliente solicita na conta; lojista gerencia no painel; estorno via gateway
- Institucional com conteúdo real (CDC/LGPD)
- PWA instalável
- E2E cobrindo os fluxos-chave, verdes
- Hardening (rate limits/validação/logs)
- Suite verde; PDV/cliente/painel intactos; design refinado
- **MVP pronto pra produção — falta só DNS + credenciais reais (MP/ME/cert NFe)**
