import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { Plus, Store } from "lucide-react";
import { EmptyState } from "~/components/painel/EmptyState";
import { KpiStrip } from "~/components/painel/KpiStrip";
import { StatusBadge } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Pontos de Venda — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const [pdvs, depRes] = await Promise.all([painel.pdv.list(token), painel.estoque.depositos(token)]);
  return json({ pdvs: pdvs.data, depositos: depRes.data });
}

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  try {
    await painel.pdv.create(token, {
      nome_pdv: String(fd.get("nome_pdv")),
      deposito_id: fd.get("deposito_id") ? Number(fd.get("deposito_id")) : null,
      permite_retirada: fd.get("permite_retirada") === "1",
    });
  } catch (e) {
    if (e instanceof PainelValidationError) return json({ erro: e.message }, { status: e.status });
    return json({ erro: "Falha ao criar PDV." }, { status: 500 });
  }
  return redirect("/painel/pdv?feedback=criar");
}

export default function PdvIndex() {
  const { pdvs, depositos } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  const ativos = pdvs.filter((p) => p.ativo).length;
  const novo = searchParams.get("novo") === "1";

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Operação</span>
          <h1>Pontos de Venda</h1>
          <p>{pdvs.length} PDV(s).</p>
        </div>
        <div className="pn-head-actions">
          <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset><Plus size={14} /> Novo PDV</Link>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "Total", value: pdvs.length, tone: "info" },
          { label: "Ativos", value: ativos, tone: "ok" },
          { label: "Com depósito", value: pdvs.filter((p) => p.deposito_id).length, tone: "muted" },
        ]}
      />

      {pdvs.length === 0 ? (
        <div className="pn-card">
          <EmptyState icon={Store} title="Nenhum ponto de venda" description="Cadastre lojas físicas para multi-PDV." />
        </div>
      ) : (
        <div className="pn-cards-grid">
          {pdvs.map((p) => (
            <Link to={`/painel/pdv/${p.id_pdv}`} className="pn-card pn-pdv-card" key={p.id_pdv}>
              <div className="pn-pdv-card-head">
                <Store size={18} />
                <strong>{p.nome_pdv}</strong>
                <StatusBadge tone={p.ativo ? "ok" : "muted"}>{p.ativo ? "Ativo" : "Inativo"}</StatusBadge>
              </div>
              <p className="pn-list-meta">{p.endereco ?? "Sem endereço"}</p>
              <div className="pn-pdv-card-meta">
                <span>Depósito: {p.deposito?.nome ?? "—"}</span>
                <span>Operadores: {p.users_count ?? 0}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {novo ? (
        <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="pn-drawer">
            <div className="pn-drawer-head">
              <h3>Novo ponto de venda</h3>
              <Link to="/painel/pdv" className="pn-btn-link" preventScrollReset>Fechar</Link>
            </div>
            <Form method="post" replace>
              <div className="pn-drawer-body">
                <div className="pn-field">
                  <label htmlFor="nome_pdv">Nome *</label>
                  <input id="nome_pdv" name="nome_pdv" required autoFocus />
                </div>
                <div className="pn-field">
                  <label htmlFor="deposito_id">Depósito vinculado</label>
                  <select id="deposito_id" name="deposito_id" defaultValue="">
                    <option value="">—</option>
                    {depositos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>
                <label className="pn-check">
                  <input type="checkbox" name="permite_retirada" value="1" /> Permite retirada
                </label>
              </div>
              <div className="pn-drawer-foot">
                <Link to="/painel/pdv" className="pn-btn-sm" preventScrollReset>Cancelar</Link>
                <button type="submit" className="pn-btn-sm mint" disabled={enviando}>{enviando ? "Salvando…" : "Salvar"}</button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
