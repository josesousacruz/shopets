# Shopets — PDV + E-commerce

Plataforma completa de **ponto de venda (PDV) e e-commerce** construída em Laravel 12 + React 19, com arquitetura orientada a domínio (DDD), emissão de **NF-e**, integração de frete e conciliação bancária.

![CI](https://github.com/cruztechdevelopers/shopets/actions/workflows/tests.yml/badge.svg)
![PHP](https://img.shields.io/badge/PHP-8.2%2B-777BB4?logo=php&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Tests](https://img.shields.io/badge/testes-88%20automatizados-brightgreen)

## Destaques técnicos

- **Arquitetura DDD** — domínios isolados: `Cart`, `Catalog`, `Checkout`, `Fiscal`, `Order`, `Payment`, `Shipping`, com Actions e Services por domínio
- **Emissão de NF-e** — integração com `nfephp-org/sped-nfe` (compliance fiscal brasileiro)
- **Pagamentos plugáveis** — interface abstrata de gateway com múltiplas implementações e `FakePayment` para testes
- **Frete** — integração real com Melhor Envio (cotação e etiquetas), com stub de fallback
- **Conciliação bancária** — importação e parsing de arquivos OFX
- **Estoque** — saldos por depósito, movimentações, inventário e devoluções
- **Relatórios gerenciais** — DRE, fluxo de caixa e curva ABC
- **RBAC** — papéis e permissões granulares (Spatie Permission) + auditoria completa (Spatie Activity Log)
- **88 testes automatizados** (PHPUnit) rodando em CI (GitHub Actions) com lint
- **Docker multi-stage** + `docker-compose` para dev e produção

## Stack

| Camada | Tecnologias |
|---|---|
| Back-end | PHP 8.2+, Laravel 12, Eloquent, Fortify + Sanctum |
| Front-end | React 19, TypeScript, Inertia.js (SSR-ready), Tailwind CSS, shadcn/ui |
| Dados | MySQL (86 migrations), Redis |
| Qualidade | PHPUnit (88 testes), Pint/ESLint, GitHub Actions |
| Infra | Docker multi-stage, docker-compose |

## Estrutura de domínios

```
app/
├── Domain/
│   ├── Cart/        # carrinho persistente
│   ├── Catalog/     # produtos, categorias, mídia
│   ├── Checkout/    # fluxo de compra
│   ├── Fiscal/      # NF-e
│   ├── Order/       # pedidos e transições de estado
│   ├── Payment/     # gateways plugáveis
│   └── Shipping/    # Melhor Envio
└── Http/
    ├── Controllers/Api/V1/   # API pública / storefront
    └── Controllers/Painel/   # 35+ controllers administrativos
```

## Rodando localmente

```bash
git clone https://github.com/cruztechdevelopers/shopets.git
cd shopets
cp .env.example .env
composer install && npm install
php artisan key:generate
php artisan migrate --seed
composer run dev   # server + queue + vite
```

## Testes

```bash
composer run test   # 88 testes (Feature + Unit)
```

---

Desenvolvido por [José Almir Sousa Cruz Filho](https://github.com/josesousacruz) com fluxo **AI-First** (Claude Code + Specification-Driven Development).
