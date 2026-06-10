# Sprint 2 — Follow-ups (não-bloqueantes)

Review final: APPROVED_WITH_FOLLOWUPS. 3 fixes aplicados inline; resto rastreado aqui.

## Aplicados nesta sprint
- ✅ **EnsureCliente middleware** (`cliente`) nas rotas `/auth/me`, `/auth/logout`, `/enderecos` — token de User do PDV agora recebe 403 em vez de 500/leak. (Era o achado #1, o mais sério.)
- ✅ **ViaCEP timeout(5) + retry(1)** no `CepController` — evita hang se ViaCEP travar.
- ✅ **SESSION_SECRET obrigatório em produção** no `session.server.ts` — deploy mal configurado falha alto em vez de assinar sessão com segredo público de dev.

## Pendentes

### 1. Invariante "ao menos um endereço principal"
`EnderecoController::update` permite desmarcar `principal` do único endereço, deixando o cliente com zero principais. `store` auto-promove o 1º, mas `update` não re-promove. Adicionar regra: ao remover/desmarcar o último principal, promover outro automaticamente (ou bloquear).

### 2. Tabela de reset separada por broker
`password_reset_tokens` é compartilhada entre brokers `users` (PDV) e `clientes`. Um User e um Cliente com o mesmo e-mail compartilhariam/sobrescreveriam linhas. Baixa probabilidade; criar `cliente_password_reset_tokens` isola 100%.

### 3. Edição de perfil do cliente
`conta.perfil.tsx` é read-only — falta endpoint `PUT /api/v1/auth/perfil` (nome, telefone, aceita_marketing) + UI. Pequeno; entra quando útil.

### 4. Cache do cliente no root loader
`root.tsx` chama `GET /auth/me` a cada navegação quando há cookie (1 request extra/nav). Funciona e degrada bem (401→deslogado), mas dá pra cachear o cliente na própria sessão Remix com TTL curto se performance importar.

### 5. Verificação de e-mail (opcional)
Hoje cadastro não exige verificação de e-mail. Se quiser, ativar fluxo de verificação (Cliente já implementa MustVerifyEmail-capable via Foundation\Auth\User) — porém adiciona fricção. Decidir conforme estratégia.

### 6. SMTP real
Em dev `MAIL_MAILER=log`. Antes do go-live, configurar SMTP real (e o risco de spam do SMTP próprio/Gmail já registrado no spec R4 — reavaliar Resend/SES).
