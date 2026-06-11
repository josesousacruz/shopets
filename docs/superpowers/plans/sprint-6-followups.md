# Sprint 6 — Follow-ups

Review final: APPROVED_WITH_FOLLOWUPS. Sem bloqueantes. MVP fechado.

## Aplicado
- ✅ Bug do checkout: telas de pagamento/sucesso saíam do ar (estavam sob o guard de carrinho vazio) — renomeadas pra `checkout_.*`. Verificado por E2E (spec 02 passa pelo Pix completo → "Pagamento confirmado" → pedido Pago).
- ✅ Parênteses na condição de registro do service worker (clareza).
- ✅ E2E apertado: spec 02 (Pix completo) e spec 04 com setup real (pedido entregue via API) + skip honesto. Estado: 3 passam (cadastro/Pix/retirada) + 1 skip (devolução).

## Investigar (observado na automação E2E)
- **Detalhe do pedido na automação**: navegar pro `/conta/pedidos/{numero}` no browser automatizado às vezes cai na lista `/conta/pedidos`. **Server-side está OK** — curl full-load e o request `_data` retornam 200 com os dados corretos (status entregue, itens). Parece artefato de timing SPA/hidratação/cookie da automação, não bug server. Mesmo assim, vale uma verificação manual: logar como cliente, clicar num pedido e confirmar que o detalhe abre e o botão "Solicitar devolução" aparece em pedidos enviado/entregue. (A devolução em si é coberta por 14 testes de backend Sprint 6.)

## Pendentes (não-bloqueantes)
1. **Apertar o E2E spec 02** — agora que o fix do carrinho-guard está estável, exigir `chegouNoPagamento` e assertar `Pago` (hoje aceita "Pago OU Aguardando" defensivamente, o que poderia mascarar regressão futura desse exato bug).
2. **Ícone PNG maskable no manifest** — hoje só SVG; alguns checks de PWA (Lighthouse/Android) preferem um PNG 512 maskable.
3. **Devolução E2E (spec 04)** — fica em skip por falta de pedido entregue elegível criável puro-UI. Cobrir via seed dedicado ou setup de API no teste.
4. **conta.pedidos.$numero bounce** (observado no E2E) — investigar se a página de detalhe de pedido redireciona em algum caso (pode ser só dado de teste de outro cliente; confirmar).

## Decisões/credenciais do cliente que destravam produção (recapitulando)
- Mercado Pago (sandbox + produção) → pagamento real
- Melhor Envio (token) → frete + etiqueta reais
- Certificado A1 cobrindo NFe → NFe de entrega
- Domínio + DNS (dominio.com.br = loja, pdv.dominio.com.br = PDV)
- SMTP real (hoje log) — reavaliar Resend/SES (risco de spam do SMTP próprio)
- Conteúdo final: textos institucionais (revisar jurídico), imagens reais de produto + banners
