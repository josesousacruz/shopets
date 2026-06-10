# Ecommerce — Sprint 2a (Cliente: auth + endereços + e-mail) Plan

> Execução via subagent-driven-development. Branch: `ecommerce-sprint-2`.

**Goal:** Backend de contas de cliente: cadastro, login, logout, dados do cliente, recuperação de senha, CRUD de endereços, e e-mails transacionais. Auth por **token Sanctum (Bearer)**.

**Decisão de arquitetura:** auth do cliente é **token-based** (Sanctum personal access tokens), não cookie/SPA. Razão: dev cross-origin (Remix :3000 → Laravel :8888) torna cookie/CSRF frágil; token é robusto e o Remix guarda em cookie httpOnly próprio (Sprint 2b). `Cliente` já usa `HasApiTokens` (Sprint 0). `auth:sanctum` resolve o `tokenable` (Cliente) automaticamente — `$request->user()` retorna o Cliente nas rotas protegidas.

**Não conflita com o PDV:** Fortify/`users`/guard `web` intactos. Cliente é provider/broker separado.

**Spec:** Sprint 2 (seção 8). Decisões: conta obrigatória (email+senha+nome), CPF só no checkout, `enderecos_cliente`, ViaCEP, SMTP. Em dev: `MAIL_MAILER=log` (e-mails vão pro log; SMTP real configurado depois).

---

## Tasks

### T1 — Config: provider + password broker `clientes`
- `config/auth.php`: adicionar provider `clientes` (eloquent, App\Models\Cliente) e broker `passwords.clientes` (provider clientes, tabela password_reset_tokens, expire 60, throttle 60).
- `Cliente` já estende Foundation\Auth\User → já tem `CanResetPassword` + `Notifiable`. Verificar e, se faltar, garantir `sendPasswordResetNotification` aponta pro broker certo (default funciona).
- Sem teste isolado (config); coberto pelos testes de auth.

### T2 — enderecos_cliente (migration + model + relação)
- Migration `create_enderecos_cliente_table`: `id_endereco` PK, `id_cliente` FK→clientes(id_cliente) cascade, `apelido` (Casa/Trabalho), `cep` (8-9), `logradouro`, `numero`, `complemento` nullable, `bairro`, `cidade`, `uf` (2), `tipo` enum('entrega','cobranca','ambos') default 'entrega', `principal` bool default false, timestamps. Index id_cliente.
- Model `EnderecoCliente`: fillable, casts (principal bool), `cliente()` belongsTo. Sem `BelongsToEmpresa` (escopo herda do cliente).
- `Cliente`: `enderecos()` hasMany.
- Teste: cliente tem N endereços; cascade ao deletar cliente.

### T3 — Auth endpoints (register/login/logout/me)
Controller `App\Http\Controllers\Api\V1\Auth\AuthController`:
- `POST /api/v1/auth/register` — valida (nome req, email req|email|unique:clientes, password req|min:8|confirmed, aceita_marketing bool). Cria Cliente com `origem='ecommerce'`, hash password (cast já faz). Dispara `EnviarBoasVindas` (Mailable/Notification, queued). Retorna `{ cliente: {...}, token }` (token via createToken('storefront')->plainTextToken). 201.
- `POST /api/v1/auth/login` — valida email+password. Busca cliente por email, `Hash::check`. Se ok, revoga tokens antigos (opcional) e retorna `{cliente, token}`. Se falha → 422 com mensagem "Credenciais inválidas". Rate limit (throttle:6,1).
- `POST /api/v1/auth/logout` — auth:sanctum; `$request->user()->currentAccessToken()->delete()`. 204.
- `GET /api/v1/auth/me` — auth:sanctum; retorna ClienteResource.
- Resource `ClienteResource` (id, nome, email, telefone, origem, aceita_marketing, created_at) — NÃO expõe password/cpf/credito.
- Rotas: grupo `/api/v1/auth` (register/login públicos com throttle; logout/me sob auth:sanctum).
- Testes: registro cria cliente origem=ecommerce + retorna token; login ok/inválido; me autenticado; logout revoga; email único.

### T4 — Recuperação de senha
- `POST /api/v1/auth/forgot-password` — valida email; `Password::broker('clientes')->sendResetLink(['email'=>...])`. Sempre retorna 200 com mensagem genérica (não revela se email existe). O link no e-mail aponta pro storefront: `{PUBLIC_SITE_URL}/redefinir-senha/{token}?email=...` — configurar via `ResetPassword::createUrlUsing` no AppServiceProvider/AuthServiceProvider lendo env `STOREFRONT_URL`.
- `POST /api/v1/auth/reset-password` — valida token, email, password|min:8|confirmed; `Password::broker('clientes')->reset(...)`. 200 ou 422.
- Em dev (MAIL_MAILER=log) o link sai no log.
- Testes: forgot dispara notification (Notification::fake); reset troca senha com token válido; token inválido falha.

### T5 — Endereços CRUD (auth:sanctum, escopo no cliente)
Controller `App\Http\Controllers\Api\V1\EnderecoController` (todas sob auth:sanctum, operam sobre `$request->user()->enderecos()`):
- `GET /api/v1/enderecos` — lista do cliente.
- `POST /api/v1/enderecos` — cria; valida cep/logradouro/numero/bairro/cidade/uf/tipo. Se `principal=true`, desmarca os outros. Se for o 1º endereço, marca principal automaticamente.
- `PUT /api/v1/enderecos/{id}` — atualiza (scopeado; 404 se não for do cliente).
- `DELETE /api/v1/enderecos/{id}` — remove.
- `EnderecoResource`.
- Testes: cliente só vê/edita os próprios (não os de outro cliente — 404); principal único; 1º vira principal.

### T6 — ViaCEP
- Endpoint helper `GET /api/v1/cep/{cep}` (público, throttle) → consulta ViaCEP server-side (`Http::get("https://viacep.com.br/ws/{cep}/json/")`), normaliza pra `{cep, logradouro, bairro, cidade, uf}` ou 404 se inválido. (Evita CORS/efeito no client; o Remix chama esse.)
- Teste: com Http::fake, retorna normalizado; cep inexistente → 404.

### T7 — E-mail boas-vindas
- `App\Mail\BoasVindasCliente` (Mailable, implements ShouldQueue) ou Notification. Markdown/blade simples pt-BR. Assunto "Bem-vindo à Shopets". Disparado no register.
- Em dev MAIL_MAILER=log. `.env.example` documenta MAIL_* + STOREFRONT_URL.
- Teste: Mail::fake() — register envia BoasVindasCliente pro email do cliente.

### T8 — Regressão + review
- `php artisan test` — toda a suite verde (Sprint 0+1+2a); 6 falhas pré-existentes Auth/TwoFactor seguem (não regredir além disso).
- Subagente review: sem vazamento de dados sensíveis nos resources; rate limiting no login/forgot; escopo de endereços correto; tokens revogados no logout; PDV intacto.

## Critérios de pronto 2a
- Cadastro/login/logout/me por token funcionando (testado)
- Recuperação de senha com broker `clientes` + link pro storefront
- CRUD de endereços escopado por cliente, principal único
- ViaCEP endpoint
- E-mail boas-vindas (log em dev)
- config/auth.php com provider+broker clientes; PDV/Fortify intactos
- Suite verde
