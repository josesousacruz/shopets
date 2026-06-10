# Ecommerce — Sprint 1b (Storefront Remix) Implementation Plan

> Execução via subagent-driven-development. Branch: `ecommerce-sprint-1`.

**Goal:** Storefront público em Remix consumindo a API `/api/v1/*` da Sprint 1a. Catálogo navegável (home, categorias, PDP), SEO básico, mobile-first, estrutura pronta pra GA4/Pixel.

**Path:** `C:\Projetos\PDV-Ecomerce\storefront\` (sibling de `shopets/`). Repo de código irmão; deploys independentes.

**Tech Stack:** Remix (Vite plugin), TypeScript, Tailwind 3, Radix primitives (consistência com PDV), Inter + Manrope (next/font ou Google Fonts CDN), npm.

**Identidade placeholder (trocável via tokens):**
- Cor primária: `violet-600` (CTA, links ativos)
- Acento: `lime-400` (preço, badges "PROMOÇÃO", "NOVO")
- Base: `slate-900` (ink) / `slate-50` (bg) / `white`
- Tipografia: Manrope display, Inter body
- Tom: pt-BR informal "você", sem emoji, CTAs verbais ("Adicionar ao carrinho")

**Decisões fechadas:**
- API consumida server-side via loaders (Laravel em `http://localhost:8000`)
- SEO básico no MVP: `meta()`, `JSON-LD Product`, `sitemap.xml`, `robots.txt`
- PWA: só `manifest.json` + ícones; sem service worker (defer Sprint 6)
- Analytics: env vars `PUBLIC_GA4_ID`, `PUBLIC_META_PIXEL_ID`; scripts injetados condicionalmente
- Institucional: rotas placeholder com `<p>Em breve</p>` editável depois
- Imagens vindas da API; fallback gradient SVG quando ausente
- Sem autenticação de cliente nesta sprint (vem na Sprint 2)
- Carrinho/checkout NÃO entram aqui (vêm na Sprint 3)

---

## Estrutura de arquivos

```
storefront/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── .env.example
├── .gitignore
├── README.md
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   └── icons/icon-{192,512}.png
└── app/
    ├── root.tsx
    ├── entry.client.tsx
    ├── entry.server.tsx
    ├── tailwind.css
    ├── styles/tokens.css
    ├── lib/
    │   ├── api.server.ts       # cliente HTTP do Laravel
    │   ├── env.server.ts       # leitura tipada de env
    │   ├── format.ts           # currency BRL, pt-BR
    │   ├── seo.ts              # meta helpers, JSON-LD
    │   └── tracking.ts         # GA4 + Pixel events
    ├── types/api.ts            # contratos da API
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx
    │   │   ├── Footer.tsx
    │   │   └── MobileNav.tsx
    │   ├── catalog/
    │   │   ├── ProductCard.tsx
    │   │   ├── ProductGrid.tsx
    │   │   └── CategoryFilters.tsx
    │   ├── product/
    │   │   ├── Gallery.tsx
    │   │   ├── VariationPicker.tsx
    │   │   ├── BuyBox.tsx
    │   │   └── Badges.tsx
    │   └── ui/
    │       ├── Button.tsx
    │       ├── Price.tsx
    │       └── Skeleton.tsx
    └── routes/
        ├── _index.tsx                       # Home
        ├── loja._index.tsx                  # Catálogo geral
        ├── loja.$categoria.tsx              # Catálogo por categoria
        ├── produto.$slug.tsx                # PDP
        ├── busca.tsx                        # Busca
        ├── institucional.sobre.tsx
        ├── institucional.faq.tsx
        ├── institucional.trocas.tsx
        ├── institucional.privacidade.tsx
        ├── institucional.termos.tsx
        ├── sitemap[.]xml.tsx                # resource route
        └── robots[.]txt.tsx                 # resource route
```

---

## Tasks

### T1 + T2 — Scaffold Remix + design tokens + layout
- Criar projeto Remix em `storefront/` com Vite + TS + Tailwind
- Tokens em `tokens.css` consumidos pelo `tailwind.config.ts`
- Componentes: Header (logo + nav + busca), Footer (links institucionais), MobileNav (drawer Radix)
- `root.tsx` aplica fontes Manrope/Inter, tokens, layout base
- Página inicial placeholder ("Em breve")
- **Pronto:** `npm run dev` em `storefront/` abre `http://localhost:3000` com Header/Footer renderizando

### T3 — API client + tipos
- `lib/api.server.ts`: fetch wrapper que aponta pra `http://localhost:8000/api/v1`
- `types/api.ts`: tipos TS espelhando os Resources V1
- `lib/format.ts`: `formatBRL`, `formatNumber`
- `.env.example` documenta `API_BASE_URL`

### T4 — Home + catálogo + categorias
- `_index.tsx`: hero com CTA + grid de categorias + destaques
- `loja._index.tsx`: catálogo paginado com filtros (categoria, preço, ordem)
- `loja.$categoria.tsx`: filtra pela categoria via API
- `ProductCard`: imagem, nome, preço, badges (PROMOÇÃO/NOVO), botão "Ver produto"
- `busca.tsx`: chama `/api/v1/busca?q=...`

### T5 — PDP
- `produto.$slug.tsx`: galeria + nome + preço + descrição + variation picker + BuyBox
- `Gallery`: thumbnails + zoom on hover
- `VariationPicker`: chips Radix Toggle Group; mostra preço/disponibilidade da variação selecionada
- `BuyBox`: "Adicionar ao carrinho" desabilitado (stub — carrinho vem na Sprint 3)

### T6 — SEO + institucional + analytics
- `lib/seo.ts`: `buildMeta(title, description, og)`, `jsonLdProduct(produto)`
- `sitemap[.]xml.tsx`: gera sitemap puxando da API
- `robots[.]txt.tsx`: `User-agent: *\nAllow: /`
- 5 rotas institucionais com conteúdo placeholder editável
- `lib/tracking.ts`: scripts GA4/Pixel inseridos condicionalmente via env
- `manifest.json` + ícones SVG placeholder

### T7 — Smoke + review
- Subir Laravel (`php artisan serve` em :8000) + Remix dev (`npm run dev` em :3000)
- Clicar na loja: home → categoria → PDP → busca
- Validar SEO (view source: meta + JSON-LD)
- Dispatch subagente review final do storefront
