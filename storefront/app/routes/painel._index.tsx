import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import {
  ShoppingBag,
  Clock,
  Truck,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Box,
  Package,
  Ticket,
  CircleDollarSign,
} from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";
import { STATUS_LABEL } from "~/lib/pedido";
import { SalesChart, Donut, type SalePoint } from "~/components/painel/charts";

export const meta: MetaFunction = () => [{ title: "Dashboard — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);

  const [todos, aguardando, separacao, enviado] = await Promise.all([
    painel.pedidos.list(token, {}),
    painel.pedidos.list(token, { status: "aguardando_pagamento" }),
    painel.pedidos.list(token, { status: "em_separacao" }),
    painel.pedidos.list(token, { status: "enviado" }),
  ]);

  let faturamento = 0;
  let pagosCount = 0;
  let page = 1;
  let lastPage = 1;
  const pagosPrimeiros: typeof separacao.data = [];
  do {
    const res = await painel.pedidos.list(token, { status: "pago", page });
    pagosCount = res.meta.total;
    lastPage = res.meta.last_page;
    for (const p of res.data) faturamento += p.total;
    if (page === 1) pagosPrimeiros.push(...res.data);
    page += 1;
  } while (page <= lastPage && page <= 25);

  const processar = [...pagosPrimeiros, ...separacao.data].slice(0, 6);

  const [serie, top, dashKpis] = await Promise.all([
    painel.dashboard.serieVendas(token, "30d"),
    painel.dashboard.topProdutos(token, "30d"),
    painel.dashboard.kpis(token, "30d"),
  ]);

  return json({
    kpis: {
      total: todos.meta.total,
      aguardando: aguardando.meta.total,
      pagos: pagosCount,
      em_separacao: separacao.meta.total,
      enviado: enviado.meta.total,
      faturamento,
    },
    processar,
    serie: serie.data,
    serieComparacao: serie.comparacao,
    topProdutos: top.data,
    dashKpis: dashKpis.data,
  });
}

/* ────────── Dados de PRÉVIA (exemplo) — substituir quando o backend expor ──────────
   Marcados visualmente com o selo "Prévia". Nenhum número abaixo é real. */
const AMOSTRA_VENDAS: SalePoint[] = [
  { dia: "28/05", ecom: 4200, pdv: 3100 },
  { dia: "29/05", ecom: 3800, pdv: 3600 },
  { dia: "30/05", ecom: 5100, pdv: 2900 },
  { dia: "31/05", ecom: 6200, pdv: 4100 },
  { dia: "01/06", ecom: 4900, pdv: 3800 },
  { dia: "02/06", ecom: 3600, pdv: 2700 },
  { dia: "03/06", ecom: 4400, pdv: 3300 },
  { dia: "04/06", ecom: 5600, pdv: 4200 },
  { dia: "05/06", ecom: 6100, pdv: 4600 },
  { dia: "06/06", ecom: 7200, pdv: 5100 },
  { dia: "07/06", ecom: 6800, pdv: 4800 },
  { dia: "08/06", ecom: 5400, pdv: 3900 },
  { dia: "09/06", ecom: 7600, pdv: 5400 },
  { dia: "10/06", ecom: 8900, pdv: 6200 },
];
const AMOSTRA_ESTOQUE = [
  { nome: "Ração Golden Adultos 15kg", atual: 4, minimo: 12 },
  { nome: "Antipulgas Bravecto 20-40kg", atual: 2, minimo: 10 },
  { nome: "Areia Sanitária Pipicat 12kg", atual: 6, minimo: 15 },
  { nome: "Coleira Seresto Cães G", atual: 1, minimo: 8 },
];
const AMOSTRA_ATIVIDADE = [
  { icon: ShoppingBag, texto: "Novo pedido #10492 de Patrícia Lemos", quando: "há 6 min" },
  { icon: Package, texto: "Entrada de estoque · Ração Golden 15kg (+30)", quando: "há 22 min" },
  { icon: RotateCcw, texto: "Devolução DEV-238 aguardando aprovação", quando: "há 48 min" },
  { icon: Truck, texto: "Pedido #10487 enviado · rastreio BR894512367SP", quando: "há 1 h" },
  { icon: Ticket, texto: "Cupom INVERNO20 atingiu 80% do limite de uso", quando: "há 2 h" },
];

function Preview() {
  return (
    <span className="pn-preview" title="Dados de exemplo até a integração com o backend">
      Prévia
    </span>
  );
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function PainelDashboard() {
  const { kpis, processar, serie, serieComparacao, topProdutos, dashKpis } = useLoaderData<typeof loader>();

  const vendas: SalePoint[] = serie.map((s) => ({
    dia: new Date(s.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    ecom: s.total,
    pdv: 0,
  }));
  const financeiro = {
    receber: dashKpis.a_receber_pendente,
    pagar: dashKpis.a_pagar_pendente,
    abaixoMinimo: dashKpis.estoque_abaixo_minimo,
  };
  const [periodo, setPeriodo] = useState("hoje");

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Visão geral</span>
          <h1>Dashboard</h1>
          <p>Acompanhe o desempenho e os pedidos da loja.</p>
        </div>
        <div className="pn-head-actions">
          <div className="pn-segmented">
            {[
              { v: "hoje", l: "Hoje" },
              { v: "7d", l: "7 dias" },
              { v: "30d", l: "30 dias" },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                className={periodo === o.v ? "active" : ""}
                onClick={() => setPeriodo(o.v)}
              >
                {o.l}
              </button>
            ))}
          </div>
          <Link to="/painel/catalogo/novo" className="pn-btn-sm ink">
            Novo produto
          </Link>
        </div>
      </div>

      {/* KPIs — dados reais */}
      <div className="pn-kpis">
        <div className="pn-kpi accent">
          <span className="ic">
            <TrendingUp />
          </span>
          <div className="kpi-text">
            <div className="label">Faturamento (pagos)</div>
            <div className="value pn-tnum">{formatBRL(kpis.faturamento)}</div>
          </div>
        </div>
        <div className="pn-kpi">
          <span className="ic">
            <ShoppingBag />
          </span>
          <div className="kpi-text">
            <div className="label">Pedidos (total)</div>
            <div className="value pn-tnum">{kpis.total}</div>
          </div>
        </div>
        <div className="pn-kpi">
          <span className="ic">
            <Clock />
          </span>
          <div className="kpi-text">
            <div className="label">Aguardando pagamento</div>
            <div className="value pn-tnum">{kpis.aguardando}</div>
          </div>
        </div>
        <div className="pn-kpi">
          <span className="ic">
            <Truck />
          </span>
          <div className="kpi-text">
            <div className="label">Enviados</div>
            <div className="value pn-tnum">{kpis.enviado}</div>
          </div>
        </div>
      </div>

      {/* Vendas por canal (prévia) + Pedidos a processar (real) */}
      <div className="pn-dash-grid">
        <div className="pn-card" style={{ padding: 0 }}>
          <div style={{ padding: "18px 22px 4px" }}>
            <div className="pn-section-head" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Vendas online
                </h3>
                <p>
                  Últimos 30 dias
                  {serieComparacao.variacao_pct != null
                    ? ` · ${serieComparacao.variacao_pct >= 0 ? "+" : ""}${serieComparacao.variacao_pct}% vs. período anterior`
                    : ""}
                </p>
              </div>
              <div className="pn-legend">
                <span>
                  <span className="sw" style={{ background: "var(--pn-accent)" }} />
                  E-commerce
                </span>
                <span>
                  <span className="sw" style={{ background: "#2563EB" }} />
                  PDV
                </span>
              </div>
            </div>
          </div>
          <div style={{ padding: "0 18px 16px" }}>
            <SalesChart data={vendas.length ? vendas : AMOSTRA_VENDAS} />
          </div>
        </div>

        <div className="pn-card" style={{ padding: 0 }}>
          <div style={{ padding: "18px 22px 14px" }}>
            <div className="pn-section-head" style={{ marginBottom: 0 }}>
              <div>
                <h3>Pedidos a processar</h3>
                <p>{processar.length} aguardando ação</p>
              </div>
              <Link to="/painel/pedidos?status=pago" className="pn-btn-sm ghost" style={{ height: 34 }}>
                Ver todos <ArrowRight size={15} />
              </Link>
            </div>
          </div>
          <div>
            {processar.length === 0 ? (
              <div className="pn-empty">Nenhum pedido aguardando ação. 🎉</div>
            ) : (
              processar.map((p) => (
                <Link key={p.numero} to={`/painel/pedidos/${p.numero}`} className="pn-list-row" style={{ padding: "12px 22px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--pn-text)" }}>{p.numero}</span>
                      <span className={`pn-chip st-${p.status}`}>{STATUS_LABEL[p.status] ?? p.status}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--pn-text-2)",
                        marginTop: 3,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.cliente} · {p.itens_count} {p.itens_count > 1 ? "itens" : "item"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="pn-tnum" style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {formatBRL(p.total)}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--pn-text-muted)", marginTop: 2 }}>{fmtData(p.data)}</div>
                  </div>
                  <ChevronRight size={16} color="var(--pn-text-muted)" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Estoque crítico · Financeiro · Top produtos (prévia) */}
      <div className="pn-dash-grid-3" style={{ marginTop: 18 }}>
        {/* Estoque crítico */}
        <div className="pn-card">
          <div className="pn-section-head">
            <div>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Estoque crítico <Preview />
              </h3>
              <p>Abaixo do mínimo</p>
            </div>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "var(--pn-error-soft)",
                color: "var(--pn-error)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <AlertTriangle size={16} />
            </span>
          </div>
          {AMOSTRA_ESTOQUE.map((e, i) => {
            const ratio = e.atual / e.minimo;
            return (
              <div key={i} style={{ padding: "11px 0", borderTop: i ? "1px solid var(--pn-divider)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                    }}
                  >
                    {e.nome}
                  </span>
                  <span
                    className="pn-tnum"
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: ratio < 0.34 ? "var(--pn-error)" : "var(--pn-warning)",
                    }}
                  >
                    {e.atual}
                    <span style={{ color: "var(--pn-text-muted)", fontWeight: 500 }}>/{e.minimo}</span>
                  </span>
                </div>
                <div className="pn-bar">
                  <span style={{ width: `${Math.max(ratio * 100, 6)}%`, background: ratio < 0.34 ? "var(--pn-error)" : "var(--pn-warning)" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Financeiro */}
        <div className="pn-card">
          <div className="pn-section-head">
            <div>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Financeiro
              </h3>
              <p>Pagar vs. Receber (pendente)</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Donut pagar={financeiro.pagar} receber={financeiro.receber} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: "var(--pn-success)" }} />
                  <span style={{ fontSize: 12.5, color: "var(--pn-text-2)" }}>A receber</span>
                </div>
                <div className="pn-tnum" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                  {formatBRL(financeiro.receber)}
                </div>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: "var(--pn-warning)" }} />
                  <span style={{ fontSize: 12.5, color: "var(--pn-text-2)" }}>A pagar</span>
                </div>
                <div className="pn-tnum" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                  {formatBRL(financeiro.pagar)}
                </div>
              </div>
            </div>
          </div>
          {financeiro.abaixoMinimo > 0 ? (
            <Link to="/painel/estoque?abaixo_minimo=1" className="pn-mini-alert err" style={{ marginTop: 16, textDecoration: "none" }}>
              <AlertTriangle size={16} />
              {financeiro.abaixoMinimo} item(ns) abaixo do estoque mínimo
            </Link>
          ) : null}
        </div>

        {/* Top produtos */}
        <div className="pn-card" style={{ padding: 0 }}>
          <div style={{ padding: "20px 22px 6px" }}>
            <div className="pn-section-head" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Top produtos
                </h3>
                <p>Por receita nos últimos 30 dias</p>
              </div>
            </div>
          </div>
          <div style={{ padding: "4px 10px 14px" }}>
            {topProdutos.length === 0 ? (
              <div className="pn-empty" style={{ padding: 16 }}>Sem vendas no período.</div>
            ) : (
              topProdutos.map((p, i) => (
                <div key={i} className="pn-list-row" style={{ padding: "10px 12px", borderTop: i ? "1px solid var(--pn-divider)" : "none" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--pn-text-muted)", width: 16 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.produto}</div>
                    <div style={{ fontSize: 11.5, color: "var(--pn-text-muted)", marginTop: 2 }}>{p.quantidade} un.</div>
                  </div>
                  <span className="pn-tnum" style={{ fontSize: 13, fontWeight: 600 }}>
                    {formatBRL(p.total)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Atividade recente (prévia) + atalhos */}
      <div className="pn-dash-grid" style={{ marginTop: 18 }}>
        <div className="pn-card">
          <div className="pn-section-head">
            <div>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Atividade recente <Preview />
              </h3>
            </div>
          </div>
          <ul className="pn-timeline">
            {AMOSTRA_ATIVIDADE.map((a, i) => {
              const I = a.icon;
              return (
                <li key={i}>
                  <div className="ev-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <I size={14} color="var(--pn-accent)" />
                    {a.texto}
                  </div>
                  <div className="ev-meta">{a.quando}</div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="pn-card">
          <h2>Atalhos</h2>
          <p className="card-sub">Acesse rapidamente as áreas de gestão.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link to="/painel/pedidos?status=pago" className="pn-shortcut">
              <span className="ic">
                <ShoppingBag size={18} />
              </span>
              <span className="lbl">
                <strong>Pedidos a separar</strong>
                <span>Prepare e despache os pagos</span>
              </span>
              <ArrowRight size={16} color="var(--pn-text-muted)" />
            </Link>
            <Link to="/painel/catalogo" className="pn-shortcut">
              <span className="ic">
                <Box size={18} />
              </span>
              <span className="lbl">
                <strong>Catálogo</strong>
                <span>Produtos, fotos e estoque</span>
              </span>
              <ArrowRight size={16} color="var(--pn-text-muted)" />
            </Link>
            <Link to="/painel/cupons" className="pn-shortcut">
              <span className="ic">
                <CircleDollarSign size={18} />
              </span>
              <span className="lbl">
                <strong>Cupons</strong>
                <span>Descontos e promoções</span>
              </span>
              <ArrowRight size={16} color="var(--pn-text-muted)" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
