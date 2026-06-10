import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useFetcher, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { useEffect, useState } from "react";
import { MapPin, Truck, Package, Check, ShieldCheck, ArrowRight, ArrowLeft, Tag, X, Store, QrCode, Wallet, Phone } from "lucide-react";
import { requireToken } from "~/lib/session.server";
import { listarEnderecos, ApiValidationError } from "~/lib/auth.server";
import { fetchCarrinho, cotarFrete, iniciarCheckout, listarPontosRetirada } from "~/lib/cart.server";
import { formatBRL } from "~/lib/format";
import type { Carrinho, CupomAplicado, Endereco, FreteOpcao, PontoRetirada } from "~/types/api";
import checkoutStyles from "~/styles/checkout.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: checkoutStyles }];

export const meta: MetaFunction = () => [{ title: "Checkout — Shopets" }];

type Modalidade = "entrega" | "retirada";
type PagamentoModo = "online" | "na_retirada";
type Step = "endereco" | "frete" | "revisao";

const STEPS: Step[] = ["endereco", "frete", "revisao"];

export async function loader({ request }: LoaderFunctionArgs) {
  await requireToken(request, "/checkout");

  let carrinho: Carrinho | null = null;
  let setCookie: string | undefined;
  try {
    const r = await fetchCarrinho(request);
    carrinho = r.carrinho;
    setCookie = r.setCookie;
  } catch {
    carrinho = null;
  }

  // Carrinho vazio: volta para a página do carrinho.
  if (!carrinho || carrinho.itens.length === 0) {
    throw redirect("/carrinho");
  }

  let enderecos: Endereco[] = [];
  try {
    const r = await listarEnderecos(await requireToken(request, "/checkout"));
    enderecos = r.data;
  } catch {
    enderecos = [];
  }

  // Pontos de retirada habilitados (público). Tolerante a falhas.
  let pontos: PontoRetirada[] = [];
  try {
    const r = await listarPontosRetirada();
    pontos = r.data;
  } catch {
    pontos = [];
  }

  return json(
    { carrinho, enderecos, pontos },
    setCookie ? { headers: { "Set-Cookie": setCookie } } : undefined,
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireToken(request, "/checkout");
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  // Cotação de frete (etapa 2) — devolve as opções para a UI.
  if (intent === "cotar") {
    const cep = String(form.get("cep") ?? "");
    try {
      const { data: opcoes } = await cotarFrete(request, { cep });
      return json({ ok: true as const, intent, opcoes });
    } catch (err) {
      if (err instanceof ApiValidationError) {
        return json(
          { ok: false as const, intent, message: err.errors.cep?.[0] ?? err.message },
          { status: 422 },
        );
      }
      throw err;
    }
  }

  // Confirmação do pedido (etapa 3) — POST /checkout/iniciar.
  if (intent === "confirmar") {
    const modalidade = (String(form.get("modalidade") ?? "entrega") as Modalidade);

    if (modalidade === "retirada") {
      const id_pdv = Number(form.get("id_pdv")) || null;
      const pagamento_modo = (String(form.get("pagamento_modo") ?? "online") as PagamentoModo);
      try {
        const { data: pedido } = await iniciarCheckout(request, token, {
          modalidade: "retirada",
          id_pdv,
          pagamento_modo,
        });
        // Pagar online → fluxo Pix; pagar na retirada → sucesso (reservado).
        if (pagamento_modo === "online") {
          return redirect(`/checkout/pagamento/${encodeURIComponent(pedido.numero)}`);
        }
        // Reservado para pagar no balcão: leva à tela de sucesso com os dados da loja.
        const nomePdv = String(form.get("pdv_nome") ?? "");
        const enderecoPdv = String(form.get("pdv_endereco") ?? "");
        const qs = new URLSearchParams();
        if (nomePdv) qs.set("loja", nomePdv);
        if (enderecoPdv) qs.set("end", enderecoPdv);
        const suffix = qs.toString() ? `?${qs}` : "";
        return redirect(`/checkout/sucesso/${encodeURIComponent(pedido.numero)}${suffix}`);
      } catch (err) {
        if (err instanceof ApiValidationError) {
          const message =
            err.errors.id_pdv?.[0] ??
            err.errors.pagamento_modo?.[0] ??
            Object.values(err.errors)[0]?.[0] ??
            err.message;
          return json({ ok: false as const, intent, message, errors: err.errors }, { status: err.status });
        }
        throw err;
      }
    }

    const id_endereco = Number(form.get("id_endereco")) || null;
    const frete_servico = String(form.get("frete_servico") ?? "") || null;
    const cep = String(form.get("cep") ?? "") || null;
    try {
      const { data: pedido } = await iniciarCheckout(request, token, {
        modalidade: "entrega",
        id_endereco,
        frete_servico,
        cep,
      });
      return redirect(`/checkout/pagamento/${encodeURIComponent(pedido.numero)}`);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        const message =
          err.errors.id_endereco?.[0] ??
          err.errors.frete_servico?.[0] ??
          err.errors.cep?.[0] ??
          Object.values(err.errors)[0]?.[0] ??
          err.message;
        return json({ ok: false as const, intent, message, errors: err.errors }, { status: err.status });
      }
      throw err;
    }
  }

  return json({ ok: false as const, intent, message: "Ação inválida." }, { status: 400 });
}

type CupomFetcher = { ok: boolean; intent?: string; message?: string; cupom?: CupomAplicado | null };

/** Cupom no checkout — mesma mecânica do carrinho, reflete no resumo via onChange. */
function CheckoutCoupon({ onChange }: { onChange: (c: CupomAplicado | null) => void }) {
  const fetcher = useFetcher<CupomFetcher>();
  const [aplicado, setAplicado] = useState<CupomAplicado | null>(null);
  const busy = fetcher.state !== "idle";
  const erro = fetcher.data && fetcher.data.ok === false ? fetcher.data.message : undefined;

  const data = fetcher.data;
  if (data?.ok && fetcher.state === "idle") {
    const novo = data.intent === "cupom_remove" ? null : data.cupom ?? null;
    const mudou =
      (novo?.codigo ?? null) !== (aplicado?.codigo ?? null) ||
      (novo?.desconto ?? 0) !== (aplicado?.desconto ?? 0);
    if (mudou) {
      setAplicado(novo);
      onChange(novo);
    }
  }

  if (aplicado) {
    return (
      <div className="co-coupon applied">
        <div className="info">
          <span className="tag">
            <Check size={13} /> {aplicado.codigo}
          </span>
          <span className="desc">
            {aplicado.frete_gratis ? "Frete grátis aplicado" : `Desconto de ${formatBRL(aplicado.desconto)}`}
          </span>
        </div>
        <fetcher.Form method="post" action="/api/carrinho">
          <input type="hidden" name="intent" value="cupom_remove" />
          <button type="submit" className="rm" aria-label="Remover cupom" disabled={busy}>
            <X size={15} />
          </button>
        </fetcher.Form>
      </div>
    );
  }

  return (
    <fetcher.Form method="post" action="/api/carrinho" className="co-coupon">
      <input type="hidden" name="intent" value="cupom_apply" />
      <div className="field">
        <Tag size={15} />
        <input name="codigo" placeholder="Cupom de desconto" autoComplete="off" />
      </div>
      <button type="submit" className="apply" disabled={busy}>
        {busy ? "..." : "Aplicar"}
      </button>
      {erro && <div className="err">{erro}</div>}
    </fetcher.Form>
  );
}

export default function Checkout() {
  const { carrinho, enderecos, pontos } = useLoaderData<typeof loader>();
  const [cupom, setCupom] = useState<CupomAplicado | null>(null);
  const [params, setParams] = useSearchParams();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();

  const [modalidade, setModalidade] = useState<Modalidade>("entrega");
  const isRetirada = modalidade === "retirada";

  const stepParam = (params.get("step") ?? "endereco") as Step;
  const step: Step = STEPS.includes(stepParam) ? stepParam : "endereco";

  const principal = enderecos.find((e) => e.principal) ?? enderecos[0];
  const [idEndereco, setIdEndereco] = useState<number | null>(principal?.id ?? null);
  const [freteServico, setFreteServico] = useState<string | null>(null);
  // Mantém as opções de frete em estado para sobreviverem a outras actions (ex.: confirmar com erro).
  const [opcoes, setOpcoes] = useState<FreteOpcao[]>([]);

  // Retirada: PDV escolhido + modo de pagamento.
  const [idPdv, setIdPdv] = useState<number | null>(null);
  const [pagamentoModo, setPagamentoModo] = useState<PagamentoModo>("online");

  const enderecoSel = enderecos.find((e) => e.id === idEndereco) ?? null;
  const pdvSel = pontos.find((p) => p.id === idPdv) ?? null;

  // Quando a cotação retorna, guarda as opções.
  useEffect(() => {
    if (actionData && "opcoes" in actionData && actionData.opcoes) {
      setOpcoes(actionData.opcoes);
    }
  }, [actionData]);

  const freteSel = opcoes.find((o) => o.servico === freteServico) ?? null;

  const cotando = nav.state === "submitting" && nav.formData?.get("intent") === "cotar";
  const confirmando = nav.state === "submitting" && nav.formData?.get("intent") === "confirmar";

  const erro =
    actionData && actionData.ok === false && "message" in actionData ? actionData.message : undefined;

  function goto(s: Step) {
    setParams((p) => {
      p.set("step", s);
      return p;
    });
  }

  // Ao alternar a modalidade, volta para o primeiro passo.
  function escolherModalidade(m: Modalidade) {
    setModalidade(m);
    goto("endereco");
  }

  // Etapa 2 muda de significado conforme a modalidade (frete x pagamento na retirada).
  const labels: Record<Step, string> = {
    endereco: isRetirada ? "Loja" : "Endereço",
    frete: isRetirada ? "Pagamento" : "Frete",
    revisao: "Revisão",
  };

  // Pode avançar do passo 1?
  const pode1 = isRetirada ? !!pdvSel : !!enderecoSel;
  // Total exibido (retirada nunca tem frete).
  const freteTotal = isRetirada ? 0 : cupom?.frete_gratis ? 0 : freteSel?.preco ?? 0;
  const total = Math.max(0, carrinho.subtotal - (cupom?.desconto ?? 0) + freteTotal);

  return (
    <div className="co-wrap">
      <div className="co-head">
        <h1>Finalizar compra</h1>
        <p>
          {isRetirada
            ? "Retire na loja mais perto de você. Pague online ou no balcão."
            : "Entrega para todo o Brasil. Pagamento na próxima etapa."}
        </p>
      </div>

      <Stepper step={step} labels={labels} steps={STEPS} />

      <div className="co-checkout">
        <div className="co-steps">
          {/* ─── Etapa 1: Modalidade + (Endereço | Loja) ─── */}
          {step === "endereco" && (
            <section className="co-card">
              <h2>
                <span className="badge">1</span> {isRetirada ? "Retirada" : "Entrega"}
              </h2>
              <p className="hint">Escolha como você quer receber o pedido.</p>

              <div className="co-options">
                <label className="co-opt">
                  <input
                    type="radio"
                    name="modalidade"
                    checked={modalidade === "entrega"}
                    onChange={() => escolherModalidade("entrega")}
                  />
                  <span className="dot" />
                  <span>
                    <span className="ttl">
                      <Truck /> Entrega no endereço
                    </span>
                    <span className="desc">Enviamos pelos Correios (PAC ou SEDEX).</span>
                  </span>
                </label>
                <label className="co-opt" style={pontos.length === 0 ? { opacity: 0.55 } : undefined}>
                  <input
                    type="radio"
                    name="modalidade"
                    checked={modalidade === "retirada"}
                    disabled={pontos.length === 0}
                    onChange={() => escolherModalidade("retirada")}
                  />
                  <span className="dot" />
                  <span>
                    <span className="ttl">
                      <Package /> Retirar na loja
                    </span>
                    <span className="desc">
                      {pontos.length === 0
                        ? "Nenhuma loja disponível para retirada no momento."
                        : "Sem frete. Pague online ou no balcão, ao retirar."}
                    </span>
                  </span>
                </label>
              </div>

              {/* Endereço (entrega) */}
              {!isRetirada && (
                <>
                  <h2 style={{ marginTop: 26 }}>
                    <MapPin size={18} style={{ color: "var(--mint-deep)" }} /> Endereço de entrega
                  </h2>

                  {enderecos.length === 0 ? (
                    <div className="co-note" style={{ marginTop: 14 }}>
                      Você ainda não tem endereços cadastrados.{" "}
                      <Link to="/conta/enderecos" style={{ color: "var(--mint-deep)", fontWeight: 700 }}>
                        Cadastrar endereço
                      </Link>
                    </div>
                  ) : (
                    <div className="co-options">
                      {enderecos.map((e) => (
                        <label className="co-opt" key={e.id}>
                          <input
                            type="radio"
                            name="endereco"
                            checked={idEndereco === e.id}
                            onChange={() => setIdEndereco(e.id)}
                          />
                          <span className="dot" />
                          <span>
                            <span className="ttl">{e.apelido || "Endereço"}</span>
                            <address>
                              {e.logradouro}, {e.numero}
                              {e.complemento ? ` — ${e.complemento}` : ""}
                              <br />
                              {e.bairro} — {e.cidade}/{e.uf} · CEP {e.cep}
                            </address>
                          </span>
                        </label>
                      ))}
                      <Link to="/conta/enderecos" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--mint-deep)" }}>
                        + Gerenciar endereços
                      </Link>
                    </div>
                  )}
                </>
              )}

              {/* Loja de retirada */}
              {isRetirada && (
                <>
                  <h2 style={{ marginTop: 26 }}>
                    <Store size={18} style={{ color: "var(--mint-deep)" }} /> Escolha a loja
                  </h2>
                  <div className="co-options">
                    {pontos.map((p) => (
                      <label className="co-opt" key={p.id}>
                        <input
                          type="radio"
                          name="pdv"
                          checked={idPdv === p.id}
                          onChange={() => setIdPdv(p.id)}
                        />
                        <span className="dot" />
                        <span>
                          <span className="ttl">
                            <Store /> {p.nome_pdv}
                          </span>
                          {p.endereco && <address>{p.endereco}</address>}
                          {p.telefone && (
                            <span className="desc">
                              <Phone size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                              {p.telefone}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              <div className="co-cart-actions" style={{ marginTop: 24 }}>
                <Link to="/carrinho" className="ct-btn ct-btn--ghost" style={{ width: "auto" }}>
                  <ArrowLeft size={16} /> Voltar ao carrinho
                </Link>
                <button
                  type="button"
                  className="ct-btn ct-btn--mint"
                  style={{ width: "auto" }}
                  disabled={!pode1}
                  onClick={() => goto("frete")}
                >
                  {isRetirada ? "Continuar para o pagamento" : "Continuar para o frete"}{" "}
                  <ArrowRight size={16} />
                </button>
              </div>
            </section>
          )}

          {/* ─── Etapa 2 (entrega): Frete ─── */}
          {step === "frete" && !isRetirada && (
            <section className="co-card">
              <h2>
                <span className="badge">2</span> Frete
              </h2>
              {!enderecoSel ? (
                <div className="co-note" style={{ marginTop: 14 }}>
                  Selecione um endereço primeiro.{" "}
                  <button type="button" onClick={() => goto("endereco")} style={{ color: "var(--mint-deep)", fontWeight: 700 }}>
                    Voltar
                  </button>
                </div>
              ) : (
                <>
                  <p className="hint">
                    Entrega para {enderecoSel.cidade}/{enderecoSel.uf} · CEP {enderecoSel.cep}
                  </p>

                  <Form method="post" className="co-frete-form">
                    <input type="hidden" name="intent" value="cotar" />
                    <input type="hidden" name="cep" value={enderecoSel.cep} />
                    <button type="submit" className="ct-btn ct-btn--mint" style={{ width: "auto" }} disabled={cotando}>
                      {cotando ? "Calculando..." : opcoes.length ? "Recalcular frete" : "Calcular frete"}
                    </button>
                  </Form>

                  {erro && actionData?.intent === "cotar" && (
                    <div className="ct-alert ct-alert--err" role="alert">{erro}</div>
                  )}

                  {opcoes.length > 0 && (
                    <div className="co-options" style={{ marginTop: 18 }}>
                      {opcoes.map((o) => (
                        <label className="co-opt" key={o.servico}>
                          <input
                            type="radio"
                            name="frete"
                            checked={freteServico === o.servico}
                            onChange={() => setFreteServico(o.servico)}
                          />
                          <span className="dot" />
                          <span>
                            <span className="ttl">
                              <Truck /> {o.servico}
                            </span>
                            <span className="desc">
                              {o.transportadora ?? "Correios"} · até {o.prazo_dias}{" "}
                              {o.prazo_dias === 1 ? "dia útil" : "dias úteis"}
                            </span>
                          </span>
                          <span className="meta">{formatBRL(o.preco)}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="co-cart-actions" style={{ marginTop: 24 }}>
                    <button type="button" className="ct-btn ct-btn--ghost" style={{ width: "auto" }} onClick={() => goto("endereco")}>
                      <ArrowLeft size={16} /> Voltar
                    </button>
                    <button
                      type="button"
                      className="ct-btn ct-btn--mint"
                      style={{ width: "auto" }}
                      disabled={!freteSel}
                      onClick={() => goto("revisao")}
                    >
                      Revisar pedido <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {/* ─── Etapa 2 (retirada): Forma de pagamento ─── */}
          {step === "frete" && isRetirada && (
            <section className="co-card">
              <h2>
                <span className="badge">2</span> Pagamento
              </h2>
              {!pdvSel ? (
                <div className="co-note" style={{ marginTop: 14 }}>
                  Selecione uma loja primeiro.{" "}
                  <button type="button" onClick={() => goto("endereco")} style={{ color: "var(--mint-deep)", fontWeight: 700 }}>
                    Voltar
                  </button>
                </div>
              ) : (
                <>
                  <p className="hint">Como você prefere pagar a retirada em {pdvSel.nome_pdv}?</p>

                  <div className="co-options" style={{ marginTop: 14 }}>
                    <label className="co-opt">
                      <input
                        type="radio"
                        name="pagamento_modo"
                        checked={pagamentoModo === "online"}
                        onChange={() => setPagamentoModo("online")}
                      />
                      <span className="dot" />
                      <span>
                        <span className="ttl">
                          <QrCode /> Pagar online (Pix)
                        </span>
                        <span className="desc">
                          Pague agora via Pix e retire o pedido já quitado, sem fila no caixa.
                        </span>
                      </span>
                    </label>
                    <label className="co-opt">
                      <input
                        type="radio"
                        name="pagamento_modo"
                        checked={pagamentoModo === "na_retirada"}
                        onChange={() => setPagamentoModo("na_retirada")}
                      />
                      <span className="dot" />
                      <span>
                        <span className="ttl">
                          <Wallet /> Pagar na retirada (balcão)
                        </span>
                        <span className="desc">
                          Reservamos o pedido e você paga no balcão ao retirar.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div className="co-cart-actions" style={{ marginTop: 24 }}>
                    <button type="button" className="ct-btn ct-btn--ghost" style={{ width: "auto" }} onClick={() => goto("endereco")}>
                      <ArrowLeft size={16} /> Voltar
                    </button>
                    <button
                      type="button"
                      className="ct-btn ct-btn--mint"
                      style={{ width: "auto" }}
                      onClick={() => goto("revisao")}
                    >
                      Revisar pedido <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {/* ─── Etapa 3: Revisão ─── */}
          {step === "revisao" && (
            <section className="co-card">
              <h2>
                <span className="badge">3</span> Revisão
              </h2>

              {isRetirada ? (
                !pdvSel ? (
                  <div className="co-note" style={{ marginTop: 14 }}>
                    Faltam informações.{" "}
                    <button type="button" onClick={() => goto("endereco")} style={{ color: "var(--mint-deep)", fontWeight: 700 }}>
                      Recomeçar
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontWeight: 800, color: "var(--ink)", fontFamily: "'Manrope',sans-serif" }}>
                        Retirada na loja
                      </div>
                      <address style={{ fontStyle: "normal", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55, marginTop: 6 }}>
                        <strong style={{ color: "var(--ink)" }}>{pdvSel.nome_pdv}</strong>
                        <br />
                        {pdvSel.endereco}
                        {pdvSel.telefone ? (
                          <>
                            <br />
                            Telefone: {pdvSel.telefone}
                          </>
                        ) : null}
                      </address>
                    </div>

                    <div style={{ marginTop: 18 }}>
                      <div style={{ fontWeight: 800, color: "var(--ink)", fontFamily: "'Manrope',sans-serif" }}>
                        Pagamento
                      </div>
                      <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
                        {pagamentoModo === "online"
                          ? "Pagar online via Pix na próxima etapa."
                          : "Pagar no balcão, no momento da retirada."}
                      </div>
                    </div>

                    <div className="co-note" style={{ marginTop: 18 }}>
                      {pagamentoModo === "online"
                        ? 'Na próxima etapa você pagará via Pix. Após a confirmação, separamos seu pedido e avisamos quando estiver pronto para retirada.'
                        : 'Seu pedido será reservado com status "Aguardando retirada". Vá até a loja escolhida e pague no balcão ao retirar.'}
                    </div>

                    {erro && actionData?.intent === "confirmar" && (
                      <div className="ct-alert ct-alert--err" role="alert">{erro}</div>
                    )}

                    <div className="co-cart-actions" style={{ marginTop: 24 }}>
                      <button type="button" className="ct-btn ct-btn--ghost" style={{ width: "auto" }} onClick={() => goto("frete")}>
                        <ArrowLeft size={16} /> Voltar
                      </button>
                      <Form method="post">
                        <input type="hidden" name="intent" value="confirmar" />
                        <input type="hidden" name="modalidade" value="retirada" />
                        <input type="hidden" name="id_pdv" value={pdvSel.id} />
                        <input type="hidden" name="pagamento_modo" value={pagamentoModo} />
                        <input type="hidden" name="pdv_nome" value={pdvSel.nome_pdv} />
                        <input type="hidden" name="pdv_endereco" value={pdvSel.endereco ?? ""} />
                        <button type="submit" className="ct-btn ct-btn--mint" style={{ width: "auto" }} disabled={confirmando}>
                          {confirmando
                            ? "Criando pedido..."
                            : pagamentoModo === "online"
                              ? "Confirmar e pagar"
                              : "Reservar pedido"}{" "}
                          <Check size={16} />
                        </button>
                      </Form>
                    </div>
                  </>
                )
              ) : !enderecoSel || !freteSel ? (
                <div className="co-note" style={{ marginTop: 14 }}>
                  Faltam informações.{" "}
                  <button type="button" onClick={() => goto("endereco")} style={{ color: "var(--mint-deep)", fontWeight: 700 }}>
                    Recomeçar
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 800, color: "var(--ink)", fontFamily: "'Manrope',sans-serif" }}>
                      Entrega
                    </div>
                    <address style={{ fontStyle: "normal", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55, marginTop: 6 }}>
                      {enderecoSel.apelido && <strong style={{ color: "var(--ink)" }}>{enderecoSel.apelido}<br /></strong>}
                      {enderecoSel.logradouro}, {enderecoSel.numero}
                      {enderecoSel.complemento ? ` — ${enderecoSel.complemento}` : ""}
                      <br />
                      {enderecoSel.bairro} — {enderecoSel.cidade}/{enderecoSel.uf} · CEP {enderecoSel.cep}
                    </address>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontWeight: 800, color: "var(--ink)", fontFamily: "'Manrope',sans-serif" }}>
                      Frete
                    </div>
                    <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
                      {freteSel.servico} · {freteSel.transportadora ?? "Correios"} · até {freteSel.prazo_dias}{" "}
                      {freteSel.prazo_dias === 1 ? "dia útil" : "dias úteis"} — {formatBRL(freteSel.preco)}
                    </div>
                  </div>

                  <div className="co-note" style={{ marginTop: 18 }}>
                    Na próxima etapa você pagará via Pix. Seu pedido será criado com status
                    "Aguardando pagamento" e confirmado assim que o pagamento for aprovado.
                  </div>

                  {erro && actionData?.intent === "confirmar" && (
                    <div className="ct-alert ct-alert--err" role="alert">{erro}</div>
                  )}

                  <div className="co-cart-actions" style={{ marginTop: 24 }}>
                    <button type="button" className="ct-btn ct-btn--ghost" style={{ width: "auto" }} onClick={() => goto("frete")}>
                      <ArrowLeft size={16} /> Voltar
                    </button>
                    <Form method="post">
                      <input type="hidden" name="intent" value="confirmar" />
                      <input type="hidden" name="modalidade" value="entrega" />
                      <input type="hidden" name="id_endereco" value={enderecoSel.id} />
                      <input type="hidden" name="frete_servico" value={freteSel.servico} />
                      <input type="hidden" name="cep" value={enderecoSel.cep} />
                      <button type="submit" className="ct-btn ct-btn--mint" style={{ width: "auto" }} disabled={confirmando}>
                        {confirmando ? "Criando pedido..." : "Confirmar pedido"} <Check size={16} />
                      </button>
                    </Form>
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        {/* ─── Resumo lateral ─── */}
        <aside className="co-summary">
          <h2>Seu pedido</h2>
          <div className="co-mini">
            {carrinho.itens.map((it) => (
              <div className="it" key={it.id}>
                <div className="th">
                  {it.imagem ? <img src={it.imagem} alt={it.nome ?? ""} /> : <span className="ph" />}
                </div>
                <div className="nm">
                  {it.nome ?? "Produto"}
                  <small>
                    {it.variacao?.nome ? `${it.variacao.nome} · ` : ""}Qtd {it.quantidade}
                  </small>
                </div>
                <div className="pr">{formatBRL(it.subtotal)}</div>
              </div>
            ))}
          </div>
          <div className="row">
            <span>Subtotal</span>
            <b>{formatBRL(carrinho.subtotal)}</b>
          </div>
          {cupom && cupom.desconto > 0 && (
            <div className="row">
              <span>Desconto ({cupom.codigo})</span>
              <b className="free">-{formatBRL(cupom.desconto)}</b>
            </div>
          )}
          <div className="row">
            <span>Frete</span>
            {isRetirada ? (
              <b className="free">Retirada na loja</b>
            ) : cupom?.frete_gratis ? (
              <b className="free">Grátis</b>
            ) : freteSel ? (
              <b>{formatBRL(freteSel.preco)}</b>
            ) : (
              <span>—</span>
            )}
          </div>

          <CheckoutCoupon onChange={setCupom} />

          <div className="divider" />
          <div className="total">
            <span>Total</span>
            <b>{formatBRL(total)}</b>
          </div>
          <div className="secure">
            <ShieldCheck /> Pagamento 100% seguro
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stepper({ step, labels, steps }: { step: Step; labels: Record<Step, string>; steps: Step[] }) {
  const idx = steps.indexOf(step);
  return (
    <div className="co-stepper">
      {steps.map((s, i) => (
        <div key={s} style={{ display: "contents" }}>
          <div className={`step${i === idx ? " active" : i < idx ? " done" : ""}`}>
            <span className="n">{i < idx ? <Check size={13} /> : i + 1}</span>
            {labels[s]}
          </div>
          {i < steps.length - 1 && <span className="sep" />}
        </div>
      ))}
    </div>
  );
}
