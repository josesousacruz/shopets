import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { Filter, Plus, Receipt } from "lucide-react";
import { EmptyState } from "~/components/painel/EmptyState";
import { KpiStrip } from "~/components/painel/KpiStrip";
import { StatusBadge } from "~/components/painel/StatusBadge";
import type { StatusTone } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { drawerShouldRevalidate } from "~/lib/drawer-revalidate";
import type { ContaItem } from "~/lib/painel.server";
import { painel, PainelValidationError } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";

export const meta: MetaFunction = () => [{ title: "Contas a Pagar — Painel Shopets" }];

/** Abrir/fechar o drawer (?novo/?baixar) não refaz a listagem — abre instantâneo. */
export const shouldRevalidate = drawerShouldRevalidate(["novo", "baixar"]);

function tone(c: ContaItem): StatusTone {
  if (c.status === "pago") return "ok";
  if (c.status === "cancelado") return "muted";
  if (c.status === "pendente" && c.data_vencimento < new Date().toISOString().slice(0, 10)) return "danger";
  return "warn";
}

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);
  const [lista, contasBanc] = await Promise.all([
    painel.financeiro.contasPagar.list(token, {
      status: url.searchParams.get("status") ?? undefined,
      vencimento_de: url.searchParams.get("vencimento_de") ?? undefined,
      vencimento_ate: url.searchParams.get("vencimento_ate") ?? undefined,
    }),
    painel.financeiro.contasBancarias.list(token),
  ]);
  return json({ contas: lista.data, meta: lista.meta, resumo: lista.resumo, contasBanc: contasBanc.data });
}

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const intent = String(fd.get("intent") ?? "");

  try {
    if (intent === "criar") {
      await painel.financeiro.contasPagar.create(token, {
        descricao: String(fd.get("descricao")),
        valor_original: Number(fd.get("valor_original")),
        data_vencimento: String(fd.get("data_vencimento")),
        categoria: String(fd.get("categoria")),
        parcelas: fd.get("parcelas") ? Number(fd.get("parcelas")) : 1,
        intervalo_dias: fd.get("intervalo_dias") ? Number(fd.get("intervalo_dias")) : 30,
      });
      return redirect("/painel/financeiro/contas-pagar?feedback=criar");
    }
    if (intent === "baixar") {
      await painel.financeiro.contasPagar.baixar(token, String(fd.get("id")), {
        data_pagamento: String(fd.get("data_pagamento")) || null,
        conta_bancaria_id: fd.get("conta_bancaria_id") ? Number(fd.get("conta_bancaria_id")) : null,
      });
      return redirect("/painel/financeiro/contas-pagar?feedback=baixa");
    }
    return json({ erro: "Operação desconhecida." }, { status: 400 });
  } catch (e) {
    if (e instanceof PainelValidationError) return json({ erro: e.message }, { status: e.status });
    return json({ erro: "Falha ao processar." }, { status: 500 });
  }
}

export default function ContasPagar() {
  const { contas, meta, resumo, contasBanc } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  const novo = searchParams.get("novo") === "1";
  const baixarId = searchParams.get("baixar");
  const baixando = baixarId ? contas.find((c) => String(c.id_conta_pagar) === baixarId) ?? null : null;

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Financeiro</span>
          <h1>Contas a Pagar</h1>
          <p>{meta.total} conta(s).</p>
        </div>
        <div className="pn-head-actions">
          <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset>
            <Plus size={14} /> Nova conta
          </Link>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "Pendente", value: formatBRL(resumo.pendente), tone: "warn" },
          { label: "Vencido", value: formatBRL(resumo.vencido), tone: resumo.vencido > 0 ? "danger" : "muted" },
          { label: "Pago no mês", value: formatBRL(resumo.pago_mes ?? 0), tone: "ok" },
        ]}
      />

      <div className="pn-card pn-filters">
        <Form method="get" className="filters-row">
          <select name="status" defaultValue={searchParams.get("status") ?? ""}>
            <option value="">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="pago">Pagas</option>
            <option value="cancelado">Canceladas</option>
          </select>
          <input type="date" name="vencimento_de" defaultValue={searchParams.get("vencimento_de") ?? ""} />
          <input type="date" name="vencimento_ate" defaultValue={searchParams.get("vencimento_ate") ?? ""} />
          <button className="pn-btn-sm mint"><Filter size={14} /> Filtrar</button>
        </Form>
      </div>

      <div className="pn-card pn-table-wrap">
        {contas.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhuma conta a pagar" description="Lance contas ou receba pedidos de compra." />
        ) : (
          <table className="pn-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Fornecedor</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contas.map((c) => (
                <tr key={c.id_conta_pagar}>
                  <td>
                    <strong>{c.descricao}</strong>
                    {c.total_parcelas > 1 ? <span className="pn-list-meta">Parcela {c.numero_parcela}/{c.total_parcelas}</span> : null}
                  </td>
                  <td>{c.fornecedor?.nome ?? "—"}</td>
                  <td>{new Date(c.data_vencimento).toLocaleDateString("pt-BR")}</td>
                  <td>{formatBRL(Number(c.valor_original))}</td>
                  <td><StatusBadge tone={tone(c)}>{c.status === "pendente" && tone(c) === "danger" ? "Vencido" : c.status}</StatusBadge></td>
                  <td className="pn-row-actions">
                    {c.status === "pendente" ? (
                      <Link to={`?baixar=${c.id_conta_pagar}`} className="pn-btn-link" preventScrollReset>Pagar</Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {novo ? (
        <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="pn-drawer">
            <div className="pn-drawer-head">
              <h3>Nova conta a pagar</h3>
              <Link to="/painel/financeiro/contas-pagar" className="pn-btn-link" preventScrollReset>Fechar</Link>
            </div>
            <Form method="post" replace>
              <input type="hidden" name="intent" value="criar" />
              <div className="pn-drawer-body">
                <div className="pn-field">
                  <label htmlFor="descricao">Descrição *</label>
                  <input id="descricao" name="descricao" required autoFocus />
                </div>
                <div className="pn-field-row">
                  <div className="pn-field">
                    <label htmlFor="valor_original">Valor *</label>
                    <input id="valor_original" name="valor_original" type="number" step="0.01" min={0.01} required />
                  </div>
                  <div className="pn-field">
                    <label htmlFor="data_vencimento">Vencimento *</label>
                    <input id="data_vencimento" name="data_vencimento" type="date" required />
                  </div>
                </div>
                <div className="pn-field">
                  <label htmlFor="categoria">Categoria *</label>
                  <select id="categoria" name="categoria" required defaultValue="despesa_operacional">
                    <option value="fornecedor">Fornecedor</option>
                    <option value="despesa_operacional">Despesa operacional</option>
                    <option value="imposto">Imposto</option>
                    <option value="financiamento">Financiamento</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div className="pn-field-row">
                  <div className="pn-field">
                    <label htmlFor="parcelas">Parcelas</label>
                    <input id="parcelas" name="parcelas" type="number" min={1} max={60} defaultValue={1} />
                  </div>
                  <div className="pn-field">
                    <label htmlFor="intervalo_dias">Intervalo (dias)</label>
                    <input id="intervalo_dias" name="intervalo_dias" type="number" min={1} defaultValue={30} />
                  </div>
                </div>
              </div>
              <div className="pn-drawer-foot">
                <Link to="/painel/financeiro/contas-pagar" className="pn-btn-sm" preventScrollReset>Cancelar</Link>
                <button type="submit" className="pn-btn-sm mint" disabled={enviando}>{enviando ? "Salvando…" : "Salvar"}</button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}

      {baixando ? (
        <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="pn-drawer">
            <div className="pn-drawer-head">
              <h3>Pagar conta</h3>
              <Link to="/painel/financeiro/contas-pagar" className="pn-btn-link" preventScrollReset>Fechar</Link>
            </div>
            <Form method="post" replace>
              <input type="hidden" name="intent" value="baixar" />
              <input type="hidden" name="id" value={baixando.id_conta_pagar} />
              <div className="pn-drawer-body">
                <p><strong>{baixando.descricao}</strong> — {formatBRL(Number(baixando.valor_original))}</p>
                <div className="pn-field">
                  <label htmlFor="data_pagamento">Data do pagamento</label>
                  <input id="data_pagamento" name="data_pagamento" type="date" />
                </div>
                <div className="pn-field">
                  <label htmlFor="conta_bancaria_id">Conta bancária</label>
                  <select id="conta_bancaria_id" name="conta_bancaria_id" defaultValue="">
                    <option value="">—</option>
                    {contasBanc.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="pn-drawer-foot">
                <Link to="/painel/financeiro/contas-pagar" className="pn-btn-sm" preventScrollReset>Cancelar</Link>
                <button type="submit" className="pn-btn-sm mint" disabled={enviando}>{enviando ? "…" : "Confirmar pagamento"}</button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
