import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useSearchParams } from "@remix-run/react";
import { ClipboardList, ChevronLeft, Plus } from "lucide-react";
import { useActionFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Inventários — Painel Shopets" }];

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  contando: "Em contagem",
  divergencias: "Com divergências",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);

  const [lista, depRes] = await Promise.all([
    painel.estoque.inventarios.list(token, {
      deposito_id: url.searchParams.get("deposito_id") ? Number(url.searchParams.get("deposito_id")) : undefined,
      status: url.searchParams.get("status") ?? undefined,
    }),
    painel.estoque.depositos(token),
  ]);

  return json({
    inventarios: lista.data,
    meta: lista.meta,
    depositos: depRes.data,
    abrindo: url.searchParams.get("abrir") === "1",
  });
}

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const deposito_id = Number(fd.get("deposito_id"));
  const observacoes = String(fd.get("observacoes") ?? "").trim() || undefined;

  if (!deposito_id) {
    return json({ erro: "Escolha um depósito." }, { status: 422 });
  }

  try {
    const r = await painel.estoque.inventarios.create(token, { deposito_id, observacoes });
    return redirect(`/painel/estoque/inventario/${r.data.id}?feedback=create`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Falha ao abrir inventário.";
    return json({ erro: msg }, { status: 422 });
  }
}

export default function InventariosIndex() {
  const { inventarios, meta, depositos, abrindo } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  useActionFeedback(actionData);

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">
            <Link to="/painel/estoque" className="pn-btn-link">
              <ChevronLeft size={12} /> Estoque
            </Link>{" "}
            · Operação
          </span>
          <h1>
            <ClipboardList size={18} /> Inventários
          </h1>
          <p>{meta.total} inventário(s) registrado(s).</p>
        </div>
        <div className="pn-head-actions">
          <Link to="?abrir=1" className="pn-btn-sm mint" preventScrollReset>
            <Plus size={14} /> Novo inventário
          </Link>
        </div>
      </div>

      <Form method="get" className="pn-card pn-filters">
        <div className="filters-row">
          <select name="deposito_id" defaultValue={searchParams.get("deposito_id") ?? ""}>
            <option value="">Todos depósitos</option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={searchParams.get("status") ?? ""}>
            <option value="">Todos status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button className="pn-btn-sm">Filtrar</button>
        </div>
      </Form>

      <div className="pn-card pn-table-wrap">
        <table className="pn-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Depósito</th>
              <th>Aberto por</th>
              <th>Aberto em</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {inventarios.length === 0 ? (
              <tr>
                <td colSpan={6} className="pn-empty-row">
                  Nenhum inventário registrado.
                </td>
              </tr>
            ) : (
              inventarios.map((i) => (
                <tr key={i.id}>
                  <td>#{i.id}</td>
                  <td>{i.deposito?.nome ?? `#${i.deposito_id}`}</td>
                  <td>{i.aberto_por?.name ?? "—"}</td>
                  <td>{i.aberto_em ? new Date(i.aberto_em).toLocaleString("pt-BR") : "—"}</td>
                  <td>{STATUS_LABEL[i.status] ?? i.status}</td>
                  <td className="pn-row-actions">
                    <Link to={`/painel/estoque/inventario/${i.id}`} className="pn-btn-link">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {abrindo ? (
        <div className="pn-drawer-backdrop">
          <div className="pn-drawer">
            <div className="pn-drawer-head">
              <h3>Novo inventário</h3>
              <Link to="/painel/estoque/inventario" className="pn-btn-link">
                Fechar
              </Link>
            </div>
            <Form method="post" replace>
              <div className="pn-drawer-body">
                <div className="pn-field">
                  <label htmlFor="deposito_id">Depósito</label>
                  <select id="deposito_id" name="deposito_id" required defaultValue="">
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {depositos
                      .filter((d) => d.ativo)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nome}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="pn-field">
                  <label htmlFor="observacoes">Observações</label>
                  <textarea id="observacoes" name="observacoes" rows={3} maxLength={2000} />
                </div>
                {actionData && "erro" in actionData ? (
                  <p className="pn-form-err">{actionData.erro}</p>
                ) : null}
                <p className="pn-list-meta">
                  Ao abrir, todos os SKUs com saldo no depósito serão carregados como linhas de contagem.
                </p>
              </div>
              <div className="pn-drawer-foot">
                <Link to="/painel/estoque/inventario" className="pn-btn-sm">
                  Cancelar
                </Link>
                <button className="pn-btn-sm mint">Abrir inventário</button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
