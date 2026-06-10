import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";
import { DEVOLUCAO_LABEL } from "~/lib/pedido";

export const meta: MetaFunction = () => [{ title: "Devoluções — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const page = url.searchParams.get("page") ?? "1";

  const res = await painel.devolucoes.list(token, {
    status: status || undefined,
    page,
  });

  return json({
    devolucoes: res.data,
    meta: res.meta,
    statusOptions: res.status_options,
    filtros: { status },
  });
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default function PainelDevolucoes() {
  const { devolucoes, meta, statusOptions, filtros } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();

  const goPage = (p: number) => {
    const q = new URLSearchParams(params);
    q.set("page", String(p));
    return `?${q}`;
  };

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Pós-venda</span>
          <h1>Devoluções</h1>
          <p>{meta.total} solicitação(ões) no total.</p>
        </div>
      </div>

      <Form method="get" className="pn-filters">
        <div className="ct-field" style={{ marginTop: 0, minWidth: 220 }}>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={filtros.status}>
            <option value="">Todos</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {DEVOLUCAO_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="pn-btn-sm ink" style={{ height: 46 }}>
          Filtrar
        </button>
      </Form>

      {devolucoes.length === 0 ? (
        <div className="pn-table-wrap">
          <div className="pn-empty">Nenhuma devolução encontrada.</div>
        </div>
      ) : (
        <div className="pn-table-wrap">
          <table className="pn-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Reembolso</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {devolucoes.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link to={`/painel/devolucoes/${d.id}`} className="row-link">
                      {d.id}
                    </Link>
                  </td>
                  <td>{d.pedido ?? "—"}</td>
                  <td>{d.cliente ?? "—"}</td>
                  <td>{fmtData(d.criado_em)}</td>
                  <td>{d.valor_reembolso != null ? formatBRL(d.valor_reembolso) : "—"}</td>
                  <td>
                    <span className={`pn-chip st-${d.status}`}>
                      {DEVOLUCAO_LABEL[d.status] ?? d.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/painel/devolucoes/${d.id}`} className="pn-btn-sm ghost">
                      Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.last_page > 1 && (
        <div className="pn-pager">
          <span>
            Página {meta.current_page} de {meta.last_page}
          </span>
          <div className="nav">
            {meta.current_page > 1 && (
              <Link to={goPage(meta.current_page - 1)} className="pn-btn-sm ghost">
                Anterior
              </Link>
            )}
            {meta.current_page < meta.last_page && (
              <Link to={goPage(meta.current_page + 1)} className="pn-btn-sm ghost">
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
