import { useState, type ReactNode } from "react";
import { Link, useSearchParams } from "@remix-run/react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, X } from "lucide-react";
import type { Categoria, ProdutoLista } from "~/types/api";
import { ProductGrid } from "~/components/catalog/ProductGrid";
import { FilterSidebar } from "~/components/catalog/FilterSidebar";
import { SortBar } from "~/components/catalog/SortBar";

interface MetaInfo {
  current_page: number;
  last_page: number;
  total: number;
}

interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  titulo: string;
  /** Optional lead text under the title. */
  descricao?: string | null;
  crumbs: Crumb[];
  categorias: Categoria[];
  ativaSlug?: string;
  produtos: ProdutoLista[];
  meta: MetaInfo;
  /** Where the sort/pagination forms submit (route path). */
  formAction?: string;
}

/** Windowed page list: first, last, current±1, with ellipsis gaps. */
function buildPages(current: number, last: number): (number | "gap")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("gap");
    out.push(p);
    prev = p;
  }
  return out;
}

export function CatalogLayout({
  titulo,
  descricao,
  crumbs,
  categorias,
  ativaSlug,
  produtos,
  meta,
  formAction,
}: Props) {
  const [params] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams(params);
    sp.set("page", String(p));
    return `?${sp.toString()}`;
  };

  return (
    <>
      <section className="cat-hero">
        <div className="row">
          <div>
            <nav className="crumb" aria-label="Trilha de navegação">
              {crumbs.map((c, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {i > 0 && <ChevronRight />}
                  {c.to ? (
                    <Link to={c.to}>{c.label}</Link>
                  ) : (
                    <span style={{ color: "var(--ink)" }}>{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
            <h1>{titulo}</h1>
            {descricao && <p>{descricao}</p>}
          </div>
          <div className="summary">
            <div className="big">{meta.total}</div>
            <div className="lbl">
              {meta.total === 1 ? "produto" : "produtos"}
            </div>
          </div>
        </div>
      </section>

      <section className="cat-main">
        <div className="row">
          <aside className="cat-side desktop-only">
            <FilterSidebar categorias={categorias} ativaSlug={ativaSlug} />
          </aside>

          <div>
            <SortBar
              total={meta.total}
              action={formAction}
              onAbrirFiltros={() => setDrawerOpen(true)}
            />

            {produtos.length === 0 ? (
              <div className="cat-empty">
                <h3>Nenhum produto encontrado</h3>
                <p>Tente ajustar os filtros ou explorar outra categoria.</p>
              </div>
            ) : (
              <ProductGrid produtos={produtos} />
            )}

            {meta.last_page > 1 && (
              <nav className="cat-pagination" aria-label="Paginação">
                {buildPages(meta.current_page, meta.last_page).map((p, i) =>
                  p === "gap" ? (
                    <span key={`gap-${i}`} className="gap">
                      …
                    </span>
                  ) : p === meta.current_page ? (
                    <span key={p} className="is-current" aria-current="page">
                      {p}
                    </span>
                  ) : (
                    <Link key={p} to={pageHref(p)}>
                      {p}
                    </Link>
                  )
                )}
              </nav>
            )}
          </div>
        </div>
      </section>

      {/* Mobile filter drawer */}
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="cat-overlay" />
          <Dialog.Content className="cat-drawer" aria-describedby={undefined}>
            <div className="drawer-head">
              <Dialog.Title asChild>
                <h3>Filtros</h3>
              </Dialog.Title>
              <Dialog.Close className="close" aria-label="Fechar filtros">
                <X className="size-5" />
              </Dialog.Close>
            </div>
            <div className="drawer-body">
              <FilterSidebar categorias={categorias} ativaSlug={ativaSlug} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
