import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { User, MapPin, Package, LogOut } from "lucide-react";
import { requireToken, getCliente } from "~/lib/session.server";
import contaStyles from "~/styles/conta.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: contaStyles }];

export const meta: MetaFunction = () => [{ title: "Minha conta — Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  await requireToken(request);
  const cliente = await getCliente(request);
  return json({ cliente });
}

export default function ContaIndex() {
  const { cliente } = useLoaderData<typeof loader>();
  const primeiroNome = cliente?.nome?.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="ct-wrap">
      <div className="ct-toolbar">
        <div className="ct-head" style={{ marginBottom: 0 }}>
          <h1>Olá, {primeiroNome}</h1>
          <p>Bem-vindo(a) à sua área de cliente.</p>
        </div>
        <Form method="post" action="/logout">
          <button type="submit" className="ct-btn ct-btn--ghost">
            <LogOut size={16} /> Sair
          </button>
        </Form>
      </div>

      <div className="ct-grid">
        <Link to="/conta/perfil" className="ct-tile">
          <span className="ic"><User /></span>
          <h3>Meus dados</h3>
          <p>Veja e gerencie suas informações de cadastro.</p>
        </Link>

        <Link to="/conta/enderecos" className="ct-tile">
          <span className="ic"><MapPin /></span>
          <h3>Endereços</h3>
          <p>Adicione ou edite seus endereços de entrega e cobrança.</p>
        </Link>

        <Link to="/conta/pedidos" className="ct-tile">
          <span className="ic"><Package /></span>
          <h3>Meus pedidos</h3>
          <p>Acompanhe o histórico das suas compras.</p>
          <span className="soon">Em breve</span>
        </Link>
      </div>
    </div>
  );
}
