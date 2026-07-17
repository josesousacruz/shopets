# Domain: Shipping

Cotação e contratação de frete via Melhor Envio.

## Namespace
`App\Domain\Shipping`

## Componentes
- `ShippingQuoteInterface` — contrato de cotação (`cotar`).
- `StubShippingService` — driver padrão (PAC/SEDEX fake) para dev/testes.
- `MelhorEnvioService` — integração real (cotação, etiqueta, rastreio).
- `MelhorEnvioTokenManager` — ciclo OAuth2 do Melhor Envio (troca de code, refresh,
  storage dos tokens na `ConfiguracaoEmpresa`).
- `GerarEtiquetaAction` — ponto de entrada único pra gerar etiqueta de um pedido:
  tenta a compra real no Melhor Envio primeiro (via `ComprarEtiquetaMelhorEnvioAction`)
  e cai pro PDF interno se não for elegível ou a compra falhar.
- `ComprarEtiquetaMelhorEnvioAction` — monta o payload (from/to/products/volumes/options)
  e chama `MelhorEnvioService::gerarEtiqueta()`. Exige `Pedido.frete_servico_id` (capturado
  na re-cotação do checkout) e o endereço estruturado da loja (`configuracoes_empresa.endereco_*`).

## Driver
Configurado pela tela **Configurações → Pagamento/Frete** no painel (não mais `.env`) —
`shipping_driver` (`stub` padrão | `melhorenvio`) fica em `configuracoes_empresa`. Resolvido
em `AppServiceProvider::register()`.

## Melhor Envio — autenticação
Dois modos, decididos pela presença de `MELHORENVIO_CLIENT_ID`:

1. **Conta única (token estático)** — sem `CLIENT_ID`. Usa `MELHORENVIO_TOKEN`
   (token pessoal gerado no painel do ME).
2. **OAuth2 (lojista conecta a própria conta)** — com `CLIENT_ID`/`CLIENT_SECRET`.
   Fluxo pelo painel:
   - `POST /api/v1/painel/integracoes/melhor-envio/connect` → devolve a URL de
     autorização (guarda um `state` no cache por 10 min).
   - Browser autoriza no ME → redireciona para
     `GET /painel/integracoes/melhor-envio/callback` (rota web, valida `state`,
     troca o `code` por tokens e persiste na loja).
   - `GET /api/v1/painel/integracoes/melhor-envio` → `{ conectado: bool }`.
   - `DELETE /api/v1/painel/integracoes/melhor-envio` → desconecta.

   Tokens ficam criptografados em `configuracoes_empresa` (`melhor_envio_*`).
   `MelhorEnvioTokenManager::validToken()` renova via `refresh_token` quando expira.

## Requisitos do Melhor Envio
- Header `User-Agent` **obrigatório** (`MELHORENVIO_USER_AGENT`) — sem ele o ME bloqueia.
- Sandbox: `https://sandbox.melhorenvio.com.br` · Produção: `https://www.melhorenvio.com.br`.
- O ambiente vem de `configuracoes_empresa.melhor_envio_sandbox` (tela Configurações →
  Pagamento/Frete; default sandbox), não mais do `.env`. Sandbox e produção são
  **ambientes separados** (contas e apps distintos) — trocar o toggle desconecta os
  tokens OAuth salvos e exige reconectar com a conta do ambiente escolhido.
- As credenciais do **aplicativo** (client_id/secret, um app POR AMBIENTE) também se
  configuram pela tela (secrets write-only/criptografados; `.env` é só fallback).
  Trocar o par do ambiente ativo também desconecta (tokens foram emitidos pro app
  antigo). A URL de callback exibida na tela é derivada de `APP_URL`
  (`MELHORENVIO_REDIRECT_URI` sobrepõe — útil com ngrok em dev) e precisa estar
  registrada no app do ME.

## Etiqueta real — do checkout à compra
1. `MelhorEnvioService::cotar()` devolve o `id` numérico de cada serviço (junto com
   nome/preço/prazo) — ausente no stub, que não tem ID real.
2. `CheckoutController::iniciar()` re-cota o frete server-side (nunca confia no preço que o
   cliente mandou) e casa pelo nome do serviço escolhido; o `id` correspondente vira
   `frete_servico_id`, persistido no pedido.
3. Ao gerar a etiqueta (`POST /painel/pedidos/{numero}/etiqueta`), `ComprarEtiquetaMelhorEnvioAction`
   usa esse ID pra comprar de verdade — sem ele (pedidos antigos, ou driver stub no momento
   da compra), cai automaticamente pro PDF interno.

⚠️ Payload da compra (`/me/cart` → `/shipment/checkout` → `/shipment/generate` → `/shipment/print`)
montado conforme a documentação pública do ME v2; ainda não validado contra a API real —
mesma ressalva já registrada para o `YapayGateway`. Confirmar em sandbox antes do go-live.

## Testes
- `tests/Feature/Integracao/MelhorEnvioOAuthTest.php` — token manager + User-Agent.
- `tests/Feature/Integracao/MelhorEnvioConexaoTest.php` — endpoints connect/callback/status.
- `tests/Feature/Integracao/ComprarEtiquetaMelhorEnvioTest.php` — compra real elegível/inelegível,
  fallback pro PDF quando a compra falha ou falta `frete_servico_id`.
- `tests/Feature/Sprint3/FreteTest.php`, `tests/Feature/Sprint5/*` — cotação/etiqueta/rastreio.
- `tests/Feature/Sprint5/MelhorEnvioBindingTest.php` — resolução do driver via banco.
