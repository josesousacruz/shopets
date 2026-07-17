import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { Landmark, Upload } from "lucide-react";
import { EmptyState } from "~/components/painel/EmptyState";
import { StatusBadge } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { drawerShouldRevalidate } from "~/lib/drawer-revalidate";
import type { ConciliacaoSugestao, ExtratoLinha } from "~/lib/painel.server";
import { painel, PainelValidationError, uploadOfx } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";

export const meta: MetaFunction = () => [{ title: "Conciliação OFX — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);
  const contaId = url.searchParams.get("conta");
  const linhaId = url.searchParams.get("linha");

  const contas = await painel.financeiro.contasBancarias.list(token);

  let linhas: ExtratoLinha[] = [];
  let sugestoes: ConciliacaoSugestao[] = [];
  if (contaId) linhas = (await painel.financeiro.conciliacao.linhas(token, contaId)).data;
  if (linhaId) sugestoes = (await painel.financeiro.conciliacao.sugestoes(token, linhaId)).data;

  return json({ contas: contas.data, linhas, sugestoes, contaId, linhaId });
}

/**
 * `?conta` (filtro) e `?linha` (busca sugestões na API) precisam re-executar o
 * loader, então NÃO entram na lista. O helper ainda evita o refetch triplo
 * quando o useFlashFeedback limpa `?feedback=`/`?erro=` da URL.
 */
export const shouldRevalidate = drawerShouldRevalidate([]);

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const intent = String(fd.get("intent") ?? "");

  try {
    if (intent === "upload") {
      const contaId = String(fd.get("conta_bancaria_id"));
      const file = fd.get("arquivo");
      if (!(file instanceof File) || file.size === 0) {
        return json({ erro: "Selecione um arquivo OFX." }, { status: 422 });
      }
      await uploadOfx(token, contaId, file);
      return redirect(`/painel/financeiro/conciliacao?conta=${contaId}&feedback=importado`);
    }
    if (intent === "match") {
      const linha = String(fd.get("linha"));
      await painel.financeiro.conciliacao.aplicar(token, linha, {
        tipo: String(fd.get("tipo")),
        conta_id: Number(fd.get("conta_id")),
      });
      return redirect(`/painel/financeiro/conciliacao?conta=${fd.get("conta")}&feedback=conciliado`);
    }
    return json({ erro: "Operação desconhecida." }, { status: 400 });
  } catch (e) {
    if (e instanceof PainelValidationError) return json({ erro: e.message }, { status: e.status });
    return json({ erro: "Falha ao processar." }, { status: 500 });
  }
}

export default function Conciliacao() {
  const { contas, linhas, sugestoes, contaId, linhaId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Financeiro</span>
          <h1>Conciliação Bancária (OFX)</h1>
          <p>Importe o extrato e concilie com contas a pagar/receber.</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/financeiro" className="pn-btn-sm" prefetch="intent">Voltar</Link>
        </div>
      </div>

      <div className="pn-card">
        <Form method="get" className="filters-row">
          <select name="conta" defaultValue={contaId ?? ""}>
            <option value="" disabled>Selecione a conta…</option>
            {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button className="pn-btn-sm mint">Ver extrato</button>
        </Form>

        {contaId ? (
          <Form method="post" encType="multipart/form-data" className="filters-row" style={{ marginTop: 12 }}>
            <input type="hidden" name="intent" value="upload" />
            <input type="hidden" name="conta_bancaria_id" value={contaId} />
            <input type="file" name="arquivo" accept=".ofx" required />
            <button type="submit" className="pn-btn-sm" disabled={enviando}>
              <Upload size={14} /> {enviando ? "Importando…" : "Importar OFX"}
            </button>
          </Form>
        ) : null}
      </div>

      {contaId ? (
        <div className="pn-card pn-table-wrap">
          {linhas.length === 0 ? (
            <EmptyState icon={Landmark} title="Sem linhas de extrato" description="Importe um arquivo OFX para começar." />
          ) : (
            <table className="pn-table">
              <thead>
                <tr><th>Data</th><th>Memo</th><th>Valor</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.id}>
                    <td>{new Date(l.data).toLocaleDateString("pt-BR")}</td>
                    <td>{l.memo ?? "—"}</td>
                    <td>{formatBRL(l.valor)}</td>
                    <td><StatusBadge tone={l.conciliada ? "ok" : "warn"}>{l.conciliada ? "Conciliada" : "Pendente"}</StatusBadge></td>
                    <td className="pn-row-actions">
                      {!l.conciliada ? (
                        <Link to={`?conta=${contaId}&linha=${l.id}`} className="pn-btn-link" preventScrollReset>Conciliar</Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {linhaId ? (
        <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="pn-drawer">
            <div className="pn-drawer-head">
              <h3>Sugestões de conciliação</h3>
              <Link to={`/painel/financeiro/conciliacao?conta=${contaId}`} className="pn-btn-link" preventScrollReset>Fechar</Link>
            </div>
            <div className="pn-drawer-body">
              {sugestoes.length === 0 ? (
                <p className="pn-list-meta">Nenhum candidato encontrado (valor / data ±3 dias).</p>
              ) : (
                <table className="pn-table">
                  <thead><tr><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Vencimento</th><th></th></tr></thead>
                  <tbody>
                    {sugestoes.map((s) => (
                      <tr key={`${s.tipo}-${s.id}`}>
                        <td>{s.tipo === "pagar" ? "A pagar" : "A receber"}</td>
                        <td>{s.descricao}</td>
                        <td>{formatBRL(s.valor)}</td>
                        <td>{new Date(s.data_vencimento).toLocaleDateString("pt-BR")}</td>
                        <td className="pn-row-actions">
                          <Form method="post" replace style={{ display: "inline" }}>
                            <input type="hidden" name="intent" value="match" />
                            <input type="hidden" name="conta" value={contaId ?? ""} />
                            <input type="hidden" name="linha" value={linhaId} />
                            <input type="hidden" name="tipo" value={s.tipo} />
                            <input type="hidden" name="conta_id" value={s.id} />
                            <button type="submit" className="pn-btn-sm mint" disabled={enviando}>Conciliar</button>
                          </Form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="pn-drawer-foot">
              <Link to={`/painel/financeiro/conciliacao?conta=${contaId}`} className="pn-btn-sm" preventScrollReset>Fechar</Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
