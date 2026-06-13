import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { ArrowDownCircle, ArrowUpCircle, Landmark, ListTree, Receipt, ScrollText } from "lucide-react";
import { KpiStrip } from "~/components/painel/KpiStrip";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";

export const meta: MetaFunction = () => [{ title: "Financeiro — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);

  const [ap, ar, fluxo] = await Promise.all([
    painel.financeiro.contasPagar.list(token, {}),
    painel.financeiro.contasReceber.list(token, {}),
    painel.financeiro.fluxoCaixa(token, { modo: "realizado" }),
  ]);

  return json({ apResumo: ap.resumo, arResumo: ar.resumo, fluxo: fluxo.data });
}

export default function FinanceiroIndex() {
  const { apResumo, arResumo, fluxo } = useLoaderData<typeof loader>();

  const maxBar = Math.max(1, ...fluxo.linhas.map((l) => Math.max(l.entradas, l.saidas)));

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Financeiro</span>
          <h1>Visão geral</h1>
          <p>Contas a pagar/receber, fluxo de caixa e DRE.</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/financeiro/contas-receber" className="pn-btn-sm">
            <ArrowDownCircle size={14} /> A receber
          </Link>
          <Link to="/painel/financeiro/contas-pagar" className="pn-btn-sm">
            <ArrowUpCircle size={14} /> A pagar
          </Link>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "A receber (pendente)", value: formatBRL(arResumo.pendente), tone: "info" },
          { label: "A pagar (pendente)", value: formatBRL(apResumo.pendente), tone: "warn" },
          { label: "Vencidos (receber)", value: formatBRL(arResumo.vencido), tone: arResumo.vencido > 0 ? "danger" : "muted" },
          { label: "Vencidos (pagar)", value: formatBRL(apResumo.vencido), tone: apResumo.vencido > 0 ? "danger" : "muted" },
          { label: "Saldo realizado (mês)", value: formatBRL(fluxo.totais.saldo), tone: fluxo.totais.saldo >= 0 ? "ok" : "danger" },
        ]}
      />

      <div className="pn-card">
        <div className="pn-card-head">
          <h3>Fluxo de caixa realizado (mês atual)</h3>
          <Link to="/painel/financeiro/fluxo-caixa" className="pn-btn-link">
            Ver detalhado
          </Link>
        </div>
        {fluxo.linhas.length === 0 ? (
          <p className="pn-list-meta">Sem movimentações no período.</p>
        ) : (
          <div className="pn-fluxo-chart">
            {fluxo.linhas.map((l) => (
              <div className="pn-fluxo-col" key={l.data} title={`${l.data}: +${formatBRL(l.entradas)} / -${formatBRL(l.saidas)}`}>
                <div className="bars">
                  <span className="bar ent" style={{ height: `${(l.entradas / maxBar) * 100}%` }} />
                  <span className="bar sai" style={{ height: `${(l.saidas / maxBar) * 100}%` }} />
                </div>
                <span className="lbl">{l.data.slice(8, 10)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="pn-fluxo-legend">
          <span><i className="dot ent" /> Entradas</span>
          <span><i className="dot sai" /> Saídas</span>
        </div>
      </div>

      <div className="pn-card">
        <div className="pn-quick-links">
          <Link to="/painel/financeiro/plano-contas"><ListTree size={16} /> Plano de contas</Link>
          <Link to="/painel/financeiro/contas-bancarias"><Landmark size={16} /> Contas bancárias</Link>
          <Link to="/painel/financeiro/fluxo-caixa"><Receipt size={16} /> Fluxo de caixa</Link>
          <Link to="/painel/financeiro/dre"><ScrollText size={16} /> DRE</Link>
          <Link to="/painel/financeiro/conciliacao"><Landmark size={16} /> Conciliação OFX</Link>
        </div>
      </div>
    </div>
  );
}
