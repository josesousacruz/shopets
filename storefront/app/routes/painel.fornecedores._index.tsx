import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { Building2, Filter, Pencil, Plus, Truck } from "lucide-react";
import { EmptyState } from "~/components/painel/EmptyState";
import { KpiStrip } from "~/components/painel/KpiStrip";
import { StatusBadge } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { drawerShouldRevalidate } from "~/lib/drawer-revalidate";
import { painel, PainelValidationError } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Fornecedores — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);

  const lista = await painel.fornecedores.list(token, {
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined,
  });

  return json({ fornecedores: lista.data, meta: lista.meta });
}

/** Abrir/fechar o drawer (?novo/?editar) não refaz a listagem — abre instantâneo. */
export const shouldRevalidate = drawerShouldRevalidate(["novo", "editar"]);

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const intent = String(fd.get("intent") ?? "");

  const body = {
    nome: String(fd.get("nome") ?? "").trim(),
    cnpj: String(fd.get("cnpj") ?? "").trim() || null,
    email: String(fd.get("email") ?? "").trim() || null,
    telefone: String(fd.get("telefone") ?? "").trim() || null,
    contato_principal: String(fd.get("contato_principal") ?? "").trim() || null,
    prazo_medio_dias: fd.get("prazo_medio_dias") ? Number(fd.get("prazo_medio_dias")) : null,
    condicao_pagamento_padrao: String(fd.get("condicao_pagamento_padrao") ?? "").trim() || null,
    desconto_padrao: fd.get("desconto_padrao") ? Number(fd.get("desconto_padrao")) : 0,
    ativo: fd.get("ativo") === "1",
  };

  try {
    if (intent === "criar") {
      await painel.fornecedores.create(token, body);
    } else if (intent === "editar") {
      await painel.fornecedores.update(token, String(fd.get("id")), body);
    } else if (intent === "excluir") {
      await painel.fornecedores.destroy(token, String(fd.get("id")));
      return redirect("/painel/fornecedores?feedback=excluir");
    } else {
      return json({ erro: "Operação desconhecida." }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof PainelValidationError) {
      return json({ erro: e.message, errors: e.errors }, { status: e.status });
    }
    return json({ erro: "Falha ao salvar fornecedor." }, { status: 500 });
  }

  return redirect(`/painel/fornecedores?feedback=${intent === "criar" ? "criar" : "editar"}`);
}

export default function FornecedoresIndex() {
  const { fornecedores, meta } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  const ativos = fornecedores.filter((f) => f.ativo).length;
  // Estado do drawer derivado da URL no cliente: junto com shouldRevalidate,
  // abre no mesmo frame do clique usando a listagem já em memória.
  const editarId = searchParams.get("editar");
  const editando = editarId
    ? fornecedores.find((f) => String(f.id_fornecedor) === editarId) ?? null
    : null;
  const drawerAberto = editando || searchParams.get("novo") === "1";

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Operação</span>
          <h1>Fornecedores</h1>
          <p>{meta.total} fornecedor(es) cadastrado(s).</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/compras" className="pn-btn-sm" prefetch="intent">
            <Truck size={14} /> Pedidos de compra
          </Link>
          <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset>
            <Plus size={14} /> Novo fornecedor
          </Link>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "Total", value: meta.total, tone: "info" },
          { label: "Ativos", value: ativos, tone: "ok" },
          { label: "Inativos", value: meta.total - ativos, tone: ativos === meta.total ? "muted" : "warn" },
        ]}
      />

      <div className="pn-card pn-filters">
        <Form method="get" className="filters-row">
          <input name="q" defaultValue={searchParams.get("q") ?? ""} placeholder="Nome, CNPJ ou e-mail" />
          <select name="status" defaultValue={searchParams.get("status") ?? ""}>
            <option value="">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
          <button className="pn-btn-sm mint">
            <Filter size={14} /> Filtrar
          </button>
        </Form>
      </div>

      <div className="pn-card pn-table-wrap">
        {fornecedores.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhum fornecedor"
            description="Cadastre fornecedores para gerar pedidos de compra."
            cta={
              <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset>
                <Plus size={14} /> Novo fornecedor
              </Link>
            }
          />
        ) : (
          <table className="pn-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>CNPJ</th>
                <th>Contato</th>
                <th>Condição</th>
                <th>Produtos</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fornecedores.map((f) => (
                <tr key={f.id_fornecedor}>
                  <td>
                    <strong>{f.nome}</strong>
                    {f.email ? <span className="pn-list-meta">{f.email}</span> : null}
                  </td>
                  <td>{f.cnpj ?? "—"}</td>
                  <td>{f.contato_principal ?? f.telefone ?? "—"}</td>
                  <td>{f.condicao_pagamento_padrao ?? "—"}</td>
                  <td>{f.produtos_count ?? 0}</td>
                  <td>
                    <StatusBadge tone={f.ativo ? "ok" : "muted"}>{f.ativo ? "Ativo" : "Inativo"}</StatusBadge>
                  </td>
                  <td className="pn-row-actions">
                    <Link to={`/painel/fornecedores/${f.id_fornecedor}`} className="pn-btn-link" prefetch="intent">
                      Abrir
                    </Link>
                    <Link to={`?editar=${f.id_fornecedor}`} className="pn-btn-link" preventScrollReset>
                      <Pencil size={12} /> Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {drawerAberto ? (
        <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="pn-drawer">
            <div className="pn-drawer-head">
              <h3>{editando ? "Editar fornecedor" : "Novo fornecedor"}</h3>
              <Link to="/painel/fornecedores" className="pn-btn-link" preventScrollReset>
                Fechar
              </Link>
            </div>
            <Form method="post" replace>
              <input type="hidden" name="intent" value={editando ? "editar" : "criar"} />
              {editando ? <input type="hidden" name="id" value={editando.id_fornecedor} /> : null}
              <div className="pn-drawer-body">
                <div className="pn-field">
                  <label htmlFor="nome">Nome *</label>
                  <input id="nome" name="nome" required defaultValue={editando?.nome ?? ""} autoFocus />
                </div>
                <div className="pn-field-row">
                  <div className="pn-field">
                    <label htmlFor="cnpj">CNPJ</label>
                    <input id="cnpj" name="cnpj" defaultValue={editando?.cnpj ?? ""} />
                  </div>
                  <div className="pn-field">
                    <label htmlFor="telefone">Telefone</label>
                    <input id="telefone" name="telefone" defaultValue={editando?.telefone ?? ""} />
                  </div>
                </div>
                <div className="pn-field-row">
                  <div className="pn-field">
                    <label htmlFor="email">E-mail</label>
                    <input id="email" name="email" type="email" defaultValue={editando?.email ?? ""} />
                  </div>
                  <div className="pn-field">
                    <label htmlFor="contato_principal">Contato</label>
                    <input id="contato_principal" name="contato_principal" defaultValue={editando?.contato_principal ?? ""} />
                  </div>
                </div>
                <div className="pn-field-row">
                  <div className="pn-field">
                    <label htmlFor="prazo_medio_dias">Prazo médio (dias)</label>
                    <input id="prazo_medio_dias" name="prazo_medio_dias" type="number" min={0} defaultValue={editando?.prazo_medio_dias ?? ""} />
                  </div>
                  <div className="pn-field">
                    <label htmlFor="condicao_pagamento_padrao">Cond. pagamento (ex.: 30/60)</label>
                    <input id="condicao_pagamento_padrao" name="condicao_pagamento_padrao" defaultValue={editando?.condicao_pagamento_padrao ?? ""} />
                  </div>
                </div>
                <div className="pn-field-row">
                  <div className="pn-field">
                    <label htmlFor="desconto_padrao">Desconto padrão (%)</label>
                    <input id="desconto_padrao" name="desconto_padrao" type="number" step="0.01" min={0} max={100} defaultValue={editando?.desconto_padrao ?? ""} />
                  </div>
                  <div className="pn-field">
                    <label className="pn-check" htmlFor="ativo">
                      <input id="ativo" type="checkbox" name="ativo" value="1" defaultChecked={editando ? editando.ativo : true} /> Ativo
                    </label>
                  </div>
                </div>
              </div>
              <div className="pn-drawer-foot">
                <Link to="/painel/fornecedores" className="pn-btn-sm" preventScrollReset>
                  Cancelar
                </Link>
                <button type="submit" className="pn-btn-sm mint" disabled={enviando}>
                  {enviando ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
