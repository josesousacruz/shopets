import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";
import { STATUS_LABEL } from "~/lib/pedido";

export const meta: MetaFunction = () => [{ title: "Pedidos — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const busca = url.searchParams.get("busca") ?? "";
  const page = url.searchParams.get("page") ?? "1";

  const res = await painel.pedidos.list(token, {
    status: status || undefined,
    busca: busca || undefined,
    page,
  });

  return json({
    pedidos: res.data,
    meta: res.meta,
    statusOptions: res.status_options,
    filtros: { status, busca },
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

export default function PainelPedidos() {
  const { pedidos, meta, statusOptions, filtros } = useLoaderData<typeof loader>();
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
          <h1>Pedidos</h1>
          <p>{meta.total} pedido(s) no total.</p>
        </div>
      </div>

      <Form method="get" className="pn-filters">
        <div className="ct-field grow" style={{ marginTop: 0 }}>
          <label htmlFor="busca">Busca</label>
          <input
            id="busca"
            name="busca"
            type="search"
            placeholder="Nº do pedido, cliente ou e-mail"
            defaultValue={filtros.busca}
          />
        </div>
        <div className="ct-field" style={{ marginTop: 0, minWidth: 200 }}>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={filtros.status}>
            <option value="">Todos</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="pn-btn-sm ink" style={{ height: 46 }}>
          Filtrar
        </button>
      </Form>

      {pedidos.length === 0 ? (
        <div className="pn-table-wrap">
          <div className="pn-empty">Nenhum pedido encontrado.</div>
        </div>
      ) : (
        <div className="pn-table-wrap">
          <table className="pn-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.numero}>
                  <td>
                    <Link to={`/painel/pedidos/${p.numero}`} className="row-link">
                      {p.numero}
                    </Link>
                  </td>
                  <td>
                    {p.cliente}
                    {p.cliente_email && (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.cliente_email}</div>
                    )}
                  </td>
                  <td>{fmtData(p.data)}</td>
                  <td>{p.itens_count}</td>
                  <td>{formatBRL(p.total)}</td>
                  <td>
                    <span className={`pn-chip st-${p.status}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/painel/pedidos/${p.numero}`} className="pn-btn-sm ghost">
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
