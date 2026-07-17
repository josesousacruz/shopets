import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { CalendarClock, Download, Filter, Star } from "lucide-react";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { drawerShouldRevalidate } from "~/lib/drawer-revalidate";
import type { RelatorioDados } from "~/lib/painel.server";
import { exportRelatorio, painel, PainelValidationError } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Relatório — Painel Shopets" }];

const FILTRO_KEYS = ["de", "ate", "dias"];

function coletarFiltros(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of FILTRO_KEYS) {
    const v = url.searchParams.get(k);
    if (v) out[k] = v;
  }
  return out;
}

export async function loader({ request: req, params }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const slug = params.slug!;
  const url = new URL(req.url);
  const filtros = coletarFiltros(url);

  const exportFmt = url.searchParams.get("export");
  if (exportFmt) {
    const file = await exportRelatorio(token, slug, exportFmt, filtros);
    return new Response(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    });
  }

  const dados = await painel.relatorios.show(token, slug, filtros);
  return json({ dados, filtros });
}

/** Abrir/fechar o drawer ?agendar=1 não refaz o relatório — abre instantâneo. */
export const shouldRevalidate = drawerShouldRevalidate(["agendar"]);

export async function action({ request: req, params }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const intent = String(fd.get("intent") ?? "");
  const slug = params.slug!;
  const filtros = {
    de: String(fd.get("de") ?? "") || undefined,
    ate: String(fd.get("ate") ?? "") || undefined,
    dias: String(fd.get("dias") ?? "") || undefined,
  };

  try {
    if (intent === "favoritar") {
      await painel.relatorios.favoritar(token, { slug, nome: String(fd.get("nome")), filtros });
      return redirect(`/painel/relatorios/${slug}?feedback=criar`);
    }
    if (intent === "agendar") {
      await painel.relatorios.agendar(token, {
        slug,
        filtros,
        frequencia: String(fd.get("frequencia")),
        emails: String(fd.get("emails")),
        formato: String(fd.get("formato")),
      });
      return redirect(`/painel/relatorios/${slug}?feedback=criar`);
    }
    return json({ erro: "Operação desconhecida." }, { status: 400 });
  } catch (e) {
    if (e instanceof PainelValidationError) return json({ erro: e.message }, { status: e.status });
    return json({ erro: "Falha ao processar." }, { status: 500 });
  }
}

export default function RelatorioSlug() {
  const { dados, filtros } = useLoaderData() as { dados: RelatorioDados; filtros: Record<string, string> };
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  const { definicao, linhas, total } = dados;
  const colKeys = Object.keys(definicao.colunas);
  const qs = new URLSearchParams(filtros).toString();
  const agendarAberto = searchParams.get("agendar") === "1";

  function fmt(v: string | number): string {
    return typeof v === "number" ? v.toLocaleString("pt-BR", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2 }) : String(v);
  }

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Relatório · {definicao.grupo}</span>
          <h1>{definicao.nome}</h1>
          <p>{total} linha(s).</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/relatorios" className="pn-btn-sm" prefetch="intent">Voltar</Link>
          <a className="pn-btn-sm" href={`?${qs}${qs ? "&" : ""}export=csv`}><Download size={14} /> CSV</a>
          <a className="pn-btn-sm" href={`?${qs}${qs ? "&" : ""}export=pdf`}><Download size={14} /> PDF</a>
          <Link to={`?${qs}${qs ? "&" : ""}agendar=1`} className="pn-btn-sm" preventScrollReset><CalendarClock size={14} /> Agendar</Link>
        </div>
      </div>

      {definicao.filtros.length > 0 ? (
        <div className="pn-card pn-filters">
          <Form method="get" className="filters-row">
            {definicao.filtros.includes("de") ? (
              <label className="pn-inline-field">De <input type="date" name="de" defaultValue={filtros.de ?? ""} /></label>
            ) : null}
            {definicao.filtros.includes("ate") ? (
              <label className="pn-inline-field">Até <input type="date" name="ate" defaultValue={filtros.ate ?? ""} /></label>
            ) : null}
            {definicao.filtros.includes("dias") ? (
              <label className="pn-inline-field">Dias inativo <input type="number" name="dias" min={1} defaultValue={filtros.dias ?? "90"} /></label>
            ) : null}
            <button className="pn-btn-sm mint"><Filter size={14} /> Aplicar</button>
          </Form>
        </div>
      ) : null}

      <div className="pn-card">
        <Form method="post" replace className="filters-row">
          <input type="hidden" name="intent" value="favoritar" />
          {Object.entries(filtros).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <input name="nome" placeholder="Nome do favorito" defaultValue={definicao.nome} required />
          <button type="submit" className="pn-btn-sm" disabled={enviando}><Star size={14} /> Salvar favorito</button>
        </Form>
      </div>

      <div className="pn-card pn-table-wrap">
        <table className="pn-table">
          <thead>
            <tr>{colKeys.map((k) => <th key={k}>{definicao.colunas[k]}</th>)}</tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr><td colSpan={colKeys.length} className="pn-empty-row">Sem dados para o período/filtros.</td></tr>
            ) : (
              linhas.map((linha, i) => (
                <tr key={i}>{colKeys.map((k) => <td key={k}>{fmt(linha[k] ?? "")}</td>)}</tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {agendarAberto ? (
        <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="pn-drawer">
            <div className="pn-drawer-head">
              <h3>Agendar envio por e-mail</h3>
              <Link to={`/painel/relatorios/${definicao.slug}?${qs}`} className="pn-btn-link" preventScrollReset>Fechar</Link>
            </div>
            <Form method="post" replace>
              <input type="hidden" name="intent" value="agendar" />
              {Object.entries(filtros).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <div className="pn-drawer-body">
                <div className="pn-field">
                  <label htmlFor="emails">E-mails (separados por vírgula) *</label>
                  <input id="emails" name="emails" required placeholder="a@loja.com, b@loja.com" />
                </div>
                <div className="pn-field-row">
                  <div className="pn-field">
                    <label htmlFor="frequencia">Frequência</label>
                    <select id="frequencia" name="frequencia" defaultValue="mensal">
                      <option value="diaria">Diária</option>
                      <option value="semanal">Semanal</option>
                      <option value="mensal">Mensal</option>
                    </select>
                  </div>
                  <div className="pn-field">
                    <label htmlFor="formato">Formato</label>
                    <select id="formato" name="formato" defaultValue="csv">
                      <option value="csv">CSV</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="pn-drawer-foot">
                <Link to={`/painel/relatorios/${definicao.slug}?${qs}`} className="pn-btn-sm" preventScrollReset>Cancelar</Link>
                <button type="submit" className="pn-btn-sm mint" disabled={enviando}>{enviando ? "Agendando…" : "Agendar"}</button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
