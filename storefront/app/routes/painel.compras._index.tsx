import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Filter, Lightbulb, Plus, Truck } from "lucide-react";
import { EmptyState } from "~/components/painel/EmptyState";
import { KpiStrip } from "~/components/painel/KpiStrip";
import { StatusBadge } from "~/components/painel/StatusBadge";
import type { StatusTone } from "~/components/painel/StatusBadge";
import { useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import type { CompraStatus } from "~/lib/painel.server";
import { painel } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";

export const meta: MetaFunction = () => [{ title: "Pedidos de Compra — Painel Shopets" }];

export const STATUS_LABEL: Record<CompraStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  parcialmente_recebido: "Parcial",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

export const STATUS_TONE: Record<CompraStatus, StatusTone> = {
  rascunho: "muted",
  enviado: "info",
  parcialmente_recebido: "warn",
  recebido: "ok",
  cancelado: "danger",
};

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);

  const lista = await painel.compras.list(token, {
    status: url.searchParams.get("status") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined,
  });

  return json({ pedidos: lista.data, meta: lista.meta });
}

export default function ComprasIndex() {
  const { pedidos, meta } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  useFlashFeedback();

  const abertos = pedidos.filter((p) => p.status === "enviado" || p.status === "parcialmente_recebido").length;
  const totalAberto = pedidos
    .filter((p) => p.status !== "cancelado" && p.status !== "recebido")
    .reduce((s, p) => s + Number(p.total), 0);

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Operação</span>
          <h1>Pedidos de Compra</h1>
          <p>{meta.total} pedido(s) de compra.</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/compras/sugestao-reposicao" className="pn-btn-sm">
            <Lightbulb size={14} /> Sugestão de reposição
          </Link>
          <Link to="/painel/compras/novo" className="pn-btn-sm mint">
            <Plus size={14} /> Novo pedido
          </Link>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "Pedidos", value: meta.total, tone: "info" },
          { label: "Em aberto", value: abertos, tone: abertos > 0 ? "warn" : "muted" },
          { label: "Valor em aberto", value: formatBRL(totalAberto), tone: "info" },
        ]}
      />

      <div className="pn-card pn-filters">
        <Form method="get" className="filters-row">
          <input name="q" defaultValue={searchParams.get("q") ?? ""} placeholder="Número do pedido" />
          <select name="status" defaultValue={searchParams.get("status") ?? ""}>
            <option value="">Todos os status</option>
            <option value="rascunho">Rascunho</option>
            <option value="enviado">Enviado</option>
            <option value="parcialmente_recebido">Parcialmente recebido</option>
            <option value="recebido">Recebido</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <button className="pn-btn-sm mint">
            <Filter size={14} /> Filtrar
          </button>
        </Form>
      </div>

      <div className="pn-card pn-table-wrap">
        {pedidos.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Nenhum pedido de compra"
            description="Crie um pedido para reabastecer o estoque."
            cta={
              <Link to="/painel/compras/novo" className="pn-btn-sm mint">
                <Plus size={14} /> Novo pedido
              </Link>
            }
          />
        ) : (
          <table className="pn-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Fornecedor</th>
                <th>Depósito</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.numero}</strong>
                    <span className="pn-list-meta">{new Date(p.created_at).toLocaleDateString("pt-BR")}</span>
                  </td>
                  <td>{p.fornecedor?.nome ?? "—"}</td>
                  <td>{p.deposito?.nome ?? "—"}</td>
                  <td>{p.itens_count ?? 0}</td>
                  <td>{formatBRL(Number(p.total))}</td>
                  <td>
                    <StatusBadge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</StatusBadge>
                  </td>
                  <td className="pn-row-actions">
                    <Link to={`/painel/compras/${p.id}`} className="pn-btn-link">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
