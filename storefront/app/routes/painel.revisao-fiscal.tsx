import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useActionData, useLoaderData, useNavigation, useSearchParams, useSubmit } from "@remix-run/react";
import { useActionFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";

export const meta: MetaFunction = () => [{ title: "Revisão fiscal — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");

  const res = await painel.revisaoFiscal.list(token, page);
  return json({ pedidos: res.data, meta: res.meta });
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const form = await request.formData();
  const numero = String(form.get("numero") ?? "");

  const res = await painel.revisaoFiscal.reemitir(token, numero);

  return json({
    ok: res.data.resolvido,
    mensagem: res.data.resolvido
      ? `Nota fiscal emitida para ${res.data.numero}.`
      : `${res.data.numero} continua em revisão — veja o motivo atualizado na lista.`,
  });
}

function fmtDataHora(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function RevisaoFiscal() {
  const { pedidos, meta } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [params] = useSearchParams();
  const submit = useSubmit();
  const nav = useNavigation();
  const busy = nav.state !== "idle";
  useActionFeedback(actionData);

  const reemitir = (numero: string) => {
    const fd = new FormData();
    fd.set("numero", numero);
    submit(fd, { method: "post", replace: true });
  };

  const goPage = (p: number) => {
    const q = new URLSearchParams(params);
    q.set("page", String(p));
    return `?${q}`;
  };

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Fiscal</span>
          <h1>Revisão fiscal</h1>
          <p>
            {meta.total} pedido(s) com emissão de NF-e/NFC-e pendente. O pagamento e a venda já
            aconteceram — só a nota fiscal falhou e precisa de ação.
          </p>
        </div>
      </div>

      {pedidos.length === 0 ? (
        <div className="pn-table-wrap">
          <div className="pn-empty">Nenhum pedido pendente de revisão fiscal.</div>
        </div>
      ) : (
        <div className="pn-table-wrap">
          <table className="pn-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Modalidade</th>
                <th>Total</th>
                <th>Motivo</th>
                <th>Atualizado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.numero}>
                  <td>
                    <Link to={`/painel/pedidos/${p.numero}`} className="row-link">
                      {p.numero}
                    </Link>
                  </td>
                  <td>{p.cliente}</td>
                  <td>{p.modalidade === "retirada" ? "Retirada (NFC-e)" : "Entrega (NF-e)"}</td>
                  <td>{formatBRL(p.total)}</td>
                  <td style={{ maxWidth: 320, fontSize: 13, color: "var(--muted)" }}>{p.motivo ?? "—"}</td>
                  <td>{fmtDataHora(p.atualizado_em)}</td>
                  <td>
                    <button type="button" className="pn-btn-sm mint" onClick={() => reemitir(p.numero)} disabled={busy}>
                      {busy ? "Reemitindo…" : "Reemitir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.last_page > 1 && (
        <div className="pn-pager">
          <span>
            Página {meta.current_page} de {meta.last_page}
          </span>
          <div className="nav">
            {meta.current_page > 1 && (
              <Link to={goPage(meta.current_page - 1)} className="pn-btn-sm ghost">
                Anterior
              </Link>
            )}
            {meta.current_page < meta.last_page && (
              <Link to={goPage(meta.current_page + 1)} className="pn-btn-sm ghost">
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
