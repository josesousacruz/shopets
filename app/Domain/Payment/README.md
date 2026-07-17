# Domain: Payment

Abstração de gateway de pagamento.

## Namespace
`App\Domain\Payment`

## Componentes
- `PaymentGatewayInterface` — `criarCobranca`, `consultarStatus`, `estornar`.
- `FakePaymentGateway` — driver padrão (dev/testes); Pix fake + aprovação manual.
- `MercadoPagoGateway` — Mercado Pago, Pix via API de Payments.
- `YapayGateway` — Yapay Intermediador (LWSA / Vindi Pagamentos), Pix e boleto.

## Driver
Configurado pela tela **Configurações → Pagamento** no painel (não mais `.env`) —
`payment_driver` (`fake` padrão | `yapay` | `mercadopago`); as credenciais
(`yapay_token_account`/`yapay_sandbox`, `mercadopago_access_token`/`mercadopago_sandbox`)
ficam em `configuracoes_empresa` (tokens encriptados, nunca devolvidos pela API — só as
flags `yapay_configurado`/`mercadopago_configurado`). Resolvido em
`AppServiceProvider::register()`.

## Mercado Pago
Pix via `POST /v1/payments` (`payment_method_id=pix`, header `X-Idempotency-Key`),
status via `GET /v1/payments/{id}`, estorno via `POST /v1/payments/{id}/refunds`.

- **Não existe URL de sandbox**: o ambiente é decidido pelas CREDENCIAIS — access token
  (`APP_USR-...`) de conta de teste roteia automaticamente pro ambiente de teste
  (prefixo `TEST-` é legado). O flag `mercadopago_sandbox` da tela é aviso/validação de
  qual tipo de token colar, não muda endpoint.
- Retorno do Pix: `point_of_interaction.transaction_data.qr_code` (copia-e-cola) e
  `qr_code_base64` (imagem, exposta como data URI em `pix_qr`).
- Cartão/boleto exigem tokenização no front (Checkout Bricks) — fase 2.
- Webhook: além das duas camadas gerais (abaixo), valida o header `x-signature`
  (HMAC-SHA256 de `id:...;request-id:...;ts:...;`) quando o secret de assinatura está
  configurado — pela tela (campo write-only `mercadopago_webhook_secret`) ou
  `MERCADOPAGO_WEBHOOK_SECRET` no `.env` como fallback.

## Yapay (LWSA)
Gateway do grupo LWSA (marca atual: Vindi Pagamentos). Auth por `token_account` no
corpo da requisição.

- Endpoint: `POST /api/v3/transactions/payment`
  (sandbox `api.intermediador.sandbox.yapay.com.br`, prod `api.intermediador.yapay.com.br`).
- `payment_method_id`: 3/4 = cartão, **6 = boleto, 27 = Pix**, 28 = Bolepix.
- Ativar: tela Configurações → Pagamento → selecionar "Yapay", colar o `token_account` da
  conta e desmarcar "Homologação" quando for cobrar de verdade (sandbox=true é o padrão).
- Métodos suportados hoje: **Pix e boleto**. Cartão exige checkout hospedado (fase 2 —
  a interface `criarCobranca(Pedido, metodo)` não recebe dados de cartão; evita escopo PCI).
- Status: normalizado de `status_name` (PT) → `pendente|aprovado|rejeitado|estornado`.
- Notificação: o webhook (`url_notification`) chega no `WebhookPagamentoController`, que já
  lê `transaction_id`/`status_name` do Yapay. É o canal primário de status em produção.

⚠️ A confirmar em sandbox antes do go-live: endpoints de `consultarStatus`
(`get_by_transaction_id`) e `estornar` (`refund`) — implementados conforme a convenção do
Intermediador, mas não validados contra a API real.

## Processamento
Webhook idempotente por `gateway_id_externo`; aprovado dispara `MarcarPedidoPagoAction`.

### Segurança do webhook
A API "Intermediador" da Yapay não documenta assinatura/hash nas notificações (isso só
existe na API de assinaturas mais nova da Vindi). E o `gateway_id` volta pro cliente na
resposta do checkout (`PagamentoController::pagar`), então o corpo do POST sozinho não é
confiável — qualquer cliente logado poderia forjar a aprovação do próprio pedido. Duas
camadas:

1. **`wh_secret` na query string** — `PAYMENT_WEBHOOK_SECRET` no `.env`, embutido pelo
   `YapayGateway` na `url_notification` e exigido em toda chamada ao webhook. Fail-closed:
   sem o env configurado, o webhook rejeita tudo.
2. **Reconfirmação** — para gateways reais, o status gravado nunca vem do corpo do POST;
   vem de `consultarStatus($gatewayId)` chamado de volta no gateway. O body vira só o
   "toque de campainha" (indica qual `gateway_id` mudou). `FakePaymentGateway` (dev/teste)
   não tem uma fonte externa pra reconfirmar contra e continua confiando no body — mas
   ainda exige o secret.

Falha de secret responde 200 (não dá pista pro chamador) e loga como tentativa suspeita,
separado do log de "gateway_id desconhecido".

## Testes
- `tests/Feature/Integracao/YapayGatewayTest.php` — cobrança Pix/boleto, status, webhook
  Yapay (incluindo secret ausente e status forjado no corpo).
- `tests/Feature/Integracao/MercadoPagoGatewayTest.php` — cobrança Pix, status, estorno,
  webhook com x-signature (válida, inválida, ausente e secret não configurado).
- `tests/Feature/Sprint4/WebhookPagamentoTest.php` — fluxo aprovado → venda (idempotente),
  secret ausente/errado, reconfirmação via gateway real.
