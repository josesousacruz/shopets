import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { CheckCircle2, Send, XCircle } from "lucide-react";
import { StatusBadge } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { drawerShouldRevalidate } from "~/lib/drawer-revalidate";
import { painel, PainelValidationError } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "./painel.compras._index";

export const meta: MetaFunction = () => [{ title: "Pedido de Compra — Painel Shopets" }];

/** Abrir/fechar o drawer (?receber) não refaz o detalhe do pedido — abre instantâneo. */
export const shouldRevalidate = drawerShouldRevalidate(["receber"]);

export async function loader({ request: req, params }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const r = await painel.compras.show(token, params.id!);
  return json({ pedido: r.data });
}

export async function action({ request: req, params }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const intent = String(fd.get("intent") ?? "");
  const id = params.id!;

  try {
    if (intent === "enviar") {
      await painel.compras.enviar(token, id);
      return redirect(`/painel/compras/${id}?feedback=enviado`);
    }
    if (intent === "cancelar") {
      await painel.compras.cancelar(token, id);
      return redirect(`/painel/compras/${id}?feedback=cancelado`);
    }
    if (intent === "receber") {
      let itens: { item_id: number; qtd_recebida: number }[] = [];
      try {
        itens = JSON.parse(String(fd.get("itens_json") ?? "[]"));
      } catch {
        itens = [];
      }
      itens = itens.filter((i) => i.qtd_recebida > 0);
      if (itens.length === 0) {
        return json({ erro: "Informe ao menos uma quantidade a receber." }, { status: 422 });
      }
      await painel.compras.receber(token, id, {
        nota_fiscal: String(fd.get("nota_fiscal") ?? "") || null,
        data: String(fd.get("data") ?? "") || null,
        observacoes: String(fd.get("observacoes") ?? "") || null,
        itens,
      });
      return redirect(`/painel/compras/${id}?feedback=recebido`);
    }
    return json({ erro: "Operação desconhecida." }, { status: 400 });
  } catch (e) {
    if (e instanceof PainelValidationError) {
      return json({ erro: e.message, errors: e.errors }, { status: e.status });
    }
    return json({ erro: "Falha ao processar." }, { status: 500 });
  }
}

export default function ComprasDetalhe() {
  const { pedido } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  const podeEnviar = pedido.status === "rascunho";
  const podeReceber = pedido.status === "enviado" || pedido.status === "parcialmente_recebido";
  const podeCancelar = pedido.status !== "recebido" && pedido.status !== "cancelado";
  const receberAberto = searchParams.get("receber") === "1";

  const [recebimentos, setRecebimentos] = useState<Record<number, string>>(() =>
    Object.fromEntries(pedido.itens.map((it) => [it.id, String(Math.max(0, it.qtd - it.qtd_recebida))])),
  );

  const itensJson = JSON.stringify(
    pedido.itens.map((it) => ({ item_id: it.id, qtd_recebida: Number(recebimentos[it.id] || 0) })),
  );

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Pedido de Compra</span>
          <h1>
            {pedido.numero} <StatusBadge tone={STATUS_TONE[pedido.status]}>{STATUS_LABEL[pedido.status]}</StatusBadge>
          </h1>
          <p>
            {pedido.fornecedor?.nome ?? "—"} · {pedido.deposito?.nome ?? "—"}
            {pedido.condicao_pagamento ? ` · ${pedido.condicao_pagamento}` : ""}
          </p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/compras" className="pn-btn-sm" prefetch="intent">
            Voltar
          </Link>
          {podeEnviar ? (
            <Form method="post" replace style={{ display: "inline" }}>
              <input type="hidden" name="intent" value="enviar" />
              <button type="submit" className="pn-btn-sm mint" disabled={enviando}>
                <Send size={14} /> {enviando ? "…" : "Enviar"}
              </button>
            </Form>
          ) : null}
          {podeReceber ? (
            <Link to="?receber=1" className="pn-btn-sm mint" preventScrollReset>
              <CheckCircle2 size={14} /> Receber
            </Link>
          ) : null}
        </div>
      </div>

      <div className="pn-card pn-table-wrap">
        <table className="pn-table">
          <thead>
            <tr>
              <th>Produto / SKU</th>
              <th>Qtd</th>
              <th>Recebida</th>
              <th>Custo unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {pedido.itens.map((it) => (
              <tr key={it.id}>
                <td>
                  <strong>{it.variacao?.produto?.nome ?? "—"}</strong>
                  <span className="pn-list-meta">SKU: {it.variacao?.sku ?? "—"}</span>
                </td>
                <td>{it.qtd}</td>
                <td>
                  {it.qtd_recebida}
                  {it.qtd_recebida < it.qtd ? <span className="pn-list-meta">faltam {it.qtd - it.qtd_recebida}</span> : null}
                </td>
                <td>{formatBRL(Number(it.custo_unit))}</td>
                <td>{formatBRL(Number(it.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pn-totais">
          <div>
            Subtotal: <strong>{formatBRL(Number(pedido.subtotal))}</strong>
          </div>
          <div>
            Frete: <strong>{formatBRL(Number(pedido.frete))}</strong>
          </div>
          <div>
            Desconto: <strong>{formatBRL(Number(pedido.desconto))}</strong>
          </div>
          <div>
            Total: <strong>{formatBRL(Number(pedido.total))}</strong>
          </div>
        </div>
      </div>

      {pedido.observacoes ? (
        <div className="pn-card">
          <h3>Observações</h3>
          <p>{pedido.observacoes}</p>
        </div>
      ) : null}

      {podeCancelar ? (
        <div className="pn-card">
          <Form method="post" replace>
            <input type="hidden" name="intent" value="cancelar" />
            <button type="submit" className="pn-btn-sm danger" disabled={enviando}>
              <XCircle size={14} /> Cancelar pedido
            </button>
          </Form>
        </div>
      ) : null}

      {receberAberto ? (
        <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="pn-drawer">
            <div className="pn-drawer-head">
              <h3>Receber pedido</h3>
              <Link to={`/painel/compras/${pedido.id}`} className="pn-btn-link" preventScrollReset>
                Fechar
              </Link>
            </div>
            <Form method="post" replace>
              <input type="hidden" name="intent" value="receber" />
              <input type="hidden" name="itens_json" value={itensJson} />
              <div className="pn-drawer-body">
                <div className="pn-field-row">
                  <div className="pn-field">
                    <label htmlFor="nota_fiscal">Nota fiscal</label>
                    <input id="nota_fiscal" name="nota_fiscal" />
                  </div>
                  <div className="pn-field">
                    <label htmlFor="data">Data</label>
                    <input id="data" name="data" type="date" />
                  </div>
                </div>
                <table className="pn-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Pendente</th>
                      <th>Receber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.itens.map((it) => {
                      const pendente = it.qtd - it.qtd_recebida;
                      return (
                        <tr key={it.id}>
                          <td>{it.variacao?.sku ?? it.id}</td>
                          <td>{pendente}</td>
                          <td style={{ width: 100 }}>
                            <input
                              type="number"
                              min={0}
                              max={pendente}
                              value={recebimentos[it.id] ?? "0"}
                              onChange={(e) =>
                                setRecebimentos((prev) => ({ ...prev, [it.id]: e.target.value }))
                              }
                              disabled={pendente === 0}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="pn-field">
                  <label htmlFor="observacoes">Observações</label>
                  <textarea id="observacoes" name="observacoes" rows={2} />
                </div>
                {actionData && "erro" in actionData && actionData.erro ? (
                  <p className="pn-form-err">{actionData.erro}</p>
                ) : null}
              </div>
              <div className="pn-drawer-foot">
                <Link to={`/painel/compras/${pedido.id}`} className="pn-btn-sm" preventScrollReset>
                  Cancelar
                </Link>
                <button type="submit" className="pn-btn-sm mint" disabled={enviando}>
                  {enviando ? "Recebendo…" : "Confirmar recebimento"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
