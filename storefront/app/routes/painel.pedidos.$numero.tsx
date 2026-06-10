import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";
import { STATUS_LABEL } from "~/lib/pedido";

export const meta: MetaFunction = ({ params }) => [
  { title: `Pedido ${params.numero} — Painel Shopets` },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const res = await painel.pedidos.show(token, params.numero!);
  return json({ pedido: res.data });
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
      default:
        return json({ erro: "Ação inválida." }, { status: 400 });
    }
    return json({ ok: true });
  } catch (err) {
    if (err instanceof PainelValidationError) {
      return json({ erro: err.message }, { status: err.status === 422 ? 422 : 400 });
    }
    throw err;
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
  const { pedido } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  const podeSeparar = pedido.status === "pago";
  const podeEnviar = pedido.status === "em_separacao";
  const podeEntregar = pedido.status === "enviado";
  const podeCancelar = !["entregue", "cancelado"].includes(pedido.status);

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
          <Form method="post">
            <input type="hidden" name="_acao" value="separacao" />
            <button type="submit" className="pn-btn-sm mint" disabled={!podeSeparar || busy}>
              Em separação
            </button>
          </Form>

          <Form
            method="post"
            onSubmit={(e) => {
              const cod = window.prompt("Código de rastreio (opcional):", pedido.codigo_rastreio ?? "");
              if (cod === null) {
                e.preventDefault();
                return;
              }
              (e.currentTarget.elements.namedItem("codigo_rastreio") as HTMLInputElement).value = cod;
            }}
          >
            <input type="hidden" name="_acao" value="enviar" />
            <input type="hidden" name="codigo_rastreio" value="" />
            <button type="submit" className="pn-btn-sm ink" disabled={!podeEnviar || busy}>
              Enviar
            </button>
          </Form>

          <Form method="post">
            <input type="hidden" name="_acao" value="entregar" />
            <button type="submit" className="pn-btn-sm mint" disabled={!podeEntregar || busy}>
              Marcar entregue
            </button>
          </Form>

          <Form
            method="post"
            onSubmit={(e) => {
              if (!window.confirm("Cancelar este pedido?")) {
                e.preventDefault();
                return;
              }
              const motivo = window.prompt("Motivo (opcional):", "") ?? "";
              (e.currentTarget.elements.namedItem("motivo") as HTMLInputElement).value = motivo;
            }}
          >
            <input type="hidden" name="_acao" value="cancelar" />
            <input type="hidden" name="motivo" value="" />
            <button type="submit" className="pn-btn-sm danger" disabled={!podeCancelar || busy}>
              Cancelar
            </button>
          </Form>
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
            {pedido.codigo_rastreio && (
              <dl className="pn-dl" style={{ marginTop: 12 }}>
                <dt>Rastreio</dt>
                <dd>{pedido.codigo_rastreio}</dd>
              </dl>
            )}
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
