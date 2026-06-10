import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { ChevronRight, Package } from "lucide-react";
import { requireToken } from "~/lib/session.server";
import { listarPedidos } from "~/lib/cart.server";
import { formatBRL } from "~/lib/format";
import { STATUS_LABEL } from "~/lib/pedido";
import type { Pedido } from "~/types/api";
import contaStyles from "~/styles/conta.css?url";
import checkoutStyles from "~/styles/checkout.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: contaStyles },
  { rel: "stylesheet", href: checkoutStyles },
];

export const meta: MetaFunction = () => [{ title: "Meus pedidos — Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  let pedidos: Pedido[] = [];
  try {
    const r = await listarPedidos(token);
    pedidos = r.data;
  } catch {
    pedidos = [];
  }
  return json({ pedidos });
}

function formatData(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(iso),
    );
  } catch {
    return "";
  }
}

export default function ContaPedidos() {
  const { pedidos } = useLoaderData<typeof loader>();

  return (
    <div className="ct-wrap">
      <div className="ct-head">
        <h1>Meus pedidos</h1>
        <p>Acompanhe o histórico das suas compras.</p>
      </div>

      {pedidos.length === 0 ? (
        <div className="ct-empty">
          Você ainda não fez nenhum pedido.
          <div style={{ marginTop: 16 }}>
            <Link to="/loja" className="ct-btn ct-btn--mint" style={{ width: "auto" }}>
              Ver a loja
            </Link>
          </div>
        </div>
      ) : (
        <div className="co-orders">
          {pedidos.map((p) => {
            const qtdItens = p.itens?.reduce((s, i) => s + i.quantidade, 0) ?? null;
            return (
              <Link to={`/conta/pedidos/${encodeURIComponent(p.numero)}`} className="co-order" key={p.numero}>
                <div className="meta">
                  <div className="num">
                    <Package size={15} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--mint-deep)" }} />
                    {p.numero}
                  </div>
                  {p.criado_em && <div className="date">{formatData(p.criado_em)}</div>}
                  {qtdItens != null && (
                    <div className="items">
                      {qtdItens} {qtdItens === 1 ? "item" : "itens"} ·{" "}
                      {p.modalidade === "retirada" ? "Retirada" : "Entrega"}
                    </div>
                  )}
                </div>
                <div className="end">
                  <span className={`co-status s-${p.status}`}>
                    <span className="d" /> {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  <span className="val">{formatBRL(p.total)}</span>
                  <ChevronRight className="arrow" size={18} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="ct-links" style={{ marginTop: 28 }}>
        <Link to="/conta">Voltar para a conta</Link>
      </div>
    </div>
  );
}
