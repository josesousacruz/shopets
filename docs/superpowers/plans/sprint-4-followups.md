# Sprint 4 — Follow-ups

Review final: CHANGES_REQUESTED → corrigido o bloqueante (B1); aprovado. Itens abaixo ficam pra trabalho futuro.

## Aplicados nesta sprint
- ✅ **B1 (bloqueante):** endpoint dev `/dev/pagamentos/{id}/aprovar` agora gateado por `abort_unless(environment(['local','testing']))`. A lógica anterior (`!local && driver!=fake`) nunca abortava em produção porque o driver default é `fake` — qualquer cliente marcaria o próprio pedido como pago sem pagar. Corrigido.
- ✅ Infra ecommerce: CPF único pro usuário-sistema.
- ✅ Venda do ecommerce com `id_cliente=null` (contorna o trigger de crédito).

## Pendentes (antes do go-live de pagamento)

### 1. Assinatura do webhook Mercado Pago (segurança — obrigatório antes de produção)
`WebhookPagamentoController` confia no `status` do corpo da requisição e é público. Em modo fake (dev) tudo bem, mas com o MP real um atacante que adivinhe o `gateway_id` poderia forjar aprovação. **Validar a assinatura do MP antes de qualquer mudança de status** quando `driver=mercadopago`.

### 2. Fidelidade no ecommerce (re-vincular cliente à venda)
Como a venda do ecommerce nasce com `id_cliente=null` (pra escapar do `tr_validar_limite_credito`), o trigger `tr_calcular_pontos_fidelidade` não credita pontos. Solução: escopar `tr_validar_limite_credito` para validar crédito **apenas em vendas fiado/crediário** (não nas pré-pagas), e então voltar a gravar `id_cliente` na venda do ecommerce. Isso re-ativa pontos + histórico fiscal com destinatário. (Fidelidade no ecommerce é Fase 2, mas o re-link destrava.)

### 3. Idempotência do `pagar`
`PagamentoController::pagar` lê o pagamento pendente sem lock antes da transação — duas chamadas rápidas podem criar 2 linhas `pagamentos_pedido`. Baixo impacto (aprovação é idempotente), mas um índice único `(id_pedido, status pendente)` ou lock fecharia.

### 4. Mercado Pago real
`MercadoPagoGateway` é esqueleto (lança quando usado sem token). Implementar charge/refund/status reais + `config services.payment.driver=mercadopago` + credenciais. (Pix QR real, cartão, boleto.)

### 5. NFe real (entrega)
`NfeService` é esqueleto; emissão de NFe pra entregas cai em `aguardando_revisao_fiscal`. Precisa de certificado A1 + homologação SEFAZ. NFCe (retirada) já passa pelo `NfceService` existente.

### 6. Worker de fila pra emissão fiscal
`EmitirNotaFiscalJob` é `ShouldQueue` com `QUEUE_CONNECTION=database`. Em dev/prod precisa de `php artisan queue:work` rodando (ou supervisor) pra a transição fiscal acontecer. Documentar no deploy.

### 7. Estorno no cancelamento (admin)
A ação `cancelar` no painel admin muda status + evento, mas ainda não dispara estorno no gateway. Ligar `PaymentGatewayInterface::estornar` quando o pedido cancelado já estiver pago. (Devolução completa é Sprint 6.)
