import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { ShoppingBag, Clock, PackageCheck, Truck, TrendingUp } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";

export const meta: MetaFunction = () => [{ title: "Dashboard — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);

  // KPIs simples a partir das listas por status (1ª página/meta.total de cada).
  const [todos, aguardando, separacao, enviado] = await Promise.all([
    painel.pedidos.list(token, {}),
    painel.pedidos.list(token, { status: "aguardando_pagamento" }),
    painel.pedidos.list(token, { status: "em_separacao" }),
    painel.pedidos.list(token, { status: "enviado" }),
  ]);

  // Faturamento dos pedidos pagos (todas as páginas) e contagem.
  let faturamento = 0;
  let pagosCount = 0;
  let page = 1;
  let lastPage = 1;
  do {
    const res = await painel.pedidos.list(token, { status: "pago", page });
    pagosCount = res.meta.total;
    lastPage = res.meta.last_page;
    for (const p of res.data) faturamento += p.total;
    page += 1;
  } while (page <= lastPage && page <= 25); // teto de segurança

  return json({
    kpis: {
      total: todos.meta.total,
      aguardando: aguardando.meta.total,
      pagos: pagosCount,
      em_separacao: separacao.meta.total,
      enviado: enviado.meta.total,
      faturamento,
    },
  });
}

export default function PainelDashboard() {
  const { kpis } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Visão geral</span>
          <h1>Dashboard</h1>
          <p>Acompanhe o desempenho e os pedidos da loja.</p>
        </div>
        <Link to="/painel/pedidos" className="pn-btn-sm ink">
          Ver pedidos
        </Link>
      </div>

      <div className="pn-kpis">
        <div className="pn-kpi">
          <span className="ic"><ShoppingBag /></span>
          <div className="kpi-text">
            <div className="label">Pedidos (total)</div>
            <div className="value">{kpis.total}</div>
          </div>
        </div>
        <div className="pn-kpi">
          <span className="ic"><Clock /></span>
          <div className="kpi-text">
            <div className="label">Aguardando pagamento</div>
            <div className="value">{kpis.aguardando}</div>
          </div>
        </div>
        <div className="pn-kpi">
          <span className="ic"><PackageCheck /></span>
          <div className="kpi-text">
            <div className="label">Pagos / preparando</div>
            <div className="value">{kpis.pagos + kpis.em_separacao}</div>
          </div>
        </div>
        <div className="pn-kpi">
          <span className="ic"><Truck /></span>
          <div className="kpi-text">
            <div className="label">Enviados</div>
            <div className="value">{kpis.enviado}</div>
          </div>
        </div>
        <div className="pn-kpi accent">
          <span className="ic"><TrendingUp /></span>
          <div className="kpi-text">
            <div className="label">Faturamento (pagos)</div>
            <div className="value">{formatBRL(kpis.faturamento)}</div>
          </div>
        </div>
      </div>

      <div className="pn-card">
        <h2>Atalhos</h2>
        <p className="card-sub">Acesse as áreas de gestão.</p>
        <div className="pn-actions-bar">
          <Link to="/painel/pedidos?status=pago" className="pn-btn-sm mint">
            Pedidos a separar
          </Link>
          <Link to="/painel/catalogo/novo" className="pn-btn-sm ghost">
            Novo produto
          </Link>
          <Link to="/painel/catalogo" className="pn-btn-sm ghost">
            Catálogo
          </Link>
          <Link to="/painel/configuracoes" className="pn-btn-sm ghost">
            Configurações
          </Link>
        </div>
      </div>
    </div>
  );
}
