import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Configurações — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const [res, meStatus] = await Promise.all([
    painel.configuracoes.show(token),
    painel.integracoes.melhorEnvio.status(token).catch(() => ({ data: { conectado: false } })),
  ]);
  return json({ config: res.data, melhorEnvioConectado: meStatus.data.conectado });
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const form = await request.formData();

  // Integração Melhor Envio (OAuth2): connect gera a URL e redireciona o browser
  // para o consentimento; disconnect revoga os tokens da loja.
  const intent = form.get("_intent");
  if (intent === "melhor-envio-connect") {
    try {
      const res = await painel.integracoes.melhorEnvio.connect(token);
      return redirect(res.data.url);
    } catch (err) {
      // Ex.: app não registrado no ME (client_id/secret/redirect ausentes no .env
      // do servidor) — mostra a instrução na aba em vez de redirecionar pra um
      // erro OAuth críptico.
      if (err instanceof PainelValidationError) {
        return json({ errors: err.errors, message: err.message }, { status: 422 });
      }
      throw err;
    }
  }
  if (intent === "melhor-envio-disconnect") {
    await painel.integracoes.melhorEnvio.disconnect(token);
    return redirect("/painel/configuracoes?melhor_envio=desconectado");
  }
  if (intent === "certificado-upload") {
    const arquivo = form.get("certificado");
    const senha = String(form.get("senha") ?? "");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      const errors: Record<string, string[]> = { certificado: ["Selecione o arquivo .pfx."] };
      return json({ errors }, { status: 422 });
    }
    try {
      await painel.configuracoes.uploadCertificado(token, arquivo, senha);
      return json({ ok: true, certificadoEnviado: true });
    } catch (err) {
      if (err instanceof PainelValidationError) {
        return json({ errors: err.errors, message: err.message }, { status: 422 });
      }
      throw err;
    }
  }

  // Só inclui no payload os campos presentes na aba submetida (evita sobrescrever
  // SEO/Fiscal ao salvar a aba Loja e vice-versa).
  const payload: Record<string, string | number | boolean | null> = {};
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

  [
    "nome_empresa", "cnpj", "endereco", "telefone", "email",
    "endereco_cep", "endereco_logradouro", "endereco_numero", "endereco_complemento",
    "endereco_bairro", "endereco_cidade", "endereco_uf", "endereco_codigo_ibge",
    "seo_titulo", "seo_descricao", "og_image_path", "csc_nfce", "csc_id_nfce",
    "inscricao_estadual", "regime_tributario", "nfe_serie",
    "shipping_driver",
  ].forEach(addStr);
  ["taxa_entrega", "valor_minimo_entrega", "ambiente_nfce"].forEach((k) => addNum(k));
  addNum("nfe_proximo_numero", 1);

  // Aba Loja: form dedicado (marcador abaixo) — mesmo motivo do checkbox da
  // aba Pagamento (desmarcado não manda campo nenhum no POST).
  if (form.has("loja_form")) {
    payload.caixa_modo_sessao = form.get("caixa_modo_sessao") === "1";
  }

  // Aba Pagamento: só a config do gateway SELECIONADO é renderizada, e cada seção
  // traz um marcador próprio — um checkbox desmarcado não manda campo nenhum no
  // POST, e uma seção oculta não pode sobrescrever o que já está salvo.
  if (form.has("payment_form")) {
    addStr("payment_driver");
  }
  if (form.has("yapay_form")) {
    // Campo write-only: só manda se preenchido — em branco mantém o token já
    // salvo (a tela nunca mostra o valor atual, só se está "configurado").
    const tokenYapay = form.get("yapay_token_account");
    if (tokenYapay) payload.yapay_token_account = String(tokenYapay);
    payload.yapay_sandbox = form.get("yapay_sandbox") === "1";
  }
  if (form.has("mercadopago_form")) {
    const tokenMp = form.get("mercadopago_access_token");
    if (tokenMp) payload.mercadopago_access_token = String(tokenMp);
    payload.mercadopago_sandbox = form.get("mercadopago_sandbox") === "1";
    const whMp = form.get("mercadopago_webhook_secret");
    if (whMp) payload.mercadopago_webhook_secret = String(whMp);
  }

  // Aba Frete: o ambiente do Melhor Envio vem de um toggle segmentado (hidden
  // input sempre com valor explícito "1"/"0" quando a seção ME está visível) e
  // só o par de credenciais do ambiente ativo é renderizado — os helpers só
  // tocam no que veio no POST.
  if (form.has("melhor_envio_sandbox")) {
    payload.melhor_envio_sandbox = form.get("melhor_envio_sandbox") === "1";
  }
  ["melhor_envio_sandbox_client_id", "melhor_envio_prod_client_id"].forEach(addStr);
  for (const k of ["melhor_envio_sandbox_client_secret", "melhor_envio_prod_client_secret"]) {
    // Secrets write-only: só mandam se preenchidos (em branco mantém o salvo).
    const v = form.get(k);
    if (v) payload[k] = String(v);
  }

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
  const { config, melhorEnvioConectado } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const saving = nav.state === "submitting";
  const errors = actionData && "errors" in actionData ? actionData.errors : {};
  const message = actionData && "message" in actionData ? (actionData.message as string | undefined) : undefined;
  const [searchParams] = useSearchParams();
  const meRetorno = searchParams.get("melhor_envio");
  // Volta do OAuth do Melhor Envio → abre a aba de frete direto.
  const [tab, setTab] = useState<"loja" | "seo" | "fiscal" | "pagamento" | "frete" | "cupons" | "banners">(
    meRetorno ? "frete" : "loja",
  );
  // Só a config do gateway/driver selecionado aparece; ambiente ME é um toggle
  // segmentado que mostra apenas o par de credenciais do ambiente escolhido.
  const [payDriver, setPayDriver] = useState(config.integracoes.payment_driver ?? "fake");
  const [freteDriver, setFreteDriver] = useState(config.integracoes.shipping_driver ?? "stub");
  const [meSandbox, setMeSandbox] = useState(config.integracoes.melhor_envio_sandbox);
  const [yapaySandbox, setYapaySandbox] = useState(config.integracoes.yapay_sandbox);
  const [mpSandbox, setMpSandbox] = useState(config.integracoes.mercadopago_sandbox);

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
        <button type="button" className={tab === "pagamento" ? "active" : ""} onClick={() => setTab("pagamento")}>
          Pagamento
        </button>
        <button type="button" className={tab === "frete" ? "active" : ""} onClick={() => setTab("frete")}>
          Frete
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
            <input type="hidden" name="loja_form" value="1" />
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
                <label htmlFor="endereco">Endereço (linha única, exibido no rodapé)</label>
                <input id="endereco" name="endereco" defaultValue={config.loja.endereco ?? ""} />
                {err("endereco")}
              </div>
            </div>

            <div className="pn-card">
              <h2>Endereço estruturado</h2>
              <p className="card-sub">
                Usado pra comprar etiqueta real (Melhor Envio) e emitir nota fiscal — precisa
                estar preenchido antes de ativar essas integrações.
              </p>
              <div className="ct-row" style={{ gridTemplateColumns: "1fr 2fr" }}>
                <div className="ct-field">
                  <label htmlFor="endereco_cep">CEP</label>
                  <input id="endereco_cep" name="endereco_cep" maxLength={9} defaultValue={config.loja.endereco_cep ?? ""} />
                  {err("endereco_cep")}
                </div>
                <div className="ct-field">
                  <label htmlFor="endereco_logradouro">Logradouro</label>
                  <input id="endereco_logradouro" name="endereco_logradouro" defaultValue={config.loja.endereco_logradouro ?? ""} />
                  {err("endereco_logradouro")}
                </div>
              </div>
              <div className="ct-row">
                <div className="ct-field">
                  <label htmlFor="endereco_numero">Número</label>
                  <input id="endereco_numero" name="endereco_numero" defaultValue={config.loja.endereco_numero ?? ""} />
                  {err("endereco_numero")}
                </div>
                <div className="ct-field">
                  <label htmlFor="endereco_complemento">Complemento</label>
                  <input id="endereco_complemento" name="endereco_complemento" defaultValue={config.loja.endereco_complemento ?? ""} />
                  {err("endereco_complemento")}
                </div>
              </div>
              <div className="ct-field">
                <label htmlFor="endereco_bairro">Bairro</label>
                <input id="endereco_bairro" name="endereco_bairro" defaultValue={config.loja.endereco_bairro ?? ""} />
                {err("endereco_bairro")}
              </div>
              <div className="ct-row" style={{ gridTemplateColumns: "1fr 90px 1fr" }}>
                <div className="ct-field">
                  <label htmlFor="endereco_cidade">Cidade</label>
                  <input id="endereco_cidade" name="endereco_cidade" defaultValue={config.loja.endereco_cidade ?? ""} />
                  {err("endereco_cidade")}
                </div>
                <div className="ct-field">
                  <label htmlFor="endereco_uf">UF</label>
                  <input id="endereco_uf" name="endereco_uf" maxLength={2} defaultValue={config.loja.endereco_uf ?? ""} />
                  {err("endereco_uf")}
                </div>
                <div className="ct-field">
                  <label htmlFor="endereco_codigo_ibge">Código IBGE do município</label>
                  <input
                    id="endereco_codigo_ibge"
                    name="endereco_codigo_ibge"
                    maxLength={7}
                    placeholder="usado na nota fiscal"
                    defaultValue={config.loja.endereco_codigo_ibge ?? ""}
                  />
                  {err("endereco_codigo_ibge")}
                </div>
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

            <div className="pn-card">
              <h2>PDV — caixa</h2>
              <p className="card-sub">
                Sessão de caixa (abrir com valor inicial, registrar sangria/suprimento, fechar
                com contagem) é opcional. Desligado, o PDV vende igual sempre vendeu — só registra
                o usuário logado em cada venda, sem exigir abertura.
              </p>
              <label className="pn-check">
                <input
                  type="checkbox"
                  name="caixa_modo_sessao"
                  value="1"
                  defaultChecked={config.loja.caixa_modo_sessao}
                />
                Exigir sessão de caixa (abrir/fechar/sangria) no PDV
              </label>
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
        <>
          {actionData && "certificadoEnviado" in actionData && actionData.certificadoEnviado && (
            <div className="ct-alert ct-alert--ok" role="status" style={{ marginBottom: 18 }}>
              Certificado enviado com sucesso.
            </div>
          )}

          <Form method="post">
            <div className="pn-card">
              <h2>Fiscal — NF-e / NFC-e</h2>
              <p className="card-sub">
                Ambiente de homologação para testes. Emissão em produção exige certificado A1 válido (aba abaixo) e o
                endereço estruturado da loja preenchido (aba Loja).
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
                  <label htmlFor="inscricao_estadual">Inscrição Estadual</label>
                  <input id="inscricao_estadual" name="inscricao_estadual" defaultValue={config.fiscal?.inscricao_estadual ?? ""} />
                  {err("inscricao_estadual")}
                </div>
                <div className="ct-field">
                  <label htmlFor="regime_tributario">Regime tributário</label>
                  <select id="regime_tributario" name="regime_tributario" defaultValue={config.fiscal?.regime_tributario ?? "1"}>
                    <option value="1">Simples Nacional</option>
                    <option value="2">Simples Nacional — excesso de sublimite</option>
                    <option value="3">Regime normal (ainda não suportado na emissão)</option>
                  </select>
                  {err("regime_tributario")}
                </div>
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
              <p className="card-sub" style={{ marginTop: 14 }}>Numeração da NF-e (modelo 55 — pedidos de entrega)</p>
              <div className="pn-field-row">
                <div className="ct-field">
                  <label htmlFor="nfe_serie">Série</label>
                  <input id="nfe_serie" name="nfe_serie" defaultValue={config.fiscal?.nfe_serie ?? "1"} />
                  {err("nfe_serie")}
                </div>
                <div className="ct-field">
                  <label htmlFor="nfe_proximo_numero">Próximo número</label>
                  <input
                    id="nfe_proximo_numero"
                    name="nfe_proximo_numero"
                    type="number"
                    min="1"
                    defaultValue={config.fiscal?.nfe_proximo_numero ?? 1}
                  />
                  {err("nfe_proximo_numero")}
                </div>
              </div>
              <p className="card-sub">
                A NFC-e usa a numeração de cada Ponto de Venda (aba Pontos de Venda → Fiscal).
              </p>
              <div className="pn-actions-bar" style={{ marginTop: 18 }}>
                <button type="submit" className="pn-btn-sm mint" disabled={saving}>{saving ? "Salvando…" : "Salvar fiscal"}</button>
              </div>
            </div>
          </Form>

          <div className="pn-card">
            <h2>Certificado digital A1</h2>
            <dl className="pn-dl">
              <dt>Status</dt>
              <dd>
                {config.fiscal?.certificado_definido
                  ? `✓ configurado${config.fiscal.certificado_validade ? ` — válido até ${new Date(config.fiscal.certificado_validade).toLocaleDateString("pt-BR")}` : ""}`
                  : "não configurado"}
              </dd>
            </dl>
            <Form method="post" encType="multipart/form-data" style={{ marginTop: 14 }}>
              <input type="hidden" name="_intent" value="certificado-upload" />
              <div className="ct-field">
                <label htmlFor="certificado">Arquivo .pfx</label>
                <input id="certificado" name="certificado" type="file" accept=".pfx,.p12" required />
                {err("certificado")}
              </div>
              <div className="ct-field">
                <label htmlFor="senha">Senha do certificado</label>
                <input id="senha" name="senha" type="password" autoComplete="off" required />
              </div>
              <div className="pn-actions-bar" style={{ marginTop: 14 }}>
                <button type="submit" className="pn-btn-sm mint" disabled={saving}>
                  {saving ? "Enviando…" : "Enviar certificado"}
                </button>
              </div>
            </Form>
          </div>
        </>
      )}

      {tab === "frete" && (
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
          {meRetorno === "conectado" && (
            <div className="ct-alert ct-alert--ok" role="status" style={{ marginBottom: 18 }}>
              Melhor Envio conectado com sucesso.
            </div>
          )}
          {meRetorno === "erro" && (
            <div className="ct-alert ct-alert--err" role="alert" style={{ marginBottom: 18 }}>
              Não foi possível conectar ao Melhor Envio. Tente novamente.
            </div>
          )}
          {meRetorno === "desconectado" && (
            <div className="ct-alert ct-alert--ok" role="status" style={{ marginBottom: 18 }}>
              Conta do Melhor Envio desconectada.
            </div>
          )}

          <div className="pn-card">
            <h2>Frete</h2>
            <p className="card-sub">
              Como o frete é calculado no checkout. Com o Melhor Envio, a mesma conta cota o
              frete e permite comprar etiqueta real nos pedidos — exige o endereço estruturado
              da loja preenchido (aba Loja) e a conta conectada abaixo.
            </p>
            <Form method="post">
              <div className="ct-field">
                <label htmlFor="shipping_driver">Cálculo de frete</label>
                <select
                  id="shipping_driver"
                  name="shipping_driver"
                  value={freteDriver}
                  onChange={(e) => setFreteDriver(e.target.value)}
                >
                  <option value="stub">Simulado (fórmula de teste)</option>
                  <option value="melhorenvio">Melhor Envio (cotação e etiqueta reais)</option>
                </select>
                {err("shipping_driver")}
              </div>

              {freteDriver === "melhorenvio" && (
                <>
                  <div className="ct-field" style={{ marginTop: 14 }}>
                    <label>Ambiente</label>
                    <div className="pn-segmented">
                      <button type="button" className={meSandbox ? "active" : ""} onClick={() => setMeSandbox(true)}>
                        Homologação (sandbox)
                      </button>
                      <button type="button" className={!meSandbox ? "active" : ""} onClick={() => setMeSandbox(false)}>
                        Produção
                      </button>
                    </div>
                  </div>
                  <input type="hidden" name="melhor_envio_sandbox" value={meSandbox ? "1" : "0"} />
                  <p className="card-sub" style={{ marginTop: 8 }}>
                    Sandbox e produção são ambientes separados do Melhor Envio, com contas e
                    aplicativos distintos. Trocar o ambiente — ou as credenciais do app do
                    ambiente ativo — desconecta a conta atual; será preciso conectar de novo.
                  </p>

                  <p className="card-sub" style={{ marginTop: 14 }}>
                    Aplicativo do Melhor Envio em{" "}
                    {meSandbox ? "sandbox.melhorenvio.com.br" : "melhorenvio.com.br"} (painel do
                    ME → Configurações → Tokens → Cadastrar aplicativo). Use esta URL de
                    redirecionamento ao cadastrar:
                  </p>
                  <div className="ct-field">
                    <label htmlFor="melhor_envio_callback_url">URL de redirecionamento (copie no cadastro do app)</label>
                    <input
                      id="melhor_envio_callback_url"
                      value={config.integracoes.melhor_envio_callback_url}
                      readOnly
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </div>

                  {meSandbox ? (
                    <div className="ct-row">
                      <div className="ct-field">
                        <label htmlFor="melhor_envio_sandbox_client_id">Client ID</label>
                        <input
                          id="melhor_envio_sandbox_client_id"
                          name="melhor_envio_sandbox_client_id"
                          defaultValue={config.integracoes.melhor_envio_sandbox_client_id ?? ""}
                          autoComplete="off"
                        />
                        {err("melhor_envio_sandbox_client_id")}
                      </div>
                      <div className="ct-field">
                        <label htmlFor="melhor_envio_sandbox_client_secret">Client Secret</label>
                        <input
                          id="melhor_envio_sandbox_client_secret"
                          name="melhor_envio_sandbox_client_secret"
                          placeholder={
                            config.integracoes.melhor_envio_sandbox_secret_configurado
                              ? "•••••••• já configurado — preencha só pra trocar"
                              : "cole o client secret do app sandbox"
                          }
                          autoComplete="off"
                        />
                        {err("melhor_envio_sandbox_client_secret")}
                      </div>
                    </div>
                  ) : (
                    <div className="ct-row">
                      <div className="ct-field">
                        <label htmlFor="melhor_envio_prod_client_id">Client ID</label>
                        <input
                          id="melhor_envio_prod_client_id"
                          name="melhor_envio_prod_client_id"
                          defaultValue={config.integracoes.melhor_envio_prod_client_id ?? ""}
                          autoComplete="off"
                        />
                        {err("melhor_envio_prod_client_id")}
                      </div>
                      <div className="ct-field">
                        <label htmlFor="melhor_envio_prod_client_secret">Client Secret</label>
                        <input
                          id="melhor_envio_prod_client_secret"
                          name="melhor_envio_prod_client_secret"
                          placeholder={
                            config.integracoes.melhor_envio_prod_secret_configurado
                              ? "•••••••• já configurado — preencha só pra trocar"
                              : "cole o client secret do app de produção"
                          }
                          autoComplete="off"
                        />
                        {err("melhor_envio_prod_client_secret")}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="pn-actions-bar" style={{ marginTop: 14 }}>
                <button type="submit" className="pn-btn-sm mint" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar frete"}
                </button>
              </div>
            </Form>

            {freteDriver === "melhorenvio" && (
              <div style={{ marginTop: 18 }}>
                <dl className="pn-dl">
                  <dt>Status</dt>
                  <dd>{melhorEnvioConectado ? "✓ Conectado" : "Não conectado"}</dd>
                </dl>
                <div className="pn-actions-bar" style={{ marginTop: 14 }}>
                  {melhorEnvioConectado ? (
                    <Form method="post">
                      <input type="hidden" name="_intent" value="melhor-envio-disconnect" />
                      <button type="submit" className="pn-btn-sm" disabled={saving}>
                        {saving ? "Processando…" : "Desconectar"}
                      </button>
                    </Form>
                  ) : (
                    <Form method="post">
                      <input type="hidden" name="_intent" value="melhor-envio-connect" />
                      <button type="submit" className="pn-btn-sm mint" disabled={saving}>
                        {saving ? "Redirecionando…" : "Conectar Melhor Envio"}
                      </button>
                    </Form>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "pagamento" && (
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

          <div className="pn-card">
            <h2>Pagamento</h2>
            <p className="card-sub">
              Gateway usado para cobrar os pedidos do site. Comece em homologação e só vá pra
              produção quando confirmar que os testes passaram de verdade.
            </p>
            <Form method="post">
              <input type="hidden" name="payment_form" value="1" />
              <div className="ct-field">
                <label htmlFor="payment_driver">Gateway ativo</label>
                <select
                  id="payment_driver"
                  name="payment_driver"
                  value={payDriver}
                  onChange={(e) => setPayDriver(e.target.value)}
                >
                  <option value="fake">Simulado (não cobra de verdade — dev/teste)</option>
                  <option value="yapay">Yapay (Pix e boleto reais)</option>
                  <option value="mercadopago">Mercado Pago (Pix real)</option>
                </select>
                {err("payment_driver")}
              </div>

              {payDriver === "fake" && (
                <p className="card-sub" style={{ marginTop: 8 }}>
                  Gateway simulado: aprova pagamentos sem cobrar de verdade. Nada a configurar.
                </p>
              )}

              {payDriver === "yapay" && (
                <>
                  <input type="hidden" name="yapay_form" value="1" />
                  <div className="ct-field" style={{ marginTop: 14 }}>
                    <label>Ambiente</label>
                    <div className="pn-segmented">
                      <button type="button" className={yapaySandbox ? "active" : ""} onClick={() => setYapaySandbox(true)}>
                        Homologação (sandbox)
                      </button>
                      <button type="button" className={!yapaySandbox ? "active" : ""} onClick={() => setYapaySandbox(false)}>
                        Produção
                      </button>
                    </div>
                  </div>
                  <input type="hidden" name="yapay_sandbox" value={yapaySandbox ? "1" : "0"} />
                  <p className="card-sub" style={{ marginTop: 8 }}>
                    Produção cobra de verdade — só mude depois de confirmar os testes em homologação.
                  </p>
                  <div className="ct-field" style={{ marginTop: 14 }}>
                    <label htmlFor="yapay_token_account">Token da conta Yapay (token_account)</label>
                    <input
                      id="yapay_token_account"
                      name="yapay_token_account"
                      placeholder={
                        config.integracoes.yapay_configurado
                          ? "•••••••• já configurado — preencha só pra trocar"
                          : "cole o token_account da sua conta Yapay"
                      }
                      autoComplete="off"
                    />
                    {err("yapay_token_account")}
                  </div>
                </>
              )}

              {payDriver === "mercadopago" && (
                <>
                  <input type="hidden" name="mercadopago_form" value="1" />
                  <div className="ct-field" style={{ marginTop: 14 }}>
                    <label>Ambiente</label>
                    <div className="pn-segmented">
                      <button type="button" className={mpSandbox ? "active" : ""} onClick={() => setMpSandbox(true)}>
                        Homologação (conta de teste)
                      </button>
                      <button type="button" className={!mpSandbox ? "active" : ""} onClick={() => setMpSandbox(false)}>
                        Produção
                      </button>
                    </div>
                  </div>
                  <input type="hidden" name="mercadopago_sandbox" value={mpSandbox ? "1" : "0"} />
                  <p className="card-sub" style={{ marginTop: 8 }}>
                    O Mercado Pago não tem endereço de sandbox: o ambiente é definido pela
                    credencial. Em homologação, cole o access token da conta de teste (Suas
                    integrações → Contas de teste); em produção, o token da conta real.
                  </p>
                  <div className="ct-field" style={{ marginTop: 14 }}>
                    <label htmlFor="mercadopago_access_token">Access token do Mercado Pago</label>
                    <input
                      id="mercadopago_access_token"
                      name="mercadopago_access_token"
                      placeholder={
                        config.integracoes.mercadopago_configurado
                          ? "•••••••• já configurado — preencha só pra trocar"
                          : "cole o access token (APP_USR-...) da sua aplicação"
                      }
                      autoComplete="off"
                    />
                    {err("mercadopago_access_token")}
                  </div>
                  <div className="ct-field" style={{ marginTop: 14 }}>
                    <label htmlFor="mercadopago_webhook_secret">
                      Secret do webhook (assinatura x-signature)
                    </label>
                    <input
                      id="mercadopago_webhook_secret"
                      name="mercadopago_webhook_secret"
                      placeholder={
                        config.integracoes.mercadopago_webhook_configurado
                          ? "•••••••• já configurado — preencha só pra trocar"
                          : "painel MP → Suas integrações → Webhooks → assinatura secreta"
                      }
                      autoComplete="off"
                    />
                    {err("mercadopago_webhook_secret")}
                  </div>
                </>
              )}

              <div className="pn-actions-bar" style={{ marginTop: 14 }}>
                <button type="submit" className="pn-btn-sm mint" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar pagamento"}
                </button>
              </div>
            </Form>
          </div>
        </>
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
