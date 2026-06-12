import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { ChevronLeft, ClipboardList, CheckCircle2, XCircle } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Inventário — Painel Shopets" }];

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  contando: "Em contagem",
  divergencias: "Com divergências",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export async function loader({ request: req, params }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const id = Number(params.id);
  if (!id) throw new Response("Inventário não encontrado", { status: 404 });
  const res = await painel.estoque.inventarios.show(token, id);
  return json({ inventario: res.data });
}

export async function action({ request: req, params }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const id = Number(params.id);
  const fd = await req.formData();
  const intent = String(fd.get("intent") ?? "");

  try {
    if (intent === "contar") {
      const produto_variacao_id = Number(fd.get("produto_variacao_id"));
      const saldo_contado = Number(fd.get("saldo_contado"));
      const observacoes = String(fd.get("observacoes") ?? "").trim() || undefined;
      await painel.estoque.inventarios.contar(token, id, {
        produto_variacao_id,
        saldo_contado,
        observacoes,
      });
      return json({ ok: true });
    }
    if (intent === "concluir") {
      await painel.estoque.inventarios.concluir(token, id);
      return redirect(`/painel/estoque/inventario/${id}`);
    }
    if (intent === "cancelar") {
      await painel.estoque.inventarios.cancelar(token, id);
      return redirect(`/painel/estoque/inventario/${id}`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Falha na operação.";
    return json({ error: msg }, { status: 422 });
  }

  return json({ error: "Intent inválida." }, { status: 400 });
}

export default function InventarioDetalhe() {
  const { inventario } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";

  const ativo = inventario.status !== "concluido" && inventario.status !== "cancelado";
  const totalDiverg = inventario.contagens.filter(
    (c) => c.saldo_contado != null && (c.diferenca ?? 0) !== 0,
  ).length;
  const naoContadas = inventario.contagens.filter((c) => c.saldo_contado == null).length;

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">
            <Link to="/painel/estoque/inventario" className="pn-btn-link">
              <ChevronLeft size={12} /> Inventários
            </Link>{" "}
            · Folha
          </span>
          <h1>
            <ClipboardList size={18} /> Inventário #{inventario.id} ·{" "}
            {inventario.deposito?.nome ?? `Dep ${inventario.deposito_id}`}
          </h1>
          <p>
            Status: <strong>{STATUS_LABEL[inventario.status] ?? inventario.status}</strong>
            {" · "}
            {inventario.contagens.length} SKUs ·{" "}
            {totalDiverg} divergência(s) · {naoContadas} pendente(s)
          </p>
        </div>
        {ativo ? (
          <div className="pn-head-actions" style={{ display: "flex", gap: 8 }}>
            <Form method="post" replace>
              <input type="hidden" name="intent" value="cancelar" />
              <button className="pn-btn-sm" disabled={enviando}>
                <XCircle size={14} /> Cancelar
              </button>
            </Form>
            <Form method="post" replace>
              <input type="hidden" name="intent" value="concluir" />
              <button className="pn-btn-sm mint" disabled={enviando || naoContadas === inventario.contagens.length}>
                <CheckCircle2 size={14} /> Concluir e ajustar
              </button>
            </Form>
          </div>
        ) : null}
      </div>

      {actionData && "error" in actionData ? (
        <p className="pn-form-err">{actionData.error}</p>
      ) : null}

      <div className="pn-card pn-table-wrap">
        <table className="pn-table">
          <thead>
            <tr>
              <th>Produto / SKU</th>
              <th>Sistema</th>
              <th>Contado</th>
              <th>Diferença</th>
              <th>Obs.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {inventario.contagens.length === 0 ? (
              <tr>
                <td colSpan={6} className="pn-empty-row">
                  Sem linhas de contagem.
                </td>
              </tr>
            ) : (
              inventario.contagens.map((c) => {
                const dif = c.diferenca ?? 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.variacao?.produto?.nome ?? "—"}</strong>
                      <span className="pn-list-meta">SKU: {c.variacao?.sku ?? "—"}</span>
                    </td>
                    <td>{c.saldo_sistema}</td>
                    <td>
                      {ativo ? (
                        <Form method="post" replace>
                          <input type="hidden" name="intent" value="contar" />
                          <input
                            type="hidden"
                            name="produto_variacao_id"
                            value={c.produto_variacao_id}
                          />
                          <input
                            type="number"
                            min={0}
                            step={1}
                            name="saldo_contado"
                            defaultValue={c.saldo_contado ?? ""}
                            style={{ width: 80, marginRight: 6 }}
                            required
                          />
                          <button className="pn-btn-link" disabled={enviando}>
                            Salvar
                          </button>
                        </Form>
                      ) : (
                        c.saldo_contado ?? "—"
                      )}
                    </td>
                    <td>
                      {c.saldo_contado == null ? (
                        "—"
                      ) : (
                        <strong style={{ color: dif === 0 ? "var(--pn-text-muted)" : dif > 0 ? "var(--pn-success, #0d9488)" : "#b91c1c" }}>
                          {dif > 0 ? "+" : ""}
                          {dif}
                        </strong>
                      )}
                    </td>
                    <td>{c.observacoes ?? "—"}</td>
                    <td />
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
