import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Plus, Download, Search, Filter, X } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Clientes — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const url = new URL(request.url);

  const params = {
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    tag_id: url.searchParams.get("tag_id") ? Number(url.searchParams.get("tag_id")) : undefined,
    page: Number(url.searchParams.get("page") ?? "1"),
  };

  const lista = await painel.clientes.list(token, params);
  let tags: { id: number; nome: string; cor: string }[] = [];
  let segmentos: { id: number; nome: string; filtros: Record<string, unknown> }[] = [];
  try { tags = (await painel.clientes.tags.list(token)).data; } catch { /* opcional */ }
  try { segmentos = (await painel.clientes.segmentos.list(token)).data; } catch { /* opcional */ }

  return json({ ...lista, tags, segmentos });
}

const STATUS = [
  { value: "", label: "Todos" },
  { value: "ativo", label: "Ativos" },
  { value: "inativo", label: "Inativos" },
  { value: "sem_compras", label: "Sem compras" },
];

const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ClientesIndex() {
  const { data, meta, tags, segmentos } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const tagId = searchParams.get("tag_id") ?? "";
  const q = searchParams.get("q") ?? "";

  const filtrosAtivos = [status, tagId, q].filter(Boolean).length;

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Relacionamento</span>
          <h1>Clientes</h1>
          <p>{meta.total} cliente(s) cadastrado(s).</p>
        </div>
        <div className="pn-head-actions">
          <a
            className="pn-btn-sm ghost"
            href={`/api/v1/painel/clientes-export${searchParams.toString() ? `?${searchParams}` : ""}`}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={14} /> Exportar CSV
          </a>
          <Link to="/painel/clientes/novo" className="pn-btn-sm mint">
            <Plus size={14} /> Novo cliente
          </Link>
        </div>
      </div>

      <div className="pn-card pn-filters">
        <Form method="get" className="filters-row">
          <div className="filt-search">
            <Search size={14} color="var(--pn-text-muted)" />
            <input name="q" defaultValue={q} placeholder="Nome, email ou CPF/CNPJ" />
          </div>
          <select name="status" defaultValue={status}>
            {STATUS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select name="tag_id" defaultValue={tagId}>
            <option value="">Qualquer tag</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
          <button type="submit" className="pn-btn-sm mint">
            <Filter size={14} /> Filtrar
          </button>
          {filtrosAtivos > 0 && (
            <button
              type="button"
              className="pn-btn-sm ghost"
              onClick={() => setSearchParams({})}
            >
              <X size={14} /> Limpar
            </button>
          )}
        </Form>

        {segmentos.length > 0 && (
          <div className="filters-segs">
            <span>Segmentos salvos:</span>
            {segmentos.map((seg) => (
              <button
                key={seg.id}
                type="button"
                className="pn-chip"
                onClick={() => {
                  const params = new URLSearchParams();
                  Object.entries(seg.filtros).forEach(([k, v]) => {
                    if (v != null) params.set(k, String(v));
                  });
                  setSearchParams(params);
                }}
              >
                {seg.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pn-card pn-table-wrap">
        <table className="pn-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Pedidos</th>
              <th>Status</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={6} className="pn-empty-row">Nenhum cliente encontrado.</td></tr>
            ) : data.map((c) => (
              <tr key={c.id_cliente}>
                <td>
                  <Link to={`/painel/clientes/${c.id_cliente}`}>{c.nome}</Link>
                </td>
                <td>{c.email}</td>
                <td>{c.telefone ?? "—"}</td>
                <td>{c.pedidos_count ?? 0}</td>
                <td>
                  <span className={`pn-badge ${c.ativo ? "mint" : "gray"}`}>
                    {c.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta.last_page > 1 && (
          <div className="pn-pagination">
            <span>Página {meta.current_page} de {meta.last_page}</span>
            <div className="pn-pages">
              {meta.current_page > 1 && (
                <Link to={`?page=${meta.current_page - 1}`} className="pn-btn-sm ghost">Anterior</Link>
              )}
              {meta.current_page < meta.last_page && (
                <Link to={`?page=${meta.current_page + 1}`} className="pn-btn-sm ghost">Próxima</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
