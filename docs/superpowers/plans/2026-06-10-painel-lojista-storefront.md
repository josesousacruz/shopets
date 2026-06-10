# Painel do Lojista no Storefront (Remix) — Plan

> Branch: `ecommerce-painel-lojista`. Execução via subagentes.

**Goal:** Área administrativa DENTRO do storefront Remix (`:3000`, design navy/mint), onde o lojista gerencia **Catálogo + Pedidos + Configurações**. Login com as credenciais do PDV (User), via `/painel`. O painel do PDV (`:8888/admin/loja`) permanece intacto.

**Decisão de auth (espelho do cliente):**
- User autentica via token Sanctum (User já pode ter tokens — verificar HasApiTokens no model User; se não tiver, adicionar).
- Middleware `EnsureAdmin`: exige `$request->user('sanctum') instanceof User` E `nivel_acesso in ['admin','gerente']`. (Oposto do `EnsureCliente`.)
- Remix guarda o token de admin num cookie httpOnly SEPARADO do cookie de cliente (`session.server` já existe pra cliente; criar `admin-session.server`).
- Endpoints admin sob `/api/v1/painel/*` com `['auth:sanctum','admin']`.

**Escopo honesto:** Catálogo e Pedidos completos. Configurações: implementa o que já tem backend (dados da loja em `configuracoes_empresa`, frete origem, exibição do gateway). **Cupons e Banners ficam "em breve"** (tabelas só na Sprint 6). Sem inventar tabela.

---

## FASE A — Backend (Laravel)

### A1 — User token auth + EnsureAdmin
- `User` model: garantir `use HasApiTokens` (Laravel\Sanctum). Adicionar se faltar.
- `EnsureAdmin` middleware (alias `admin`): `abort_unless($request->user('sanctum') instanceof \App\Models\User && in_array($request->user('sanctum')->nivel_acesso, ['admin','gerente']), 403)`.
- `PainelAuthController`: `login` (valida email+senha contra users; retorna `{user, token}` via createToken('painel')); `logout` (revoga); `me` (retorna user).
- Rotas `/api/v1/painel/auth/{login(throttle),logout,me}` (login público, logout/me sob auth:sanctum+admin).
- Testes: login User ok/inválido; me; EnsureAdmin bloqueia cliente token (403) e vendedor (403).

### A2 — API admin de Pedidos
- `Api\V1\Painel\PedidoAdminController`: index (paginado, filtros status/busca, TODOS os pedidos), show (itens, endereço, pagamento, eventos, venda, nfe), transições (separacao/enviar/entregar/cancelar) reusando a lógica do `Admin\LojaPedidoController` (extrair pra um service/action compartilhado `Domain\Order\TransicionarPedidoAction` pra não duplicar — refatore o LojaPedidoController do PDV pra usar o mesmo action).
- Resources reusam/estendem `PedidoResource`.
- Rotas `/api/v1/painel/pedidos*` sob admin.
- Testes: lista todos; transição válida; transição inválida bloqueada; escopo admin.

### A3 — API admin de Catálogo (o ponto que incomodou)
- `Api\V1\Painel\ProdutoAdminController`:
  - index (todos os produtos, com flag visivel, busca/categoria/paginação)
  - show (produto completo + variações + galeria)
  - store/update: nome, descricao_curta/longa, preços, categoria, peso/dim, meta SEO, badges (destaque/novo/em_promocao), preco_promocional, **visivel_ecommerce**, slug (auto do nome se vazio, único)
  - fotos: `POST /produtos/{id}/fotos` (upload via Spatie addMedia coleção 'images'), `DELETE /produtos/{id}/fotos/{mediaId}`, `PUT /produtos/{id}/fotos/ordem` (reordenar)
  - variações: `GET/POST/PUT/DELETE /produtos/{id}/variacoes` (sku, atributos, preço, estoque, ativo)
- `Api\V1\Painel\CategoriaAdminController`: CRUD (nome, slug, descricao_seo, ordem, visivel_ecommerce, pai).
- Rotas sob `/api/v1/painel/*` admin.
- Testes: criar produto com visivel=true aparece na API pública; upload foto anexa media; CRUD variação; toggle visibilidade.

### A4 — API admin de Configurações (escopo disponível)
- `Api\V1\Painel\ConfiguracaoController`: GET/PUT dados da loja (`configuracoes_empresa`: nome, cnpj, telefone, email, logo, taxa_entrega, valor_minimo_entrega) + leitura do gateway/frete driver atual (read-only: `services.payment.driver`, `services.shipping.driver`).
- Cupons/Banners: endpoint retorna `{disponivel:false, motivo:'Sprint 6'}` (placeholder honesto) OU simplesmente não cria rota (o front mostra "em breve").
- Teste: GET/PUT config geral.

### A5 — Regressão
- `php artisan test` — tudo verde (+ novos testes Painel); 6 falhas pré-existentes; PDV e EnsureCliente intactos.

---

## FASE B — Frontend (Remix `/painel/*`)

### B1 — Auth admin + layout
- `app/lib/admin-session.server.ts`: cookie httpOnly `__shopets_admin` com token de admin; `requireAdmin(request)` (redirect /painel/login), `getAdmin(request)` (GET /painel/auth/me).
- `app/lib/painel.server.ts`: chamadas tipadas à API admin (Bearer admin token).
- `app/routes/painel.login.tsx`: form email+senha → POST /painel/auth/login → cria admin session → /painel.
- `app/routes/painel.tsx` (layout): sidebar admin (Dashboard, Pedidos, Catálogo, Categorias, Configurações), header com nome do User + sair. Design navy/mint da loja, mas chrome de painel (sidebar). `requireAdmin` no loader.
- `app/styles/painel.css` (tokens fc-*, layout admin).

### B2 — Dashboard + Pedidos
- `painel._index.tsx`: KPIs simples (pedidos hoje, aguardando ação, faturamento) via API.
- `painel.pedidos._index.tsx`: lista filtrável + chips de status.
- `painel.pedidos.$numero.tsx`: detalhe + timeline + ações (separação/enviar c/ rastreio/entregar/cancelar).

### B3 — Catálogo (o foco)
- `painel.catalogo._index.tsx`: lista de produtos com toggle "Na loja?" (visivel_ecommerce) inline, busca, filtro categoria.
- `painel.catalogo.$id.tsx` (editar) / `painel.catalogo.novo.tsx`: form completo — dados, preços, SEO, badges, peso/dim; **galeria com upload (drag-drop) + remover + reordenar**; **tabela de variações** (add/editar/remover SKU/cor/preço/estoque). UX refinada navy/mint.
- `painel.categorias._index.tsx`: CRUD categorias.

### B4 — Configurações
- `painel.configuracoes.tsx`: abas — Loja (dados/frete básicos, GET/PUT), Pagamento/Frete (read-only do driver atual), Cupons/Banners ("em breve — Sprint 6").

### B5 — Link de acesso
- Discreto link "Sou lojista" no footer OU rota direta `/painel` (sem expor no header do cliente). Painel não aparece pra cliente.

---

## Critérios de pronto
- Lojista loga em `/painel/login` com credenciais do PDV (User), cliente não acessa (403), vendedor barrado
- Gerencia produto da loja com **fotos (upload) + variações + visibilidade + SEO** pela UX da loja → reflete na vitrine pública
- Acompanha e transiciona pedidos no /painel (mesma capacidade do PDV)
- Configurações da loja (dados gerais) editáveis; cupons/banners sinalizados "em breve"
- PDV (`:8888/admin/loja`) e auth de cliente intactos
- Suite verde; typecheck/build do storefront ok
