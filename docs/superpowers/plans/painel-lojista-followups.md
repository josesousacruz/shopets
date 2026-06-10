# Painel do Lojista — Follow-ups

Review final: APROVADO. Sem bloqueantes. Itens menores abaixo.

## Aplicado
- ✅ Root loader do storefront pula a busca de cliente/carrinho em rotas `/painel` (perf — evita round-trips inúteis).

## Pendentes (não-bloqueantes)
1. **Faturamento do dashboard limitado** — soma páginas em memória até ~25 páginas (≈500 pedidos pagos no default 20/pg); acima disso subconta. Trocar por um endpoint de agregação `SUM` no backend quando o volume crescer.
2. **Token de vendedor** — `PainelAuthController::login` emite token pra qualquer User ativo, mas `EnsureAdmin` bloqueia vendedor em todas as rotas (token usável-mas-inútil, sem escalonamento). Opcional: recusar login de vendedor já no `login`.
3. **Reordenar fotos** — upload e remover funcionam; reordenação da galeria ficou de fora (era opcional). Endpoint `PUT /fotos/ordem` existe no backend; falta a UI de drag-drop.
4. **Configurações: Cupons e Banners** — mostrados como "em breve"; dependem das tabelas `cupons`/`banners_home` (Sprint 6). Ligar quando existirem.
5. **Permissões finas (Spatie)** — hoje o painel é gateado por `nivel_acesso in [admin,gerente]`. As permissions `loja.*` (criadas na Sprint 0) ainda não são aplicadas por rota; usar pra granularidade (ex: operador só pedidos).
