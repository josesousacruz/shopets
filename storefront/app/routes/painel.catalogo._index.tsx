import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useFetcher, useLoaderData, useSearchParams } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { ImageOff, Plus } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError } from "~/lib/painel.server";
import { Swal, toastSucesso } from "~/lib/painel-swal";
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

  try {
    if (form.get("_acao") === "bulk") {
      const ids = JSON.parse(String(form.get("ids") ?? "[]")) as number[];
      const action = String(form.get("action")) as "status" | "categoria" | "price_delta";
      const payload = JSON.parse(String(form.get("payload") ?? "{}"));
      const r = await painel.produtos.bulk(token, { ids, action, payload });
      return json({ ok: true, bulk: r.data.afetados });
    }

    const id = String(form.get("id") ?? "");
    const visivel = form.get("visivel_ecommerce") === "true";
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
  const bulkFetcher = useFetcher<typeof action>();
  const [selecionados, setSelecionados] = useState<number[]>([]);

  const goPage = (p: number) => {
    const q = new URLSearchParams(params);
    q.set("page", String(p));
    return `?${q}`;
  };

  const todosMarcados = produtos.length > 0 && selecionados.length === produtos.length;
  const toggleTodos = () => setSelecionados(todosMarcados ? [] : produtos.map((p) => p.id));
  const toggleUm = (id: number) =>
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submeterBulk = (action: "status" | "categoria" | "price_delta", payload: Record<string, unknown>) => {
    const fd = new FormData();
    fd.set("_acao", "bulk");
    fd.set("ids", JSON.stringify(selecionados));
    fd.set("action", action);
    fd.set("payload", JSON.stringify(payload));
    bulkFetcher.submit(fd, { method: "post" });
    setSelecionados([]);
  };

  const bulkStatus = (ativo: boolean) => submeterBulk("status", { visivel_ecommerce: ativo });

  const bulkCategoria = async () => {
    const { value } = await Swal.fire({
      title: "Mover para categoria",
      input: "select",
      inputOptions: Object.fromEntries(categorias.map((c) => [String(c.id), c.nome])),
      inputPlaceholder: "Selecione…",
      showCancelButton: true,
      confirmButtonText: "Aplicar",
      cancelButtonText: "Cancelar",
    });
    if (value) submeterBulk("categoria", { id_categoria: Number(value) });
  };

  const bulkPreco = async () => {
    const { value } = await Swal.fire({
      title: "Ajustar preço (%)",
      input: "number",
      inputLabel: "Variação percentual (ex.: 10 = +10%, -5 = −5%)",
      showCancelButton: true,
      confirmButtonText: "Aplicar",
      cancelButtonText: "Cancelar",
    });
    if (value !== undefined && value !== "") submeterBulk("price_delta", { tipo: "percentual", valor: Number(value) });
  };

  const ultimoBulk = useRef<unknown>(null);
  useEffect(() => {
    const d = bulkFetcher.data;
    if (bulkFetcher.state === "idle" && d && "bulk" in d && d.bulk != null && ultimoBulk.current !== d) {
      ultimoBulk.current = d;
      toastSucesso(`${d.bulk} produto(s) atualizado(s).`);
    }
  }, [bulkFetcher.data, bulkFetcher.state]);

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
                <th style={{ width: 28 }}>
                  <input type="checkbox" checked={todosMarcados} onChange={toggleTodos} aria-label="Selecionar todos" />
                </th>
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
                    <input
                      type="checkbox"
                      checked={selecionados.includes(p.id)}
                      onChange={() => toggleUm(p.id)}
                      aria-label={`Selecionar ${p.nome}`}
                    />
                  </td>
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

      {selecionados.length > 0 && (
        <div className="pn-bulk-bar">
          <span>{selecionados.length} selecionado(s)</span>
          <div className="acoes">
            <button type="button" className="pn-btn-sm" onClick={() => bulkStatus(true)} disabled={bulkFetcher.state !== "idle"}>
              Exibir na loja
            </button>
            <button type="button" className="pn-btn-sm" onClick={() => bulkStatus(false)} disabled={bulkFetcher.state !== "idle"}>
              Ocultar da loja
            </button>
            <button type="button" className="pn-btn-sm" onClick={bulkCategoria} disabled={bulkFetcher.state !== "idle"}>
              Mudar categoria
            </button>
            <button type="button" className="pn-btn-sm" onClick={bulkPreco} disabled={bulkFetcher.state !== "idle"}>
              Ajustar preço
            </button>
            <button type="button" className="pn-btn-link" onClick={() => setSelecionados([])}>
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
