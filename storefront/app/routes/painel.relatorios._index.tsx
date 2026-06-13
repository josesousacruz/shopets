import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { BarChart3, Star } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Relatórios — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const r = await painel.relatorios.list(token);
  return json({ relatorios: r.data, grupos: r.grupos, favoritos: r.favoritos });
}

export default function RelatoriosIndex() {
  const { relatorios, grupos, favoritos } = useLoaderData<typeof loader>();
  const porGrupo = Object.entries(grupos).map(([key, label]) => ({
    key,
    label,
    itens: relatorios.filter((r) => r.grupo === key),
  }));

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Relatórios</span>
          <h1>Central de Relatórios</h1>
          <p>{relatorios.length} relatórios disponíveis.</p>
        </div>
      </div>

      {favoritos.length > 0 ? (
        <div className="pn-card">
          <div className="pn-card-head"><h3><Star size={16} /> Favoritos</h3></div>
          <div className="pn-quick-links">
            {favoritos.map((f) => (
              <Link key={f.id} to={`/painel/relatorios/${f.slug}`}><Star size={14} /> {f.nome}</Link>
            ))}
          </div>
        </div>
      ) : null}

      {porGrupo.map((g) => (
        <div className="pn-card" key={g.key}>
          <div className="pn-card-head"><h3>{g.label}</h3></div>
          <div className="pn-cards-grid">
            {g.itens.map((r) => (
              <Link to={`/painel/relatorios/${r.slug}`} className="pn-card pn-pdv-card" key={r.slug}>
                <div className="pn-pdv-card-head">
                  <BarChart3 size={16} />
                  <strong>{r.nome}</strong>
                </div>
                <p className="pn-list-meta">{r.filtros.length ? `Filtros: ${r.filtros.join(", ")}` : "Sem filtros"}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
