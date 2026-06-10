import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Configurações — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const res = await painel.configuracoes.show(token);
  return json({ config: res.data });
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const form = await request.formData();

  const num = (k: string) => {
    const v = form.get(k);
    return v == null || v === "" ? null : Number(v);
  };
  const str = (k: string) => {
    const v = form.get(k);
    return v == null || v === "" ? null : String(v);
  };

  try {
    await painel.configuracoes.update(token, {
      nome_empresa: str("nome_empresa"),
      cnpj: str("cnpj"),
      endereco: str("endereco"),
      telefone: str("telefone"),
      email: str("email"),
      taxa_entrega: num("taxa_entrega") ?? 0,
      valor_minimo_entrega: num("valor_minimo_entrega") ?? 0,
    });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof PainelValidationError) {
      return json({ errors: err.errors, message: err.message }, { status: 422 });
    }
    throw err;
  }
}

export default function Configuracoes() {
  const { config } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const saving = nav.state === "submitting";
  const errors = actionData && "errors" in actionData ? actionData.errors : {};
  const message = actionData && "message" in actionData ? actionData.message : undefined;
  const [tab, setTab] = useState<"loja" | "integracoes" | "cupons" | "banners">("loja");

  const err = (k: string) => (errors[k] ? <span className="err">{errors[k][0]}</span> : null);

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Loja</span>
          <h1>Configurações</h1>
          <p>Dados da loja e integrações.</p>
        </div>
      </div>

      <div className="pn-tabs">
        <button type="button" className={tab === "loja" ? "active" : ""} onClick={() => setTab("loja")}>
          Loja
        </button>
        <button type="button" className={tab === "integracoes" ? "active" : ""} onClick={() => setTab("integracoes")}>
          Pagamento / Frete
        </button>
        <button type="button" className={tab === "cupons" ? "active" : ""} onClick={() => setTab("cupons")}>
          Cupons
        </button>
        <button type="button" className={tab === "banners" ? "active" : ""} onClick={() => setTab("banners")}>
          Banners
        </button>
      </div>

      {tab === "loja" && (
        <>
          {actionData && "ok" in actionData && actionData.ok && (
            <div className="ct-alert ct-alert--ok" role="status" style={{ marginBottom: 18 }}>
              Configurações salvas.
            </div>
          )}
          {message && (
            <div className="ct-alert ct-alert--err" role="alert" style={{ marginBottom: 18 }}>
              {message}
            </div>
          )}

          <Form method="post">
            <div className="pn-card">
              <h2>Dados da loja</h2>
              <div className="ct-field">
                <label htmlFor="nome_empresa">Nome da empresa</label>
                <input id="nome_empresa" name="nome_empresa" defaultValue={config.loja.nome_empresa ?? ""} />
                {err("nome_empresa")}
              </div>
              <div className="ct-row">
                <div className="ct-field">
                  <label htmlFor="cnpj">CNPJ</label>
                  <input id="cnpj" name="cnpj" defaultValue={config.loja.cnpj ?? ""} />
                  {err("cnpj")}
                </div>
                <div className="ct-field">
                  <label htmlFor="telefone">Telefone</label>
                  <input id="telefone" name="telefone" defaultValue={config.loja.telefone ?? ""} />
                  {err("telefone")}
                </div>
              </div>
              <div className="ct-field">
                <label htmlFor="email">E-mail</label>
                <input id="email" name="email" type="email" defaultValue={config.loja.email ?? ""} />
                {err("email")}
              </div>
              <div className="ct-field">
                <label htmlFor="endereco">Endereço</label>
                <input id="endereco" name="endereco" defaultValue={config.loja.endereco ?? ""} />
                {err("endereco")}
              </div>
            </div>

            <div className="pn-card">
              <h2>Entrega</h2>
              <div className="ct-row">
                <div className="ct-field">
                  <label htmlFor="taxa_entrega">Taxa de entrega (R$)</label>
                  <input
                    id="taxa_entrega"
                    name="taxa_entrega"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={config.loja.taxa_entrega}
                  />
                  {err("taxa_entrega")}
                </div>
                <div className="ct-field">
                  <label htmlFor="valor_minimo_entrega">Valor mínimo p/ entrega (R$)</label>
                  <input
                    id="valor_minimo_entrega"
                    name="valor_minimo_entrega"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={config.loja.valor_minimo_entrega}
                  />
                  {err("valor_minimo_entrega")}
                </div>
              </div>
            </div>

            <div className="pn-actions-bar" style={{ marginTop: 18 }}>
              <button type="submit" className="pn-btn-sm mint" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </Form>
        </>
      )}

      {tab === "integracoes" && (
        <div className="pn-card">
          <h2>Integrações (somente leitura)</h2>
          <p className="card-sub">Configuradas no servidor. Alterações via suporte.</p>
          <dl className="pn-dl">
            <dt>Gateway de pagamento</dt>
            <dd>{config.integracoes.payment_driver ?? "—"}</dd>
            <dt>Cálculo de frete</dt>
            <dd>{config.integracoes.shipping_driver ?? "—"}</dd>
          </dl>
        </div>
      )}

      {tab === "cupons" && (
        <div className="pn-soon">
          <span className="badge">Em breve</span>
          <div>Cupons de desconto chegam na Sprint 6.</div>
        </div>
      )}

      {tab === "banners" && (
        <div className="pn-soon">
          <span className="badge">Em breve</span>
          <div>Gestão de banners da vitrine chega na Sprint 6.</div>
        </div>
      )}
    </div>
  );
}
