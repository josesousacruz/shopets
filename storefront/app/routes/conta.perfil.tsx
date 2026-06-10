import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { requireToken, getCliente } from "~/lib/session.server";
import contaStyles from "~/styles/conta.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: contaStyles }];

export const meta: MetaFunction = () => [{ title: "Meus dados — Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  await requireToken(request);
  const cliente = await getCliente(request);
  return json({ cliente });
}

export default function ContaPerfil() {
  const { cliente } = useLoaderData<typeof loader>();

  return (
    <div className="ct-wrap" style={{ maxWidth: 640 }}>
      <div className="ct-head">
        <h1>Meus dados</h1>
        <p>Suas informações de cadastro.</p>
      </div>

      <div className="ct-card">
        <div className="ct-alert ct-alert--ok" style={{ marginTop: 0 }} role="status">
          A edição de dados estará disponível em breve.
        </div>

        <div className="ct-field">
          <label htmlFor="nome">Nome</label>
          <input id="nome" type="text" value={cliente?.nome ?? ""} readOnly />
        </div>

        <div className="ct-field">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" value={cliente?.email ?? ""} readOnly />
        </div>

        <div className="ct-field">
          <label htmlFor="telefone">Telefone</label>
          <input id="telefone" type="text" value={cliente?.telefone ?? "Não informado"} readOnly />
        </div>

        <div className="ct-field--inline">
          <input id="aceita_marketing" type="checkbox" checked={!!cliente?.aceita_marketing} disabled readOnly />
          <label htmlFor="aceita_marketing">Recebe ofertas e novidades por e-mail</label>
        </div>

        <div className="ct-links">
          <Link to="/conta">Voltar para a conta</Link>
        </div>
      </div>
    </div>
  );
}
