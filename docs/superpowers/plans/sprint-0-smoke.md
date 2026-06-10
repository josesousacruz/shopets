# Sprint 0 — Smoke do PDV (pré e pós-refator)

Rodar antes de mergear e depois de cada deploy de Sprint subsequente.

## Setup
1. Banco resetado: `php artisan migrate:fresh --seed`
2. Subir app: `php artisan serve` em `http://localhost:8000`

## Checklist
- [ ] Login admin (usuário do seeder)
- [ ] PDV abre e lista produtos (50 capas do CapasProdutoSeeder)
- [ ] Buscar produto por nome/código
- [ ] Adicionar à venda, conferir subtotal
- [ ] Finalizar em dinheiro, conferir troco
- [ ] Movimentação aparece em Estoque > histórico
- [ ] Conta a pagar criada vira lançamento no fluxo de caixa
- [ ] Conta a receber lançada quando recebida
- [ ] Cupom da última venda imprime/visualiza

## Resultado
| Data | Executor | Status |
| --- | --- | --- |
| 2026-06-09 | _ | _ |
