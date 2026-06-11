# Testes E2E (Playwright) — Storefront

Cobrem os fluxos-chave do Sprint 6 (Fase C):

| Spec | Fluxo |
|------|-------|
| `01-cadastro-login.spec.ts` | Cadastro de cliente, logout e login |
| `02-compra-pix.spec.ts` | Compra com entrega → checkout → criação do pedido (Pix) |
| `03-retirada.spec.ts` | Retirada na loja, pagar no balcão (`aguardando_retirada`) |
| `04-devolucao.spec.ts` | Solicitação de devolução (best-effort, `skip` se sem pedido elegível) |

## Pré-requisitos

Os specs **não** sobem servidores — assumem que já estão de pé:

- Storefront (Remix) em `http://localhost:3000`
  ```bash
  cd storefront && npm run dev
  ```
- API (Laravel) em `http://127.0.0.1:8888`, com driver de pagamento `fake`
  ```bash
  php artisan serve --port=8888
  ```

Conferir:
```bash
curl -s http://localhost:3000 -o /dev/null -w "%{http_code}\n"          # 200
curl -s http://127.0.0.1:8888/api/v1/categorias -o /dev/null -w "%{http_code}\n"  # 200
```

Os specs de compra usam o cliente seeded `almir.smoke@example.com` / `senha12345`
(que já possui endereço). O spec de cadastro cria um e-mail único por execução.

## Instalação do browser

```bash
cd storefront
npm i               # instala @playwright/test (já está em devDependencies)
npx playwright install chromium
```

## Rodar

```bash
cd storefront
npm run e2e          # headless (chromium)
npm run e2e:headed   # com janela do browser
npx playwright test e2e/02-compra-pix.spec.ts   # um spec só
npx playwright show-report                       # relatório HTML do último run
```

## CI

`playwright.config.ts` traz um bloco `webServer` comentado: descomente para
que o CI suba o storefront automaticamente (a API/seed precisa estar disponível).

## Notas / limitações conhecidas

- **Banner de cookies**: os specs pré-gravam o consentimento no `localStorage`
  (`shopets_cookie_consent=rejected`) para o banner fixo não interceptar cliques.
- **Tela de pagamento Pix**: as rotas `/checkout/pagamento` e `/checkout/sucesso`
  são filhas de `/checkout`, cujo loader redireciona para `/carrinho` quando o
  carrinho está vazio. Como confirmar o pedido **esvazia o carrinho**, o guard do
  pai frequentemente "vence" o redirect da action e a tela de Pix fica
  inalcançável por navegação. Por isso `02-compra-pix` valida de forma estável a
  **criação do pedido** (`aguardando_pagamento`, modalidade Entrega) e só executa
  a simulação de pagamento Pix → "Pagamento confirmado" quando consegue alcançar
  a tela. Vale revisar esse guard na Fase B (frontend).
- **Devolução**: exige um pedido `enviado`/`entregue` dentro do prazo (CDC 7 dias)
  com a tela de detalhe acessível. Sem isso, o spec faz `test.skip` (best-effort).
