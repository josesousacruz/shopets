import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
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

  // Só inclui no payload os campos presentes na aba submetida (evita sobrescrever
  // SEO/Fiscal ao salvar a aba Loja e vice-versa).
  const payload: Record<string, string | number | null> = {};
  const addStr = (k: string) => {
    if (form.has(k)) {
      const v = form.get(k);
      payload[k] = v == null || v === "" ? null : String(v);
    }
  };
  const addNum = (k: string, fallback = 0) => {
    if (form.has(k)) {
      const v = form.get(k);
      payload[k] = v == null || v === "" ? fallback : Number(v);
    }
  };

  ["nome_empresa", "cnpj", "endereco", "telefone", "email", "seo_titulo", "seo_descricao", "og_image_path", "csc_nfce", "csc_id_nfce"].forEach(addStr);
  ["taxa_entrega", "valor_minimo_entrega", "ambiente_nfce"].forEach((k) => addNum(k));

  try {
    await painel.configuracoes.update(token, payload);
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
  const [tab, setTab] = useState<"loja" | "seo" | "fiscal" | "integracoes" | "cupons" | "banners">("loja");

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
        <button type="button" className={tab === "seo" ? "active" : ""} onClick={() => setTab("seo")}>
          SEO
        </button>
        <button type="button" className={tab === "fiscal" ? "active" : ""} onClick={() => setTab("fiscal")}>
          Fiscal
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

      {tab === "seo" && (
        <Form method="post">
          <div className="pn-card">
            <h2>SEO da loja</h2>
            <p className="card-sub">Como a loja aparece no Google e ao compartilhar links.</p>
            <div className="ct-field">
              <label htmlFor="seo_titulo">Título (meta title)</label>
              <input id="seo_titulo" name="seo_titulo" maxLength={70} defaultValue={config.seo?.seo_titulo ?? ""} />
              {err("seo_titulo")}
            </div>
            <div className="ct-field">
              <label htmlFor="seo_descricao">Descrição (meta description)</label>
              <textarea id="seo_descricao" name="seo_descricao" maxLength={200} rows={3} defaultValue={config.seo?.seo_descricao ?? ""} />
              {err("seo_descricao")}
            </div>
            <div className="ct-field">
              <label htmlFor="og_image_path">Imagem de compartilhamento (URL/caminho)</label>
              <input id="og_image_path" name="og_image_path" defaultValue={config.seo?.og_image_path ?? ""} />
              {err("og_image_path")}
            </div>
            <div className="pn-actions-bar" style={{ marginTop: 18 }}>
              <button type="submit" className="pn-btn-sm mint" disabled={saving}>{saving ? "Salvando…" : "Salvar SEO"}</button>
            </div>
          </div>
        </Form>
      )}

      {tab === "fiscal" && (
        <Form method="post">
          <div className="pn-card">
            <h2>Fiscal — NFC-e</h2>
            <p className="card-sub">
              Ambiente de homologação para testes. Emissão em produção exige certificado A1 válido configurado pelo suporte.
            </p>
            <div className="ct-field">
              <label htmlFor="ambiente_nfce">Ambiente</label>
              <select id="ambiente_nfce" name="ambiente_nfce" defaultValue={String(config.fiscal?.ambiente_nfce ?? 2)}>
                <option value="2">Homologação (testes)</option>
                <option value="1">Produção</option>
              </select>
              {err("ambiente_nfce")}
            </div>
            <div className="pn-field-row">
              <div className="ct-field">
                <label htmlFor="csc_nfce">CSC (código de segurança)</label>
                <input id="csc_nfce" name="csc_nfce" defaultValue={config.fiscal?.csc_nfce ?? ""} />
                {err("csc_nfce")}
              </div>
              <div className="ct-field">
                <label htmlFor="csc_id_nfce">ID do CSC</label>
                <input id="csc_id_nfce" name="csc_id_nfce" defaultValue={config.fiscal?.csc_id_nfce ?? ""} />
                {err("csc_id_nfce")}
              </div>
            </div>
            <p className="card-sub">
              Certificado digital: {config.fiscal?.certificado_definido ? "✓ configurado" : "não configurado"} (upload do .pfx via suporte).
            </p>
            <div className="pn-actions-bar" style={{ marginTop: 18 }}>
              <button type="submit" className="pn-btn-sm mint" disabled={saving}>{saving ? "Salvando…" : "Salvar fiscal"}</button>
            </div>
          </div>
        </Form>
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
        <div className="pn-card">
          <h2>Cupons de desconto</h2>
          <p className="card-sub">Crie e gerencie cupons percentuais, de valor fixo ou frete grátis.</p>
          <div style={{ marginTop: 14 }}>
            <Link to="/painel/cupons" className="pn-btn-sm mint" style={{ display: "inline-flex", width: "auto" }}>
              Gerenciar cupons
            </Link>
          </div>
        </div>
      )}

      {tab === "banners" && (
        <div className="pn-card">
          <h2>Banners da vitrine</h2>
          <p className="card-sub">Gerencie os banners exibidos na home, com ordem e vigência.</p>
          <div style={{ marginTop: 14 }}>
            <Link to="/painel/banners" className="pn-btn-sm mint" style={{ display: "inline-flex", width: "auto" }}>
              Gerenciar banners
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
