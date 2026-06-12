import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { Filter, AlertTriangle, Pencil, History, ArrowRightLeft } from "lucide-react";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Estoque — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);

  const [saldos, depRes] = await Promise.all([
    painel.estoque.list(token, {
      q: url.searchParams.get("q") ?? undefined,
      deposito_id: url.searchParams.get("deposito_id") ? Number(url.searchParams.get("deposito_id")) : undefined,
      abaixo_minimo: url.searchParams.get("abaixo_minimo") === "1",
    }),
    painel.estoque.depositos(token),
  ]);

  const ajustarId = url.searchParams.get("ajustar");
  const ajustando = ajustarId ? saldos.data.find((s) => String(s.id) === ajustarId) ?? null : null;

  return json({
    saldos: saldos.data,
    meta: saldos.meta,
    depositos: depRes.data,
    ajustando,
  });
}

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const intent = fd.get("intent");

  if (intent !== "ajustar") {
    return json({ erro: "Operação desconhecida." }, { status: 400 });
  }

  const produto_variacao_id = Number(fd.get("produto_variacao_id"));
  const deposito_id = Number(fd.get("deposito_id"));
  const qtd_delta = Number(fd.get("qtd_delta"));
  const motivo = String(fd.get("motivo") ?? "").trim();

  if (!produto_variacao_id || !deposito_id || !qtd_delta || !motivo) {
    return json({ erro: "Preencha todos os campos do ajuste." }, { status: 422 });
  }

  try {
    await painel.estoque.ajustar(token, { produto_variacao_id, deposito_id, qtd_delta, motivo });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Falha ao ajustar saldo.";
    return json({ erro: msg }, { status: 422 });
  }

  // remove ?ajustar=... e mantém demais filtros, sinaliza feedback
  const url = new URL(req.url);
  url.searchParams.delete("ajustar");
  url.searchParams.set("feedback", "ajuste");
  return redirect(url.pathname + "?" + url.searchParams.toString());
}

export default function EstoqueIndex() {
  const { saldos, meta, depositos, ajustando } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  const queryString = (() => {
    const cleaned = new URLSearchParams(searchParams);
    cleaned.delete("ajustar");
    const s = cleaned.toString();
    return s ? `?${s}` : "";
  })();

  const drawerCloseHref = `/painel/estoque${queryString}`;

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Operação</span>
          <h1>Estoque</h1>
          <p>
            {meta.total} saldo(s) registrado(s) em {depositos.length} depósito(s).
          </p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/estoque/transferencias" className="pn-btn-sm">
            <ArrowRightLeft size={14} /> Transferências
          </Link>
        </div>
      </div>

      <div className="pn-card pn-filters">
        <Form method="get" className="filters-row">
          <input name="q" defaultValue={searchParams.get("q") ?? ""} placeholder="SKU ou produto" />
          <select name="deposito_id" defaultValue={searchParams.get("deposito_id") ?? ""}>
            <option value="">Todos depósitos</option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
                {d.default ? " (padrão)" : ""}
              </option>
            ))}
          </select>
          <label className="pn-check">
            <input
              type="checkbox"
              name="abaixo_minimo"
              value="1"
              defaultChecked={searchParams.get("abaixo_minimo") === "1"}
            />
            Apenas abaixo do mínimo
          </label>
          <button className="pn-btn-sm mint">
            <Filter size={14} /> Filtrar
          </button>
        </Form>
      </div>

      <div className="pn-card pn-table-wrap">
        <table className="pn-table">
          <thead>
            <tr>
              <th>Produto / SKU</th>
              <th>Depósito</th>
              <th>Saldo</th>
              <th>Reservado</th>
              <th>Disponível</th>
              <th>Mínimo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {saldos.length === 0 ? (
              <tr>
                <td colSpan={7} className="pn-empty-row">
                  Nenhum saldo encontrado.
                </td>
              </tr>
            ) : (
              saldos.map((s) => {
                const disp = Math.max(0, s.saldo - s.reservado);
                const baixo = s.minimo > 0 && s.saldo < s.minimo;
                const variacaoId = s.variacao?.id_variacao;
                const ajustarParams = new URLSearchParams(searchParams);
                ajustarParams.set("ajustar", String(s.id));
                return (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.variacao?.produto?.nome ?? "—"}</strong>
                      <span className="pn-list-meta">
                        SKU: {s.variacao?.sku ?? "—"}
                        {s.variacao?.nome_variacao ? ` · ${s.variacao.nome_variacao}` : ""}
                      </span>
                    </td>
                    <td>{s.deposito?.nome ?? "—"}</td>
                    <td>{s.saldo}</td>
                    <td>{s.reservado}</td>
                    <td>
                      <strong>{disp}</strong>
                    </td>
                    <td>
                      {s.minimo}
                      {baixo && (
                        <AlertTriangle
                          size={14}
                          color="var(--pn-warning, #d97706)"
                          style={{ marginLeft: 6, verticalAlign: "middle" }}
                        />
                      )}
                    </td>
                    <td className="pn-row-actions">
                      <Link to={`?${ajustarParams}`} className="pn-btn-link" preventScrollReset>
                        <Pencil size={12} /> Ajustar
                      </Link>
                      {variacaoId ? (
                        <Link to={`/painel/estoque/kardex/${variacaoId}`} className="pn-btn-link">
                          <History size={12} /> Kardex
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {ajustando ? (
        <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="pn-drawer">
            <div className="pn-drawer-head">
              <h3>Ajustar saldo</h3>
              <Link to={drawerCloseHref} className="pn-btn-link" preventScrollReset>
                Fechar
              </Link>
            </div>
            <Form method="post" replace>
              <input type="hidden" name="intent" value="ajustar" />
              <input
                type="hidden"
                name="produto_variacao_id"
                value={ajustando.variacao?.id_variacao ?? ""}
              />
              <input
                type="hidden"
                name="deposito_id"
                value={ajustando.deposito?.id ?? ""}
              />
              <div className="pn-drawer-body">
                <p className="pn-list-meta" style={{ marginBottom: 10 }}>
                  <strong>{ajustando.variacao?.produto?.nome ?? "—"}</strong>
                  <br />
                  SKU {ajustando.variacao?.sku ?? "—"} · Depósito {ajustando.deposito?.nome ?? "—"}
                  <br />
                  Saldo atual: <strong>{ajustando.saldo}</strong>
                </p>
                <div className="pn-field">
                  <label htmlFor="qtd_delta">Variação (+ entrada, − saída)</label>
                  <input
                    id="qtd_delta"
                    name="qtd_delta"
                    type="number"
                    step="1"
                    required
                    autoFocus
                    placeholder="ex.: 5 ou -2"
                  />
                </div>
                <div className="pn-field">
                  <label htmlFor="motivo">Motivo</label>
                  <input id="motivo" name="motivo" required maxLength={255} />
                </div>
                {actionData && "erro" in actionData ? (
                  <p className="pn-form-err">{actionData.erro}</p>
                ) : null}
              </div>
              <div className="pn-drawer-foot">
                <Link to={drawerCloseHref} className="pn-btn-sm">
                  Cancelar
                </Link>
                <button className="pn-btn-sm mint" disabled={enviando}>
                  {enviando ? "Salvando..." : "Salvar ajuste"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
