import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { ArrowLeft, Mail, Tag as TagIcon, Trash2 } from "lucide-react";
import { Link } from "@remix-run/react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Cliente — Painel" }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const id = params.id!;
  const detalhe = await painel.clientes.show(token, id);
  let tagsDisponiveis: { id: number; nome: string; cor: string }[] = [];
  try { tagsDisponiveis = (await painel.clientes.tags.list(token)).data; } catch { /* opcional */ }
  return json({ ...detalhe.data, tagsDisponiveis });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const id = params.id!;
  const fd = await request.formData();
  const intent = fd.get("intent");

  switch (intent) {
    case "update":
      await painel.clientes.update(token, id, {
        nome: fd.get("nome"),
        email: fd.get("email"),
        cpf_cnpj: fd.get("cpf_cnpj") || null,
        telefone: fd.get("telefone") || null,
        tipo_pessoa: fd.get("tipo_pessoa") || "fisica",
        aceita_marketing: fd.get("aceita_marketing") === "1",
        ativo: fd.get("ativo") === "1",
      });
      return json({ ok: true });
    case "toggle":
      await painel.clientes.toggle(token, id);
      return json({ ok: true });
    case "add_nota":
      await painel.clientes.addNota(token, id, String(fd.get("texto") ?? ""));
      return json({ ok: true });
    case "del_nota":
      await painel.clientes.removeNota(token, id, String(fd.get("nota_id")));
      return json({ ok: true });
    case "sync_tags":
      await painel.clientes.syncTags(
        token,
        id,
        fd.getAll("tag_ids").map((v) => Number(v)),
      );
      return json({ ok: true });
    default:
      return json({ error: "intent inválido" }, { status: 400 });
  }
}

const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ClienteDetalhe() {
  const { cliente, metricas, tagsDisponiveis } = useLoaderData<typeof loader>();
  const [tab, setTab] = useState<"dados" | "pedidos" | "notas" | "tags">("dados");
  const nav = useNavigation();
  const saving = nav.state === "submitting";

  return (
    <div>
      <div className="pn-head">
        <div>
          <Link to="/painel/clientes" className="pn-back-link"><ArrowLeft size={14} /> Clientes</Link>
          <h1>{cliente.nome}</h1>
          <p>{cliente.email}{cliente.cpf_cnpj && ` · ${cliente.cpf_cnpj}`}</p>
        </div>
        <Form method="post">
          <input type="hidden" name="intent" value="toggle" />
          <button className={`pn-btn-sm ${cliente.ativo ? "ghost" : "mint"}`}>
            {cliente.ativo ? "Desativar" : "Reativar"}
          </button>
        </Form>
      </div>

      <div className="pn-grid-4" style={{ marginBottom: 18 }}>
        <div className="pn-kpi"><span>Total gasto</span><strong>{money(metricas.total_gasto)}</strong></div>
        <div className="pn-kpi"><span>Pedidos</span><strong>{metricas.qtd_pedidos}</strong></div>
        <div className="pn-kpi"><span>Ticket médio</span><strong>{money(metricas.ticket_medio)}</strong></div>
        <div className="pn-kpi">
          <span>Última compra</span>
          <strong>{metricas.ultima_compra ? new Date(metricas.ultima_compra).toLocaleDateString("pt-BR") : "—"}</strong>
        </div>
      </div>

      <div className="pn-tabs">
        <button type="button" className={tab === "dados" ? "active" : ""} onClick={() => setTab("dados")}>Dados</button>
        <button type="button" className={tab === "pedidos" ? "active" : ""} onClick={() => setTab("pedidos")}>Pedidos</button>
        <button type="button" className={tab === "tags" ? "active" : ""} onClick={() => setTab("tags")}>Tags</button>
        <button type="button" className={tab === "notas" ? "active" : ""} onClick={() => setTab("notas")}>Notas</button>
      </div>

      {tab === "dados" && (
        <Form method="post" className="pn-form-grid">
          <input type="hidden" name="intent" value="update" />
          <div className="pn-card">
            <h2>Identificação</h2>
            <div className="ct-field">
              <label>Nome</label>
              <input name="nome" defaultValue={cliente.nome} required />
            </div>
            <div className="ct-row">
              <div className="ct-field">
                <label>E-mail</label>
                <input type="email" name="email" defaultValue={cliente.email} required />
              </div>
              <div className="ct-field">
                <label>Telefone</label>
                <input name="telefone" defaultValue={cliente.telefone ?? ""} />
              </div>
            </div>
            <div className="ct-row">
              <div className="ct-field">
                <label>CPF/CNPJ</label>
                <input name="cpf_cnpj" defaultValue={cliente.cpf_cnpj ?? ""} />
              </div>
              <div className="ct-field">
                <label>Tipo</label>
                <select name="tipo_pessoa" defaultValue={cliente.tipo_pessoa ?? "fisica"}>
                  <option value="fisica">Pessoa Física</option>
                  <option value="juridica">Pessoa Jurídica</option>
                </select>
              </div>
            </div>
            <label className="pn-check">
              <input type="checkbox" name="aceita_marketing" value="1" defaultChecked={cliente.aceita_marketing} />
              Aceita marketing
            </label>
            <label className="pn-check">
              <input type="checkbox" name="ativo" value="1" defaultChecked={cliente.ativo} />
              Ativo
            </label>
          </div>
          <div className="pn-actions-bar">
            <button className="pn-btn-sm mint" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        </Form>
      )}

      {tab === "pedidos" && (
        <div className="pn-card">
          <p className="card-sub">Lista de pedidos detalhada em uma próxima entrega — veja métricas acima.</p>
        </div>
      )}

      {tab === "tags" && (
        <Form method="post" className="pn-card">
          <input type="hidden" name="intent" value="sync_tags" />
          <h2><TagIcon size={14} /> Tags</h2>
          <p className="card-sub">Marque as tags aplicáveis a este cliente.</p>
          <div className="pn-chips-list">
            {tagsDisponiveis.length === 0 && <span className="card-sub">Nenhuma tag cadastrada.</span>}
            {tagsDisponiveis.map((t) => (
              <label key={t.id} className="pn-chip-check">
                <input
                  type="checkbox"
                  name="tag_ids"
                  value={t.id}
                  defaultChecked={cliente.tags.some((ct: { id: number }) => ct.id === t.id)}
                />
                <span style={{ borderColor: t.cor, color: t.cor }}>{t.nome}</span>
              </label>
            ))}
          </div>
          <div className="pn-actions-bar">
            <button className="pn-btn-sm mint" disabled={saving}>Salvar tags</button>
          </div>
        </Form>
      )}

      {tab === "notas" && (
        <div>
          <Form method="post" className="pn-card">
            <input type="hidden" name="intent" value="add_nota" />
            <h2>Nova nota</h2>
            <div className="ct-field">
              <textarea name="texto" rows={3} required maxLength={2000} placeholder="Anotação interna…" />
            </div>
            <div className="pn-actions-bar">
              <button className="pn-btn-sm mint" disabled={saving}>Adicionar</button>
            </div>
          </Form>

          <div className="pn-card pn-list">
            {cliente.notas.length === 0 && <p className="card-sub">Sem notas ainda.</p>}
            {cliente.notas.map((n: { id: number; texto: string; user?: { name: string } | null; created_at: string }) => (
              <div key={n.id} className="pn-list-row">
                <div>
                  <p style={{ margin: 0 }}>{n.texto}</p>
                  <span className="pn-list-meta">
                    {n.user?.name ?? "—"} · {new Date(n.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <Form method="post">
                  <input type="hidden" name="intent" value="del_nota" />
                  <input type="hidden" name="nota_id" value={n.id} />
                  <button className="icon-btn" title="Apagar nota"><Trash2 size={14} /></button>
                </Form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
