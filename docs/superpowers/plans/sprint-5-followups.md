# Sprint 5 — Follow-ups

Review final: APPROVED_WITH_FOLLOWUPS. Sem bloqueantes — escopo todo correto.

## Pendentes (quando o Melhor Envio real for ligado)
1. **Lock no GerarEtiquetaAction** — o short-circuit de idempotência roda fora de transação. Com o stub é inofensivo, mas quando `MelhorEnvioService::gerarEtiqueta` (compra real de etiqueta) for chamado, duas requisições simultâneas pro mesmo pedido poderiam passar o check e comprar etiqueta em dobro. Adicionar `lockForUpdate` no pedido antes da compra real.
2. **Caminho real do Melhor Envio não exercitado** — `gerarEtiqueta`/`rastrear` do `MelhorEnvioService` estão implementados mas o `GerarEtiquetaAction` ainda usa o placeholder (stub). Quando o token ME chegar: `services.shipping.driver=melhorenvio` + ligar a ação ao service real + teste com Http::fake.
3. **Desconto exibido no carrinho é advisory** — o valor autoritativo é recomputado no checkout (correto). Sem ação necessária; só ciência.

## Decisões pendentes do cliente (destravam produção)
- Token Melhor Envio (sandbox) — destrava frete/etiqueta reais.
- Credenciais Mercado Pago — destrava pagamento real (Sprint 4).
- Certificado A1 cobrindo NFe — destrava NFe de entrega (Sprint 4).
- Imagens reais dos banners da home (hoje gerenciáveis no painel, vazio = hero estático).
