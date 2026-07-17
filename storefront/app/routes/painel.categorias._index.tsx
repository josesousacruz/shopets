import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
  useSubmit,
} from "@remix-run/react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Folder,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, type MouseEvent } from "react";
import { EmptyState } from "~/components/painel/EmptyState";
import { KpiStrip } from "~/components/painel/KpiStrip";
import { StatusBadge } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { drawerShouldRevalidate } from "~/lib/drawer-revalidate";
import { confirmDestrutivo } from "~/lib/painel-swal";
import { painel, PainelValidationError, type CategoriaAdmin } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Categorias — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const res = await painel.categorias.list(token);
  return json({ categorias: res.data });
}

/** Abrir/fechar o drawer (?novo/?editar) não refaz a listagem — abre instantâneo. */
export const shouldRevalidate = drawerShouldRevalidate(["novo", "editar"]);

function snapshotFromForm(form: FormData): {
  nome: string;
  ordem: number;
  visivel_ecommerce: boolean;
  id_categoria_pai: number | null;
  descricao_seo: string | null;
} | null {
  const raw = String(form.get("snapshot") ?? "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("_intent") ?? "");
  const url = new URL(request.url);
  const redirectTarget = url.pathname + url.search;

  const payload = () => ({
    nome: String(form.get("nome") ?? "").trim(),
    ordem: form.get("ordem") ? Number(form.get("ordem")) : 0,
    visivel_ecommerce: form.get("visivel_ecommerce") === "true",
    id_categoria_pai: form.get("id_categoria_pai") ? Number(form.get("id_categoria_pai")) : null,
    descricao_seo: String(form.get("descricao_seo") ?? "") || null,
  });

  try {
    if (intent === "create") {
      await painel.categorias.create(token, payload());
    } else if (intent === "update") {
      await painel.categorias.update(token, String(form.get("id")), payload());
    } else if (intent === "delete") {
      await painel.categorias.remove(token, String(form.get("id")));
    } else if (intent === "toggle") {
      const snap = snapshotFromForm(form);
      if (!snap) return json({ erro: "Snapshot ausente." }, { status: 400 });
      await painel.categorias.update(token, String(form.get("id")), {
        ...snap,
        visivel_ecommerce: !snap.visivel_ecommerce,
      });
    } else if (intent === "move") {
      const snap = snapshotFromForm(form);
      if (!snap) return json({ erro: "Snapshot ausente." }, { status: 400 });
      const delta = Number(form.get("delta") ?? 0);
      await painel.categorias.update(token, String(form.get("id")), {
        ...snap,
        ordem: Math.max(0, snap.ordem + delta),
      });
    } else {
      return json({ erro: "Ação inválida." }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof PainelValidationError) {
      return json({ erro: err.message, errors: err.errors, intent }, { status: 422 });
    }
    throw err;
  }

  const destino = intent === "create" || intent === "update" ? "/painel/categorias" : redirectTarget;
  const sep = destino.includes("?") ? "&" : "?";
  return redirect(`${destino}${sep}feedback=${intent}`);
}

function nivelDe(c: CategoriaAdmin, mapa: Map<number, CategoriaAdmin>): number {
  let nivel = 0;
  let atual: CategoriaAdmin | undefined = c;
  while (atual?.id_categoria_pai != null) {
    nivel += 1;
    atual = mapa.get(atual.id_categoria_pai);
    if (nivel > 6) break;
  }
  return nivel;
}

export default function CategoriasIndex() {
  const { categorias } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const submit = useSubmit();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const filtroStatus = searchParams.get("status") ?? "";
  // Estado do drawer derivado da URL no cliente: junto com shouldRevalidate,
  // abre no mesmo frame do clique usando a listagem já em memória.
  const abrindo = searchParams.get("novo") === "1";
  const editarId = searchParams.get("editar");
  const editando = editarId
    ? categorias.find((c) => String(c.id) === editarId) ?? null
    : null;

  const snapshotCategoria = (c: CategoriaAdmin) =>
    JSON.stringify({
      nome: c.nome,
      ordem: c.ordem,
      visivel_ecommerce: c.visivel_ecommerce,
      id_categoria_pai: c.id_categoria_pai,
      descricao_seo: c.descricao_seo,
    });

  const handleExcluir = async (e: MouseEvent<HTMLButtonElement>, c: CategoriaAdmin) => {
    e.preventDefault();
    const ok = await confirmDestrutivo({
      titulo: `Excluir "${c.nome}"?`,
      mensagem:
        (c.produtos_count ?? 0) > 0
          ? `Esta categoria está vinculada a ${c.produtos_count} produto(s). Eles ficarão sem categoria.`
          : "A categoria será removida permanentemente.",
      confirmar: "Excluir",
    });
    if (!ok) return;
    const fd = new FormData();
    fd.set("_intent", "delete");
    fd.set("id", String(c.id));
    submit(fd, { method: "post", replace: true });
  };

  const mapa = useMemo(
    () => new Map(categorias.map((c) => [c.id, c] as const)),
    [categorias],
  );

  const visiveis = categorias.filter(
    (c) =>
      (!q || c.nome.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)) &&
      (filtroStatus === ""
        ? true
        : filtroStatus === "visivel"
          ? c.visivel_ecommerce
          : !c.visivel_ecommerce),
  );

  const totalProdutos = categorias.reduce((sum, c) => sum + (c.produtos_count ?? 0), 0);
  const ocultas = categorias.filter((c) => !c.visivel_ecommerce).length;
  const semProdutos = categorias.filter((c) => (c.produtos_count ?? 0) === 0).length;

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Organização</span>
          <h1>Categorias</h1>
          <p>Organize seu catálogo em até 6 níveis. O slug é gerado automaticamente.</p>
        </div>
        <div className="pn-head-actions">
          <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset>
            <Plus size={14} /> Nova categoria
          </Link>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "Total", value: categorias.length, tone: "info" },
          { label: "Visíveis na loja", value: categorias.length - ocultas, tone: "ok" },
          { label: "Ocultas", value: ocultas, tone: ocultas ? "warn" : "muted" },
          {
            label: "Sem produtos",
            value: semProdutos,
            tone: semProdutos ? "warn" : "muted",
            hint: `${totalProdutos} produto(s) vinculados no total`,
          },
        ]}
      />

      <Form method="get" className="pn-toolbar">
        <div className="pn-search">
          <Search size={14} />
          <input name="q" defaultValue={searchParams.get("q") ?? ""} placeholder="Buscar por nome ou slug..." />
        </div>
        <select name="status" defaultValue={filtroStatus}>
          <option value="">Todas</option>
          <option value="visivel">Visíveis</option>
          <option value="oculta">Ocultas</option>
        </select>
        <button className="pn-btn-sm">Filtrar</button>
      </Form>

      {actionData && "erro" in actionData && actionData.erro && (
        <div className="ct-alert ct-alert--err" role="alert" style={{ marginBottom: 14 }}>
          {actionData.erro}
        </div>
      )}

      {visiveis.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={categorias.length === 0 ? "Nenhuma categoria cadastrada" : "Nada por aqui"}
          description={
            categorias.length === 0
              ? "Crie sua primeira categoria para organizar o catálogo. Você pode aninhar até 6 níveis."
              : "Nenhuma categoria corresponde aos filtros atuais."
          }
          cta={
            categorias.length === 0 ? (
              <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset>
                <Plus size={14} /> Criar primeira categoria
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="pn-card pn-tree" style={{ padding: 0 }}>
          {visiveis.map((c) => {
            const nivel = nivelDe(c, mapa);
            return (
              <div key={c.id} className="pn-tree-row">
                <div className="name">
                  <span style={{ width: nivel * 18 }} aria-hidden />
                  {nivel > 0 ? <span className="branch">└</span> : <Folder size={14} />}
                  <span>{c.nome}</span>
                  <span style={{ fontSize: 11, color: "var(--pn-text-muted)" }}>/{c.slug}</span>
                </div>
                <div className="meta">
                  <span style={{ fontSize: 12, color: "var(--pn-text-muted)" }}>
                    {c.produtos_count ?? 0} produto{(c.produtos_count ?? 0) === 1 ? "" : "s"}
                  </span>
                  {c.visivel_ecommerce ? (
                    <StatusBadge tone="ok">Visível</StatusBadge>
                  ) : (
                    <StatusBadge tone="muted">Oculta</StatusBadge>
                  )}
                </div>
                <div className="actions">
                  <Form method="post" replace style={{ display: "inline" }}>
                    <input type="hidden" name="_intent" value="move" />
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="delta" value="-1" />
                    <input type="hidden" name="snapshot" value={snapshotCategoria(c)} />
                    <button
                      className="pn-icon-btn"
                      title="Subir"
                      disabled={c.ordem === 0 || enviando}
                    >
                      <ArrowUp size={14} />
                    </button>
                  </Form>
                  <Form method="post" replace style={{ display: "inline" }}>
                    <input type="hidden" name="_intent" value="move" />
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="delta" value="1" />
                    <input type="hidden" name="snapshot" value={snapshotCategoria(c)} />
                    <button className="pn-icon-btn" title="Descer" disabled={enviando}>
                      <ArrowDown size={14} />
                    </button>
                  </Form>
                  <Form method="post" replace style={{ display: "inline" }}>
                    <input type="hidden" name="_intent" value="toggle" />
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="snapshot" value={snapshotCategoria(c)} />
                    <button
                      className="pn-icon-btn"
                      title={c.visivel_ecommerce ? "Ocultar da loja" : "Tornar visível"}
                      disabled={enviando}
                    >
                      {c.visivel_ecommerce ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </Form>
                  <Link
                    to={`?editar=${c.id}`}
                    className="pn-icon-btn"
                    title="Editar"
                    preventScrollReset
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    type="button"
                    className="pn-icon-btn danger"
                    title="Excluir"
                    disabled={enviando}
                    onClick={(e) => handleExcluir(e, c)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(abrindo || editando) ? (
        <DrawerCategoria
          editando={editando}
          categorias={categorias}
          erros={
            actionData && "errors" in actionData
              ? (actionData.errors as Record<string, string[]> | undefined) ?? null
              : null
          }
        />
      ) : null}
    </div>
  );
}

function DrawerCategoria({
  editando,
  categorias,
  erros,
}: {
  editando: CategoriaAdmin | null;
  categorias: CategoriaAdmin[];
  erros: Record<string, string[]> | null | undefined;
}) {
  return (
    <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
      <div className="pn-drawer">
        <div className="pn-drawer-head">
          <h3>{editando ? "Editar categoria" : "Nova categoria"}</h3>
          <Link to="/painel/categorias" className="pn-btn-link" preventScrollReset>
            Fechar
          </Link>
        </div>
        <Form method="post" replace>
          <input type="hidden" name="_intent" value={editando ? "update" : "create"} />
          {editando ? <input type="hidden" name="id" value={editando.id} /> : null}
          <div className="pn-drawer-body">
            <div className="pn-field">
              <label htmlFor="nome">Nome *</label>
              <input
                id="nome"
                name="nome"
                required
                maxLength={255}
                defaultValue={editando?.nome ?? ""}
                autoFocus
              />
              {erros?.nome ? <p className="pn-form-err">{erros.nome[0]}</p> : null}
            </div>
            <div className="pn-field">
              <label htmlFor="id_categoria_pai">Categoria pai</label>
              <select
                id="id_categoria_pai"
                name="id_categoria_pai"
                defaultValue={editando?.id_categoria_pai ?? ""}
              >
                <option value="">— nenhuma (raiz) —</option>
                {categorias
                  .filter((c) => !editando || c.id !== editando.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>
            </div>
            <div className="pn-field">
              <label htmlFor="ordem">Ordem de exibição</label>
              <input
                id="ordem"
                name="ordem"
                type="number"
                min={0}
                defaultValue={editando?.ordem ?? 0}
              />
            </div>
            <div className="pn-field">
              <label
                className="pn-switch"
                style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
              >
                <input
                  type="checkbox"
                  name="visivel_ecommerce"
                  value="true"
                  defaultChecked={editando ? editando.visivel_ecommerce : true}
                />
                <span className="track" />
                <span style={{ fontSize: 13 }}>Visível na loja</span>
              </label>
            </div>
            <div className="pn-field">
              <label htmlFor="descricao_seo">Meta descrição (SEO)</label>
              <textarea
                id="descricao_seo"
                name="descricao_seo"
                rows={3}
                maxLength={500}
                defaultValue={editando?.descricao_seo ?? ""}
                placeholder="Texto que aparece no Google e nas redes ao compartilhar a categoria."
              />
            </div>
          </div>
          <DrawerFoot editando={!!editando} />
        </Form>
      </div>
    </div>
  );
}

function DrawerFoot({ editando }: { editando: boolean }) {
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  return (
    <div className="pn-drawer-foot">
      <Link to="/painel/categorias" className="pn-btn-sm">
        Cancelar
      </Link>
      <button className="pn-btn-sm mint" disabled={enviando}>
        {enviando ? "Salvando..." : editando ? "Salvar alterações" : "Criar categoria"}
      </button>
    </div>
  );
}
