# Ecommerce — Sprint 4a (Pagamento + Webhook + Pedido→Venda) Plan

> Execução via subagent-driven-development. Branch: `ecommerce-sprint-4`.

**Goal:** Fechar o ciclo de compra: pagamento (Mercado Pago atrás de interface, com gateway fake pra dev), webhook idempotente, e a ponte pedido pago → Venda + baixa de estoque real. Emissão fiscal best-effort não-bloqueante.

**Decisão de arquitetura:**
- `PaymentGatewayInterface` (charge, refund, consultarStatus) + `FakePaymentGateway` (dev: aprova Pix na hora, gera QR fake) + `MercadoPagoGateway` (esqueleto, usado quando `services.payment.driver=mercadopago` + token).
- Pagamento por token/cliente; Pix é o foco do MVP dev (cartão/boleto = estrutura pronta).
- **Ponte fiscal:** `PromoverPedidoEmVendaAction` cria a Venda + consome reservas → movimentação real. `EmitirNotaFiscalJob` tenta emitir (NFCe via NfceService p/ retirada); se NFe (entrega) ou falha/não-configurado → pedido vai pra `aguardando_revisao_fiscal` (não bloqueia, não cancela pagamento). NFe real depende de cert/homologação (followup).

**Constraint da tabela `vendas`:** exige `id_usuario` (users) e `id_pdv` (pontos_venda) NOT NULL. Criar/garantir um **usuário-sistema "ecommerce"** e um **PDV "Loja Online"** via seeder, e usar nas vendas de origem ecommerce.

**Spec:** Sprint 4 (seção 8) + fluxos 5.4. **READ** `app/Services/NfceService.php`, `app/Http/Controllers/PDVController.php` (storeSale/finalizarVenda) e migrations de `vendas`/`itens_venda`/`pagamentos_venda`/`movimentacoes_estoque` antes de implementar a ponte.

---

## Tasks

### T1 — Usuário-sistema + PDV ecommerce (seeder)
- `EcommerceInfraSeeder`: cria (firstOrCreate) user `ecommerce@sistema.local` (nivel_acesso admin, ativo) e PontoVenda "Loja Online" (id guardado em config/setting). Idempotente.
- Helpers `config('ecommerce.system_user_id')` / `config('ecommerce.pdv_id')` resolvidos por e-mail/nome (ou settings).
- Teste: seeder cria ambos; re-rodar não duplica.

### T2 — pagamentos_pedido + PaymentGatewayInterface + FakeGateway
- Migration `pagamentos_pedido` (id, id_pedido FK, gateway enum(mercadopago|asaas|stripe|fake|retirada_loja), gateway_id_externo nullable, metodo enum(pix|cartao_credito|boleto|dinheiro|outros), status enum(pendente|aprovado|rejeitado|estornado), valor decimal, dados_brutos json, processado_em ts, timestamps; index gateway_id_externo).
- `App\Domain\Payment\Shipping... ` → `App\Domain\Payment\PaymentGatewayInterface`: `criarCobranca(Pedido, metodo): array{gateway_id, status, pix_qr?, pix_copia_cola?, boleto_url?}`, `consultarStatus(gatewayId): string`, `estornar(gatewayId, valor): bool`.
- `FakePaymentGateway`: cria cobrança "pendente" com QR/copia-cola fake; método `aprovarManualmente(gatewayId)` pra simular pagamento (usado em dev/teste e por um endpoint dev). Determinístico.
- `MercadoPagoGateway`: esqueleto implementando a interface (lança/loga "configurar token"); bind por `config('services.payment.driver','fake')`.
- Model `PagamentoPedido`.
- Teste: cria cobrança fake (pendente, com QR); estrutura da interface.

### T3 — Endpoint de pagamento + webhook + MarcarPedidoPagoAction
- `POST /api/v1/pedidos/{numero}/pagar` (auth cliente, escopado) {metodo} → cria PagamentoPedido via gateway, retorna dados (QR Pix etc). Idempotente: se já há pagamento aprovado, 409/200.
- `POST /api/v1/webhooks/pagamento` (público, sem auth; valida assinatura quando MP real) → identifica pagamento por gateway_id_externo, atualiza status; se aprovado → `MarcarPedidoPagoAction`.
- DEV: `POST /api/v1/dev/pagamentos/{gatewayId}/aprovar` (só quando `app.debug`/driver=fake) → simula o webhook de aprovação (pro smoke/teste sem MP).
- `MarcarPedidoPagoAction` (idempotente por estado do pedido):
  1. Se pedido já pago/processado, no-op.
  2. status pedido = `pago`, `pago_em`=now; evento "pagamento confirmado".
  3. Dispara `PromoverPedidoEmVendaJob` (ou inline em transação) + `EnviarEmailPagamentoConfirmado`.
- Teste: pagar cria pagamento pendente; webhook aprovado marca pedido pago + dispara venda; webhook duplicado é idempotente.

### T4 — PromoverPedidoEmVendaAction (ponte → Venda + estoque)
- Em transação:
  1. Cria `Venda` (numero_venda gerado, id_cliente, id_usuario=system, id_pdv=ecommerce, valor_subtotal/desconto/total do pedido, status='finalizada', observacoes "Pedido {numero}").
  2. Cria `itens_venda` a partir de `pedido_itens`.
  3. Cria `pagamentos_venda` a partir do PagamentoPedido (mapeia método → forma_pagamento).
  4. Baixa estoque: cria `movimentacoes_estoque` tipo 'venda' por item (consome a reserva: marca `reservas_estoque.consumida_em`=now; decrementa `produtos.estoque_atual`/variação). **Atenção aos triggers existentes** — se o trigger de estoque dispara em itens_venda/venda finalizada, NÃO duplicar a baixa: detectar e usar o mecanismo existente (ler PDVController.finalizarVenda pra replicar o caminho oficial). Preferir reusar a lógica do PDV.
  5. Liga `pedidos.id_venda` = venda criada.
  - Idempotente: se pedido.id_venda já setado, no-op.
- Teste: pedido pago vira venda com itens; estoque_atual decrementa; reserva consumida; re-rodar não duplica.

### T5 — EmitirNotaFiscalJob (best-effort, não-bloqueante)
- Job despachado após a venda criada. Decide doc: modalidade 'retirada' → NFCe (via NfceService::emitir com dados da venda); 'entrega' → NFe (NfeService — esqueleto; por ora marca revisão).
- Sucesso: grava chave/numero no pedido (campos `nfe_chave`/`nfe_numero` — migration adiciona) + evento.
- Falha/não-configurado: status pedido `aguardando_revisao_fiscal` + evento + log; NÃO cancela pagamento nem a venda.
- `NfeService` esqueleto documentado (precisa cert A1 + homologação).
- Teste: com NfceService fakeado, retirada emite e grava chave; entrega/erro → aguardando_revisao_fiscal (venda permanece).

### T6 — E-mails de status
- Mailables (ShouldQueue, MAIL_MAILER=log em dev): `PedidoRecebido` (na criação — pode ligar no checkout/iniciar), `PagamentoConfirmado`, `StatusPedidoAtualizado`. pt-BR.
- Teste: Mail::fake — pagar dispara PagamentoConfirmado.

### T7 — Regressão + review
- `php artisan test` — Sprint 0-4a verdes; só 6 falhas pré-existentes; PDV intacto (vendas/estoque/triggers).
- Review: idempotência (webhook, marcar pago, promover venda); sem dupla baixa de estoque; fiscal não-bloqueante; resources sem vazar; escopo por cliente; gateway fake isolado de produção por config.

## Critérios de pronto 4a
- Pagar pedido (Pix fake) → webhook/aprovação → pedido `pago` → Venda criada + estoque real baixado + reserva consumida
- Idempotente em todas as transições
- Emissão fiscal tentada (NFCe retirada) ou `aguardando_revisao_fiscal` sem quebrar
- E-mails de status (log em dev)
- Usuário-sistema + PDV ecommerce via seeder
- Suite verde; PDV/triggers intactos; MercadoPagoGateway plugável por config
