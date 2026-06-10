import { Link, useSearchParams } from "@remix-run/react";
import { X } from "lucide-react";
import type { Categoria } from "~/types/api";
import { cn } from "~/lib/format";

interface Props {
  categorias: Categoria[];
  ativaSlug?: string;
}

/**
 * Builds a URL to /loja or /loja/:slug preserving the current query params
 * (ordem, em_promocao, preco_min/max) but dropping `page`.
 */
function buildCategoryHref(slug: string | null, params: URLSearchParams) {
  const sp = new URLSearchParams(params);
  sp.delete("page");
  // /loja._index and /loja.$categoria both rely on the route param for category,
  // so we never carry a `categoria` query string param around.
  sp.delete("categoria");
  const qs = sp.toString();
  const base = slug ? `/loja/${slug}` : "/loja";
  return qs ? `${base}?${qs}` : base;
}

export function FilterSidebar({ categorias, ativaSlug }: Props) {
  const [params] = useSearchParams();
  const ordem = params.get("ordem") ?? "";
  const precoMin = params.get("preco_min") ?? "";
  const precoMax = params.get("preco_max") ?? "";
  const soPromocao = params.get("em_promocao") === "1";

  const temFiltrosAtivos = !!(precoMin || precoMax || soPromocao);

  // For the "só promoção" toggle, keep all params except em_promocao+page,
  // then add/remove em_promocao.
  const toggleHref = (() => {
    const sp = new URLSearchParams(params);
    sp.delete("page");
    if (soPromocao) sp.delete("em_promocao");
    else sp.set("em_promocao", "1");
    const qs = sp.toString();
    const base = ativaSlug ? `/loja/${ativaSlug}` : "/loja";
    return qs ? `${base}?${qs}` : base;
  })();

  const limparHref = ativaSlug ? `/loja/${ativaSlug}` : "/loja";

  return (
    <div>
      {/* Categorias */}
      <div className="blk">
        <h4>
          Categorias <span className="ct">{categorias.length}</span>
        </h4>
        <Link
          to={buildCategoryHref(null, params)}
          className={cn("cat-link", !ativaSlug && "is-active")}
        >
          Todas as categorias
        </Link>
        {categorias.map((c) => (
          <Link
            key={c.id}
            to={buildCategoryHref(c.slug, params)}
            className={cn("cat-link", ativaSlug === c.slug && "is-active")}
          >
            {c.nome}
          </Link>
        ))}
      </div>

      {/* Faixa de preço */}
      <div className="blk">
        <h4>Faixa de preço</h4>
        <form method="get" action={ativaSlug ? `/loja/${ativaSlug}` : "/loja"} className="price-form">
          {/* preserve ordem + em_promocao */}
          {ordem && <input type="hidden" name="ordem" value={ordem} />}
          {soPromocao && <input type="hidden" name="em_promocao" value="1" />}
          <div className="price-inputs">
            <input
              type="number"
              name="preco_min"
              min="0"
              step="1"
              placeholder="Mín."
              defaultValue={precoMin}
              aria-label="Preço mínimo"
            />
            <span>—</span>
            <input
              type="number"
              name="preco_max"
              min="0"
              step="1"
              placeholder="Máx."
              defaultValue={precoMax}
              aria-label="Preço máximo"
            />
          </div>
          <button type="submit" className="apply">
            Aplicar
          </button>
        </form>
      </div>

      {/* Ofertas */}
      <div className="blk">
        <h4>Ofertas</h4>
        <Link to={toggleHref} className="opt" style={{ textDecoration: "none" }}>
          <input type="checkbox" checked={soPromocao} readOnly tabIndex={-1} />
          Só produtos em promoção
        </Link>
      </div>

      {temFiltrosAtivos && (
        <div className="blk">
          <Link to={limparHref} className="clear-all">
            <X />
            Limpar filtros
          </Link>
        </div>
      )}
    </div>
  );
}
