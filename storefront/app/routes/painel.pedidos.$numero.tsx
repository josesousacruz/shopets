import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import { ArrowLeft } from "lucide-react";
import { useActionFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { confirmDestrutivo, Swal } from "~/lib/painel-swal";
import { painel, PainelValidationError } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";
import { STATUS_LABEL } from "~/lib/pedido";

export const meta: MetaFunction = ({ params }) => [
  { title: `Pedido ${params.numero} — Painel Shopets` },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const [res, msgs] = await Promise.all([
    painel.pedidos.show(token, params.numero!),
    painel.pedidos.mensagens(token, params.numero!),
  ]);
  return json({ pedido: res.data, mensagens: msgs.data });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const numero = params.numero!;
  const form = await request.formData();
  const acao = String(form.get("_acao") ?? "");

  try {
    switch (acao) {
      case "separacao":
        await painel.pedidos.separacao(token, numero);
        break;
      case "enviar":
        await painel.pedidos.enviar(token, numero, String(form.get("codigo_rastreio") ?? ""));
        break;
      case "entregar":
        await painel.pedidos.entregar(token, numero);
        break;
      case "cancelar":
        await painel.pedidos.cancelar(token, numero, String(form.get("motivo") ?? ""));
        break;
      case "rastreio":
        await painel.pedidos.atualizarRastreio(token, numero, String(form.get("codigo_rastreio") ?? ""));
        break;
      case "mensagem":
        await painel.pedidos.enviarMensagem(token, numero, String(form.get("texto") ?? ""));
        break;
      case "etiqueta":
        await painel.pedidos.etiqueta(token, numero);
        break;
      default:
        return json({ erro: "Ação inválida." }, { status: 400 });
    }
    return json({ ok: acao, mensagem: mensagemPedido(acao) });
  } catch (err) {
    if (err instanceof PainelValidationError) {
      return json({ erro: err.message }, { status: err.status === 422 ? 422 : 400 });
    }
    throw err;
  }
}

function mensagemPedido(acao: string): string {
  switch (acao) {
    case "separacao": return "Pedido movido para separação.";
    case "enviar": return "Pedido marcado como enviado.";
    case "entregar": return "Pedido marcado como entregue.";
    case "cancelar": return "Pedido cancelado.";
    case "rastreio": return "Rastreio atualizado e cliente notificado.";
    case "mensagem": return "Mensagem enviada.";
    case "etiqueta": return "Etiqueta gerada.";
    default: return "Ação concluída.";
  }
}

function fmtDataHora(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PedidoDetalhe() {
  const { pedido, mensagens } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const submit = useSubmit();
  const busy = nav.state !== "idle";
  useActionFeedback(actionData);

  const editarRastreio = async () => {
    const r = await Swal.fire({
      title: "Atualizar rastreio",
      input: "text",
      inputLabel: "Código de rastreio",
      inputValue: pedido.codigo_rastreio ?? "",
      showCancelButton: true,
      confirmButtonText: "Salvar e notificar",
      cancelButtonText: "Cancelar",
      inputValidator: (v) => (!v ? "Informe o código." : undefined),
    });
    if (!r.isConfirmed) return;
    const fd = new FormData();
    fd.set("_acao", "rastreio");
    fd.set("codigo_rastreio", String(r.value ?? ""));
    submit(fd, { method: "post", replace: true });
  };

  const gerarEtiqueta = () => {
    const fd = new FormData();
    fd.set("_acao", "etiqueta");
    submit(fd, { method: "post", replace: true });
  };

  const podeSeparar = pedido.status === "pago";
  const podeEnviar = pedido.status === "em_separacao";
  const podeEntregar = pedido.status === "enviado";
  const podeCancelar = !["entregue", "cancelado"].includes(pedido.status);

  const moverSeparacao = () => {
    const fd = new FormData();
    fd.set("_acao", "separacao");
    submit(fd, { method: "post", replace: true });
  };

  const moverEntregar = () => {
    const fd = new FormData();
    fd.set("_acao", "entregar");
    submit(fd, { method: "post", replace: true });
  };

  const enviarComRastreio = async () => {
    const r = await Swal.fire({
      title: "Marcar como enviado",
      input: "text",
      inputLabel: "Código de rastreio (opcional)",
      inputValue: pedido.codigo_rastreio ?? "",
      inputPlaceholder: "Ex.: AA123456789BR",
      showCancelButton: true,
      confirmButtonText: "Enviar",
      cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    const fd = new FormData();
    fd.set("_acao", "enviar");
    fd.set("codigo_rastreio", String(r.value ?? ""));
    submit(fd, { method: "post", replace: true });
  };

  const cancelarPedido = async () => {
    const ok = await confirmDestrutivo({
      titulo: `Cancelar pedido ${pedido.numero}?`,
      mensagem: "Itens reservados retornam ao estoque. Se o pedido estava pago, o estorno é solicitado.",
      confirmar: "Cancelar pedido",
      cancelar: "Voltar",
    });
    if (!ok) return;
    const motivoR = await Swal.fire({
      title: "Motivo do cancelamento",
      input: "textarea",
      inputPlaceholder: "Cliente desistiu, falta de estoque, etc.",
      showCancelButton: true,
      confirmButtonText: "Cancelar pedido",
      cancelButtonText: "Voltar",
    });
    if (!motivoR.isConfirmed) return;
    const fd = new FormData();
    fd.set("_acao", "cancelar");
    fd.set("motivo", String(motivoR.value ?? ""));
    submit(fd, { method: "post", replace: true });
  };

  return (
    <div>
      <div className="pn-head">
        <div>
          <Link
            to="/painel/pedidos"
            className="pn-btn-sm ghost"
            style={{ marginBottom: 10 }}
          >
            <ArrowLeft size={15} /> Pedidos
          </Link>
          <h1>Pedido {pedido.numero}</h1>
          <p>
            <span className={`pn-chip st-${pedido.status}`}>
              {STATUS_LABEL[pedido.status] ?? pedido.status}
            </span>{" "}
            · {fmtDataHora(pedido.criado_em)}
          </p>
        </div>
      </div>

      {actionData && "erro" in actionData && actionData.erro && (
        <div className="ct-alert ct-alert--err" role="alert" style={{ marginBottom: 18 }}>
          {actionData.erro}
        </div>
      )}

      {/* Ações de transição */}
      <div className="pn-card" style={{ marginBottom: 18 }}>
        <h2>Ações</h2>
        <p className="card-sub">Avance o pedido no fluxo de atendimento.</p>
        <div className="pn-actions-bar">
          <button
            type="button"
            className="pn-btn-sm mint"
            disabled={!podeSeparar || busy}
            onClick={moverSeparacao}
          >
            {busy ? "Processando..." : "Em separação"}
          </button>

          <button
            type="button"
            className="pn-btn-sm ink"
            disabled={!podeEnviar || busy}
            onClick={enviarComRastreio}
          >
            {busy ? "Processando..." : "Enviar"}
          </button>

          <button
            type="button"
            className="pn-btn-sm mint"
            disabled={!podeEntregar || busy}
            onClick={moverEntregar}
          >
            {busy ? "Processando..." : "Marcar entregue"}
          </button>

          <button
            type="button"
            className="pn-btn-sm danger"
            disabled={!podeCancelar || busy}
            onClick={cancelarPedido}
          >
            {busy ? "Processando..." : "Cancelar"}
          </button>
        </div>
      </div>

      <div className="pn-grid-2">
        <div>
          {/* Itens */}
          <div className="pn-card">
            <h2>Itens</h2>
            <div className="pn-table-wrap" style={{ marginTop: 8 }}>
              <table className="pn-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>SKU</th>
                    <th>Qtd</th>
                    <th>Unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.itens.map((i, idx) => (
                    <tr key={idx}>
                      <td>{i.nome}</td>
                      <td>{i.sku ?? "—"}</td>
                      <td>{i.quantidade}</td>
                      <td>{formatBRL(i.preco_unit)}</td>
                      <td>{formatBRL(i.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="pn-dl" style={{ marginTop: 16 }}>
              <dt>Subtotal</dt>
              <dd>{formatBRL(pedido.subtotal)}</dd>
              <dt>Frete{pedido.frete_servico ? ` (${pedido.frete_servico})` : ""}</dt>
              <dd>{formatBRL(pedido.frete)}</dd>
              {pedido.desconto > 0 && (
                <>
                  <dt>Desconto</dt>
                  <dd>- {formatBRL(pedido.desconto)}</dd>
                </>
              )}
              <dt>Total</dt>
              <dd>{formatBRL(pedido.total)}</dd>
            </dl>
          </div>

          {/* Timeline */}
          <div className="pn-card">
            <h2>Histórico</h2>
            {pedido.eventos.length === 0 ? (
              <p className="card-sub">Sem eventos registrados.</p>
            ) : (
              <ul className="pn-timeline" style={{ marginTop: 12 }}>
                {pedido.eventos.map((e, idx) => (
                  <li key={idx}>
                    <div className="ev-title">{e.descricao ?? e.tipo}</div>
                    <div className="ev-meta">
                      {e.tipo} · {fmtDataHora(e.criado_em)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Chat / mensagens */}
          <div className="pn-card">
            <h2>Mensagens</h2>
            <div className="pn-chat">
              {mensagens.length === 0 ? (
                <p className="card-sub">Nenhuma mensagem ainda.</p>
              ) : (
                mensagens.map((m) => (
                  <div key={m.id} className={`pn-chat-msg ${m.autor_tipo === "admin" ? "admin" : "cliente"}`}>
                    <div className="pn-chat-meta">{m.autor} · {fmtDataHora(m.criado_em)}</div>
                    <div className="pn-chat-texto">{m.texto}</div>
                  </div>
                ))
              )}
            </div>
            <Form method="post" replace className="pn-chat-form">
              <input type="hidden" name="_acao" value="mensagem" />
              <input name="texto" placeholder="Escreva uma mensagem…" required maxLength={2000} />
              <button type="submit" className="pn-btn-sm mint" disabled={busy}>Enviar</button>
            </Form>
          </div>
        </div>

        <div>
          {/* Cliente */}
          <div className="pn-card">
            <h2>Cliente</h2>
            {pedido.cliente ? (
              <dl className="pn-dl">
                <dt>Nome</dt>
                <dd>{pedido.cliente.nome}</dd>
                <dt>E-mail</dt>
                <dd>{pedido.cliente.email}</dd>
                {pedido.cliente.telefone && (
                  <>
                    <dt>Telefone</dt>
                    <dd>{pedido.cliente.telefone}</dd>
                  </>
                )}
                {pedido.cliente.cpf_cnpj && (
                  <>
                    <dt>CPF/CNPJ</dt>
                    <dd>{pedido.cliente.cpf_cnpj}</dd>
                  </>
                )}
              </dl>
            ) : (
              <p className="card-sub">Sem dados do cliente.</p>
            )}
          </div>

          {/* Endereço */}
          <div className="pn-card">
            <h2>Entrega</h2>
            <p className="card-sub" style={{ marginBottom: 8 }}>
              {pedido.modalidade ?? "—"}
            </p>
            {pedido.endereco ? (
              <address style={{ fontStyle: "normal", fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>
                {pedido.endereco.logradouro}, {pedido.endereco.numero ?? "s/n"}
                {pedido.endereco.complemento ? ` — ${pedido.endereco.complemento}` : ""}
                <br />
                {pedido.endereco.bairro} · {pedido.endereco.cidade}/{pedido.endereco.uf}
                <br />
                CEP {pedido.endereco.cep}
              </address>
            ) : (
              <p className="card-sub">Sem endereço.</p>
            )}
            <dl className="pn-dl" style={{ marginTop: 12 }}>
              <dt>Rastreio</dt>
              <dd>{pedido.codigo_rastreio ?? "—"}</dd>
              <dt>Etiqueta</dt>
              <dd>
                {pedido.etiqueta_url ? (
                  <a href={pedido.etiqueta_url} target="_blank" rel="noreferrer">
                    Ver etiqueta
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </dl>
            <div className="pn-actions-bar" style={{ marginTop: 8, gap: 8 }}>
              <button type="button" className="pn-btn-sm" onClick={editarRastreio} disabled={busy}>
                {pedido.codigo_rastreio ? "Atualizar rastreio" : "Adicionar rastreio"}
              </button>
              {pedido.modalidade === "entrega" && !pedido.etiqueta_url && (
                <button type="button" className="pn-btn-sm mint" onClick={gerarEtiqueta} disabled={busy}>
                  {busy ? "Gerando…" : "Gerar etiqueta"}
                </button>
              )}
            </div>
          </div>

          {/* Pagamento + venda/nfe */}
          <div className="pn-card">
            <h2>Pagamento</h2>
            {pedido.pagamento ? (
              <dl className="pn-dl">
                <dt>Método</dt>
                <dd>{pedido.pagamento.metodo}</dd>
                <dt>Status</dt>
                <dd>{pedido.pagamento.status}</dd>
                <dt>Valor</dt>
                <dd>{formatBRL(pedido.pagamento.valor)}</dd>
                {pedido.pagamento.gateway && (
                  <>
                    <dt>Gateway</dt>
                    <dd>{pedido.pagamento.gateway}</dd>
                  </>
                )}
              </dl>
            ) : (
              <p className="card-sub">Sem pagamento registrado.</p>
            )}
            {(pedido.venda || pedido.nfe_numero) && (
              <dl className="pn-dl" style={{ marginTop: 12 }}>
                {pedido.venda && (
                  <>
                    <dt>Venda</dt>
                    <dd>{pedido.venda.numero}</dd>
                  </>
                )}
                {pedido.nfe_numero && (
                  <>
                    <dt>NF-e</dt>
                    <dd>{pedido.nfe_numero}</dd>
                  </>
                )}
              </dl>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
