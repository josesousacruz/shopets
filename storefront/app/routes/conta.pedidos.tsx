import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { requireToken } from "~/lib/session.server";
import contaStyles from "~/styles/conta.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: contaStyles }];

export const meta: MetaFunction = () => [{ title: "Meus pedidos — Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  await requireToken(request);
  return null;
}

export default function ContaPedidos() {
  return (
    <div className="ct-wrap">
      <div className="ct-head">
        <h1>Meus pedidos</h1>
        <p>Acompanhe o histórico das suas compras.</p>
      </div>
      <div className="ct-empty">
        Em breve você poderá acompanhar seus pedidos por aqui.
        <div style={{ marginTop: 16 }}>
          <Link to="/conta" className="ct-btn ct-btn--ghost">Voltar para a conta</Link>
        </div>
      </div>
    </div>
  );
}
