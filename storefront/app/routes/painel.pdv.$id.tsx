import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { StatusBadge } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import type { SaldoEstoqueRow } from "~/lib/painel.server";
import { painel, PainelValidationError } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Ponto de Venda — Painel Shopets" }];

export async function loader({ request: req, params }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const id = params.id!;
  const [pdvRes, depRes, usersRes] = await Promise.all([
    painel.pdv.show(token, id),
    painel.estoque.depositos(token),
    painel.pdv.usuariosDisponiveis(token),
  ]);

  let saldos: SaldoEstoqueRow[] = [];
  if (pdvRes.data.deposito_id) {
    saldos = (await painel.estoque.list(token, { deposito_id: pdvRes.data.deposito_id })).data;
  }

  return json({ pdv: pdvRes.data, depositos: depRes.data, usuarios: usersRes.data, saldos });
}

export async function action({ request: req, params }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const intent = String(fd.get("intent") ?? "");
  const id = params.id!;

  try {
    if (intent === "dados") {
      await painel.pdv.update(token, id, {
        nome_pdv: String(fd.get("nome_pdv")),
        endereco: String(fd.get("endereco") ?? "") || null,
        responsavel: String(fd.get("responsavel") ?? "") || null,
        telefone: String(fd.get("telefone") ?? "") || null,
        deposito_id: fd.get("deposito_id") ? Number(fd.get("deposito_id")) : null,
        ativo: fd.get("ativo") === "1",
        permite_retirada: fd.get("permite_retirada") === "1",
      });
      return redirect(`/painel/pdv/${id}?aba=dados&feedback=editar`);
    }
    if (intent === "fiscal") {
      await painel.pdv.update(token, id, {
        serie_fiscal_default: String(fd.get("serie_fiscal_default") ?? "") || null,
        regime_tributario: String(fd.get("regime_tributario") ?? "") || null,
      });
      return redirect(`/painel/pdv/${id}?aba=fiscal&feedback=editar`);
    }
    if (intent === "operadores") {
      const ids = fd.getAll("user_ids").map((v) => Number(v));
      await painel.pdv.syncOperadores(token, id, ids);
      return redirect(`/painel/pdv/${id}?aba=operadores&feedback=editar`);
    }
    return json({ erro: "Operação desconhecida." }, { status: 400 });
  } catch (e) {
    if (e instanceof PainelValidationError) return json({ erro: e.message }, { status: e.status });
    return json({ erro: "Falha ao salvar." }, { status: 500 });
  }
}

export default function PdvDetalhe() {
  const { pdv, depositos, usuarios, saldos } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  const aba = searchParams.get("aba") ?? "dados";
  const operadoresAtuais = new Set(pdv.users.map((u) => u.id));

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Ponto de Venda</span>
          <h1>{pdv.nome_pdv} <StatusBadge tone={pdv.ativo ? "ok" : "muted"}>{pdv.ativo ? "Ativo" : "Inativo"}</StatusBadge></h1>
          <p>{pdv.deposito?.nome ? `Depósito: ${pdv.deposito.nome}` : "Sem depósito vinculado"}</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/pdv" className="pn-btn-sm">Voltar</Link>
        </div>
      </div>

      <div className="pn-tabs">
        <Link to="?aba=dados" className={aba === "dados" ? "active" : ""}>Dados</Link>
        <Link to="?aba=estoque" className={aba === "estoque" ? "active" : ""}>Estoque</Link>
        <Link to="?aba=operadores" className={aba === "operadores" ? "active" : ""}>Operadores</Link>
        <Link to="?aba=fiscal" className={aba === "fiscal" ? "active" : ""}>Fiscal</Link>
      </div>

      {aba === "dados" ? (
        <div className="pn-card">
          <Form method="post" replace>
            <input type="hidden" name="intent" value="dados" />
            <div className="pn-field"><label htmlFor="nome_pdv">Nome *</label><input id="nome_pdv" name="nome_pdv" required defaultValue={pdv.nome_pdv} /></div>
            <div className="pn-field-row">
              <div className="pn-field"><label htmlFor="responsavel">Responsável</label><input id="responsavel" name="responsavel" defaultValue={pdv.responsavel ?? ""} /></div>
              <div className="pn-field"><label htmlFor="telefone">Telefone</label><input id="telefone" name="telefone" defaultValue={pdv.telefone ?? ""} /></div>
            </div>
            <div className="pn-field"><label htmlFor="endereco">Endereço</label><input id="endereco" name="endereco" defaultValue={pdv.endereco ?? ""} /></div>
            <div className="pn-field">
              <label htmlFor="deposito_id">Depósito vinculado</label>
              <select id="deposito_id" name="deposito_id" defaultValue={pdv.deposito_id ?? ""}>
                <option value="">—</option>
                {depositos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div className="pn-field-row">
              <label className="pn-check"><input type="checkbox" name="ativo" value="1" defaultChecked={pdv.ativo} /> Ativo</label>
              <label className="pn-check"><input type="checkbox" name="permite_retirada" value="1" defaultChecked={pdv.permite_retirada} /> Permite retirada</label>
            </div>
            <div className="pn-form-actions">
              <button type="submit" className="pn-btn-sm mint" disabled={enviando}>{enviando ? "Salvando…" : "Salvar"}</button>
            </div>
          </Form>
        </div>
      ) : null}

      {aba === "estoque" ? (
        <div className="pn-card pn-table-wrap">
          {!pdv.deposito_id ? (
            <p className="pn-list-meta">Vincule um depósito na aba Dados para ver o estoque.</p>
          ) : saldos.length === 0 ? (
            <p className="pn-list-meta">Sem saldos no depósito deste PDV.</p>
          ) : (
            <table className="pn-table">
              <thead><tr><th>Produto / SKU</th><th>Saldo</th><th>Reservado</th><th>Mínimo</th></tr></thead>
              <tbody>
                {saldos.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.variacao?.produto?.nome ?? "—"}</strong><span className="pn-list-meta">SKU: {s.variacao?.sku ?? "—"}</span></td>
                    <td>{s.saldo}</td>
                    <td>{s.reservado}</td>
                    <td>{s.minimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {aba === "operadores" ? (
        <div className="pn-card">
          <Form method="post" replace>
            <input type="hidden" name="intent" value="operadores" />
            <div className="pn-operadores-list">
              {usuarios.map((u) => (
                <label className="pn-check" key={u.id}>
                  <input type="checkbox" name="user_ids" value={u.id} defaultChecked={operadoresAtuais.has(u.id)} />
                  {u.name} <span className="pn-list-meta">{u.email}</span>
                </label>
              ))}
            </div>
            <div className="pn-form-actions">
              <button type="submit" className="pn-btn-sm mint" disabled={enviando}>{enviando ? "Salvando…" : "Salvar operadores"}</button>
            </div>
          </Form>
        </div>
      ) : null}

      {aba === "fiscal" ? (
        <div className="pn-card">
          <Form method="post" replace>
            <input type="hidden" name="intent" value="fiscal" />
            <div className="pn-field-row">
              <div className="pn-field">
                <label htmlFor="serie_fiscal_default">Série fiscal padrão</label>
                <input id="serie_fiscal_default" name="serie_fiscal_default" defaultValue={pdv.serie_fiscal_default ?? ""} />
              </div>
              <div className="pn-field">
                <label htmlFor="regime_tributario">Regime tributário</label>
                <select id="regime_tributario" name="regime_tributario" defaultValue={pdv.regime_tributario ?? ""}>
                  <option value="">—</option>
                  <option value="simples_nacional">Simples Nacional</option>
                  <option value="lucro_presumido">Lucro Presumido</option>
                  <option value="lucro_real">Lucro Real</option>
                </select>
              </div>
            </div>
            <div className="pn-form-actions">
              <button type="submit" className="pn-btn-sm mint" disabled={enviando}>{enviando ? "Salvando…" : "Salvar"}</button>
            </div>
          </Form>
        </div>
      ) : null}
    </div>
  );
}
