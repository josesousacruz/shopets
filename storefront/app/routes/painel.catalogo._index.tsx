import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useFetcher, useLoaderData, useSearchParams } from "@remix-run/react";
import { ImageOff, Plus } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";

export const meta: MetaFunction = () => [{ title: "Catálogo — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const url = new URL(request.url);
  const busca = url.searchParams.get("busca") ?? "";
  const categoria = url.searchParams.get("categoria") ?? "";
  const page = url.searchParams.get("page") ?? "1";

  const [produtos, categorias] = await Promise.all([
    painel.produtos.list(token, {
      busca: busca || undefined,
      categoria: categoria || undefined,
      page,
    }),
    painel.categorias.list(token),
  ]);

  return json({
    produtos: produtos.data,
    meta: produtos.meta,
    categorias: categorias.data,
    filtros: { busca, categoria },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const visivel = form.get("visivel_ecommerce") === "true";

  try {
    await painel.produtos.update(token, id, { visivel_ecommerce: visivel });
    return json({ ok: true, id, visivel });
  } catch (err) {
    if (err instanceof PainelValidationError) {
      return json({ ok: false, erro: err.message }, { status: 422 });
    }
    throw err;
  }
}

function ToggleLoja({ id, visivel }: { id: number; visivel: boolean }) {
  const fetcher = useFetcher<typeof action>();
  // Optimistic: usa o valor submetido se houver fetch em andamento.
  const pending = fetcher.formData?.get("visivel_ecommerce");
  const checked = pending != null ? pending === "true" : visivel;

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="visivel_ecommerce" value={(!checked).toString()} />
      <label className="pn-switch" title="Visível na loja">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => fetcher.submit(e.currentTarget.form)}
        />
        <span className="track" />
      </label>
    </fetcher.Form>
  );
}

export default function Catalogo() {
  const { produtos, meta, categorias, filtros } = useLoaderData<typeof loader>();
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
          <span className="eye">Produtos</span>
          <h1>Catálogo</h1>
          <p>{meta.total} produto(s).</p>
        </div>
        <Link to="/painel/catalogo/novo" className="pn-btn-sm mint">
          <Plus size={15} /> Novo produto
        </Link>
      </div>

      <Form method="get" className="pn-filters">
        <div className="ct-field grow" style={{ marginTop: 0 }}>
          <label htmlFor="busca">Busca</label>
          <input
            id="busca"
            name="busca"
            type="search"
            placeholder="Nome, código interno ou de barras"
            defaultValue={filtros.busca}
          />
        </div>
        <div className="ct-field" style={{ marginTop: 0, minWidth: 200 }}>
          <label htmlFor="categoria">Categoria</label>
          <select id="categoria" name="categoria" defaultValue={filtros.categoria}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="pn-btn-sm ink" style={{ height: 46 }}>
          Filtrar
        </button>
      </Form>

      {produtos.length === 0 ? (
        <div className="pn-table-wrap">
          <div className="pn-empty">Nenhum produto encontrado.</div>
        </div>
      ) : (
        <div className="pn-table-wrap">
          <table className="pn-table">
            <thead>
              <tr>
                <th></th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Na loja?</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.thumb ? (
                      <img className="pn-thumb" src={p.thumb} alt="" />
                    ) : (
                      <span className="pn-thumb ph">
                        <ImageOff size={18} />
                      </span>
                    )}
                  </td>
                  <td>
                    <Link to={`/painel/catalogo/${p.id}`} className="row-link">
                      {p.nome}
                    </Link>
                  </td>
                  <td>{p.categoria ?? "—"}</td>
                  <td>
                    {p.preco_promocional != null ? (
                      <>
                        <span style={{ fontWeight: 700 }}>{formatBRL(p.preco_promocional)}</span>
                        <div style={{ fontSize: 12, color: "var(--strike)", textDecoration: "line-through" }}>
                          {formatBRL(p.preco_venda)}
                        </div>
                      </>
                    ) : (
                      formatBRL(p.preco_venda)
                    )}
                  </td>
                  <td>{p.estoque_atual ?? "—"}</td>
                  <td>
                    <ToggleLoja id={p.id} visivel={p.visivel_ecommerce} />
                  </td>
                  <td>
                    <Link to={`/painel/catalogo/${p.id}`} className="pn-btn-sm ghost">
                      Editar
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
