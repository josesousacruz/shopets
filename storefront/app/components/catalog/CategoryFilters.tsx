import { Link, useSearchParams } from "@remix-run/react";
import type { Categoria } from "~/types/api";
import { cn } from "~/lib/format";

const ORDENS = [
  { value: "", label: "Relevância" },
  { value: "preco_asc", label: "Menor preço" },
  { value: "preco_desc", label: "Maior preço" },
  { value: "novidades", label: "Novidades" },
  { value: "nome", label: "Nome A→Z" },
];

export function CategoryFilters({
  categorias,
  ativaSlug,
}: {
  categorias: Categoria[];
  ativaSlug?: string;
}) {
  const [params] = useSearchParams();
  const ordemAtual = params.get("ordem") ?? "";

  return (
    <aside className="space-y-6">
      <section>
        <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-3">Categorias</h2>
        <ul className="space-y-1">
          <li>
            <Link
              to="/loja"
              className={cn(
                "block text-sm px-2 py-1 rounded",
                !ativaSlug ? "bg-brand-primary text-white" : "text-slate-700 hover:bg-muted"
              )}
            >
              Todas
            </Link>
          </li>
          {categorias.map((c) => (
            <li key={c.id}>
              <Link
                to={`/loja/${c.slug}`}
                className={cn(
                  "block text-sm px-2 py-1 rounded",
                  ativaSlug === c.slug ? "bg-brand-primary text-white" : "text-slate-700 hover:bg-muted"
                )}
              >
                {c.nome}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-3">Ordenar</h2>
        <form method="get">
          <select
            name="ordem"
            defaultValue={ordemAtual}
            className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white"
            onChange={(e) => e.currentTarget.form?.submit()}
          >
            {ORDENS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </form>
      </section>
    </aside>
  );
}
