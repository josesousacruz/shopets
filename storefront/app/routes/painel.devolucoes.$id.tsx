import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import { ArrowLeft } from "lucide-react";
import { useActionFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { confirmAcao, confirmDestrutivo, Swal } from "~/lib/painel-swal";
import { painel, PainelValidationError } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";
import { DEVOLUCAO_LABEL } from "~/lib/pedido";

export const meta: MetaFunction = ({ params }) => [
  { title: `Devolução #${params.id} — Painel Shopets` },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const res = await painel.devolucoes.show(token, params.id!);
  return json({ devolucao: res.data });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const id = params.id!;
  const form = await request.formData();
  const acao = String(form.get("_acao") ?? "");

  try {
    switch (acao) {
      case "aprovar":
        await painel.devolucoes.aprovar(token, id);
        break;
      case "rejeitar":
        await painel.devolucoes.rejeitar(token, id, String(form.get("observacao_admin") ?? ""));
        break;
      case "receber":
        await painel.devolucoes.receber(token, id);
        break;
      case "reembolsar":
        await painel.devolucoes.reembolsar(token, id);
        break;
      default:
        return json({ erro: "Ação inválida." }, { status: 400 });
    }
    return json({ ok: acao, mensagem: mensagemAcao(acao) });
  } catch (err) {
    if (err instanceof PainelValidationError) {
      return json({ erro: err.message }, { status: err.status === 422 ? 422 : 400 });
    }
    throw err;
  }
}

function mensagemAcao(acao: string): string {
  switch (acao) {
    case "aprovar": return "Devolução aprovada.";
    case "rejeitar": return "Devolução rejeitada.";
    case "receber": return "Devolução marcada como recebida.";
    case "reembolsar": return "Reembolso solicitado.";
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

export default function DevolucaoDetalhe() {
  const { devolucao: d } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const submit = useSubmit();
  const busy = nav.state !== "idle";
  useActionFeedback(actionData);

  const transitar = async (
    acao: "aprovar" | "rejeitar" | "receber" | "reembolsar",
    confirmTitulo?: string,
    confirmMensagem?: string,
    pedirObs?: boolean,
  ) => {
    if (confirmTitulo) {
      const ok =
        acao === "rejeitar"
          ? await confirmDestrutivo({
              titulo: confirmTitulo,
              mensagem: confirmMensagem,
              confirmar: "Rejeitar",
            })
          : await confirmAcao({ titulo: confirmTitulo, mensagem: confirmMensagem });
      if (!ok) return;
    }
    let observacao = "";
    if (pedirObs) {
      const r = await Swal.fire({
        title: "Observação interna (opcional)",
        input: "textarea",
        inputPlaceholder: "Motivo da rejeição, contato com o cliente, etc.",
        showCancelButton: true,
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar",
      });
      if (!r.isConfirmed) return;
      observacao = String(r.value ?? "");
    }
    const fd = new FormData();
    fd.set("_acao", acao);
    if (pedirObs) fd.set("observacao_admin", observacao);
    submit(fd, { method: "post", replace: true });
  };

  // Máquina de estados (espelha o backend).
  const podeAprovar = d.status === "solicitada";
  const podeRejeitar = d.status === "solicitada" || d.status === "aprovada";
  const podeReceber = d.status === "aprovada";
  const podeReembolsar = d.status === "recebida";
  const finalizada = d.status === "reembolsada" || d.status === "rejeitada";

  return (
    <div>
      <div className="pn-head">
        <div>
          <Link to="/painel/devolucoes" className="pn-btn-sm ghost" style={{ marginBottom: 10 }}>
            <ArrowLeft size={15} /> Devoluções
          </Link>
          <h1>Devolução #{d.id}</h1>
          <p>
            <span className={`pn-chip st-${d.status}`}>
              {DEVOLUCAO_LABEL[d.status] ?? d.status}
            </span>{" "}
            · {fmtDataHora(d.criado_em)}
          </p>
        </div>
      </div>

      {actionData && "erro" in actionData && actionData.erro && (
        <div className="ct-alert ct-alert--err" role="alert" style={{ marginBottom: 18 }}>
          {actionData.erro}
        </div>
      )}

      {/* Transições */}
      <div className="pn-card" style={{ marginBottom: 18 }}>
        <h2>Ações</h2>
        <p className="card-sub">Avance a devolução no fluxo de pós-venda.</p>
        {finalizada ? (
          <p className="card-sub" style={{ marginTop: 8 }}>
            Esta devolução já foi finalizada — nenhuma ação adicional disponível.
          </p>
        ) : (
          <div className="pn-actions-bar">
            <button
              type="button"
              className="pn-btn-sm mint"
              disabled={!podeAprovar || busy}
              onClick={() => transitar("aprovar")}
            >
              {busy ? "Processando..." : "Aprovar"}
            </button>

            <button
              type="button"
              className="pn-btn-sm ink"
              disabled={!podeReceber || busy}
              onClick={() => transitar("receber")}
            >
              {busy ? "Processando..." : "Marcar recebida"}
            </button>

            <button
              type="button"
              className="pn-btn-sm mint"
              disabled={!podeReembolsar || busy}
              onClick={() =>
                transitar(
                  "reembolsar",
                  "Reembolsar esta devolução?",
                  "O estorno será solicitado ao gateway de pagamento.",
                )
              }
            >
              {busy ? "Processando..." : "Reembolsar"}
            </button>

            <button
              type="button"
              className="pn-btn-sm danger"
              disabled={!podeRejeitar || busy}
              onClick={() =>
                transitar(
                  "rejeitar",
                  "Rejeitar esta devolução?",
                  "O cliente será notificado.",
                  true,
                )
              }
            >
              {busy ? "Processando..." : "Rejeitar"}
            </button>
          </div>
        )}
      </div>

      <div className="pn-grid-2">
        <div>
          {/* Itens devolvidos */}
          <div className="pn-card">
            <h2>Itens devolvidos</h2>
            <div className="pn-table-wrap" style={{ marginTop: 8 }}>
              <table className="pn-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {d.itens.map((i) => (
                    <tr key={i.id_pedido_item}>
                      <td>{i.nome ?? `Item #${i.id_pedido_item}`}</td>
                      <td>{i.quantidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Motivo */}
          <div className="pn-card">
            <h2>Motivo do cliente</h2>
            <p style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>
              {d.motivo}
            </p>
            {d.observacao_admin && (
              <>
                <h2 style={{ marginTop: 16 }}>Observação interna</h2>
                <p style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>
                  {d.observacao_admin}
                </p>
              </>
            )}
          </div>
        </div>

        <div>
          {/* Resumo */}
          <div className="pn-card">
            <h2>Resumo</h2>
            <dl className="pn-dl">
              <dt>Pedido</dt>
              <dd>
                {d.pedido ? (
                  <Link to={`/painel/pedidos/${d.pedido}`} className="row-link">
                    {d.pedido}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
              <dt>Cliente</dt>
              <dd>{d.cliente ?? "—"}</dd>
              <dt>Status</dt>
              <dd>
                <span className={`pn-chip st-${d.status}`}>
                  {DEVOLUCAO_LABEL[d.status] ?? d.status}
                </span>
              </dd>
              <dt>Reembolso</dt>
              <dd>{d.valor_reembolso != null ? formatBRL(d.valor_reembolso) : "—"}</dd>
              <dt>Solicitada em</dt>
              <dd>{fmtDataHora(d.criado_em)}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
