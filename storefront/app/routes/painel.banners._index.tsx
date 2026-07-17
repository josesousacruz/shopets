import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import {
  json,
  redirect,
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
  useSubmit,
} from "@remix-run/react";
import type { MouseEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ExternalLink,
  Eye,
  EyeOff,
  ImageIcon,
  Link as LinkIcon,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { EmptyState } from "~/components/painel/EmptyState";
import { KpiStrip } from "~/components/painel/KpiStrip";
import { StatusBadge, type StatusTone } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { drawerShouldRevalidate } from "~/lib/drawer-revalidate";
import { confirmDestrutivo } from "~/lib/painel-swal";
import {
  painel,
  PainelValidationError,
  salvarBannerComUpload,
  type BannerAdmin,
} from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Banners — Painel Shopets" }];

type StatusBanner = "ativo" | "agendado" | "expirado" | "inativo";

function statusBanner(b: BannerAdmin, agora = new Date()): StatusBanner {
  if (!b.ativo) return "inativo";
  if (b.vigencia_de && new Date(b.vigencia_de) > agora) return "agendado";
  if (b.vigencia_ate && new Date(b.vigencia_ate) < agora) return "expirado";
  return "ativo";
}

const STATUS_TONE: Record<StatusBanner, StatusTone> = {
  ativo: "ok",
  agendado: "warn",
  expirado: "danger",
  inativo: "muted",
};
const STATUS_LABEL: Record<StatusBanner, string> = {
  ativo: "No ar",
  agendado: "Agendado",
  expirado: "Expirado",
  inativo: "Inativo",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const res = await painel.banners.list(token);
  return json({ banners: res.data });
}

/** Abrir/fechar o drawer (?novo/?editar) não refaz a listagem — abre instantâneo. */
export const shouldRevalidate = drawerShouldRevalidate(["novo", "editar"]);

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);

  const contentType = request.headers.get("Content-Type") ?? "";
  let form: FormData;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const uploadHandler = unstable_composeUploadHandlers(
      unstable_createMemoryUploadHandler({ maxPartSize: 8 * 1024 * 1024 }),
    );
    form = await unstable_parseMultipartFormData(request, uploadHandler);
    const f = form.get("imagem");
    if (f instanceof File && f.size > 0) file = f;
  } else {
    form = await request.formData();
  }

  const intent = String(form.get("_intent") ?? "");

  const campos = () => {
    const c: Record<string, string> = {
      titulo: String(form.get("titulo") ?? ""),
      ordem: String(form.get("ordem") ?? "0"),
      ativo: form.get("ativo") === "true" ? "1" : "0",
    };
    const sub = String(form.get("subtitulo") ?? "");
    if (sub) c.subtitulo = sub;
    const link = String(form.get("link") ?? "");
    if (link) c.link = link;
    const imgPath = String(form.get("imagem_path") ?? "");
    if (imgPath) c.imagem_path = imgPath;
    const de = String(form.get("vigencia_de") ?? "");
    if (de) c.vigencia_de = de;
    const ate = String(form.get("vigencia_ate") ?? "");
    if (ate) c.vigencia_ate = ate;
    return c;
  };

  const payloadJson = () => {
    const c = campos();
    return {
      titulo: c.titulo,
      subtitulo: c.subtitulo ?? null,
      imagem_path: c.imagem_path ?? null,
      link: c.link ?? null,
      ordem: Number(c.ordem) || 0,
      ativo: c.ativo === "1",
      vigencia_de: c.vigencia_de ?? null,
      vigencia_ate: c.vigencia_ate ?? null,
    };
  };

  try {
    if (intent === "create") {
      if (file) await salvarBannerComUpload(token, null, campos(), file);
      else await painel.banners.create(token, payloadJson());
    } else if (intent === "update") {
      const id = String(form.get("id"));
      if (file) await salvarBannerComUpload(token, id, campos(), file);
      else await painel.banners.update(token, id, payloadJson());
    } else if (intent === "delete") {
      await painel.banners.remove(token, String(form.get("id")));
    } else if (intent === "toggle") {
      const snap = parseSnapshotBanner(form);
      if (!snap) return json({ erro: "Snapshot ausente." }, { status: 400 });
      await painel.banners.update(token, String(form.get("id")), { ...snap, ativo: !snap.ativo });
    } else if (intent === "move") {
      const snap = parseSnapshotBanner(form);
      if (!snap) return json({ erro: "Snapshot ausente." }, { status: 400 });
      const delta = Number(form.get("delta") ?? 0);
      await painel.banners.update(token, String(form.get("id")), {
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

  const url = new URL(request.url);
  const destino = intent === "create" || intent === "update" ? "/painel/banners" : url.pathname + url.search;
  const sep = destino.includes("?") ? "&" : "?";
  return redirect(`${destino}${sep}feedback=${intent}`);
}

function parseSnapshotBanner(form: FormData): {
  titulo: string;
  subtitulo: string | null;
  imagem_path: string | null;
  link: string | null;
  ordem: number;
  ativo: boolean;
  vigencia_de: string | null;
  vigencia_ate: string | null;
} | null {
  const raw = String(form.get("snapshot") ?? "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function dataInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

export default function BannersIndex() {
  const { banners } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const submit = useSubmit();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();
  const filtro = (searchParams.get("status") ?? "") as StatusBanner | "";
  // Estado do drawer derivado da URL no cliente: junto com shouldRevalidate,
  // abre no mesmo frame do clique usando a listagem já em memória.
  const abrindo = searchParams.get("novo") === "1";
  const editarId = searchParams.get("editar");
  const editando = editarId
    ? banners.find((b) => String(b.id) === editarId) ?? null
    : null;

  const snapshotBanner = (b: BannerAdmin) =>
    JSON.stringify({
      titulo: b.titulo,
      subtitulo: b.subtitulo,
      imagem_path: b.imagem_path,
      link: b.link,
      ordem: b.ordem,
      ativo: b.ativo,
      vigencia_de: b.vigencia_de,
      vigencia_ate: b.vigencia_ate,
    });

  const handleExcluir = async (e: MouseEvent<HTMLButtonElement>, b: BannerAdmin) => {
    e.preventDefault();
    const ok = await confirmDestrutivo({
      titulo: `Excluir banner "${b.titulo}"?`,
      mensagem: "Ele sai imediatamente da loja e não pode ser restaurado.",
      confirmar: "Excluir",
    });
    if (!ok) return;
    const fd = new FormData();
    fd.set("_intent", "delete");
    fd.set("id", String(b.id));
    submit(fd, { method: "post", replace: true });
  };

  const comStatus = banners.map((b) => ({ ...b, status: statusBanner(b) }));
  const visiveis = filtro ? comStatus.filter((b) => b.status === filtro) : comStatus;

  const count = (s: StatusBanner) => comStatus.filter((b) => b.status === s).length;

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Vitrine</span>
          <h1>Banners da home</h1>
          <p>Banners no ar aparecem na loja na ordem definida. Agendados entram automaticamente.</p>
        </div>
        <div className="pn-head-actions">
          <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset>
            <Plus size={14} /> Novo banner
          </Link>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "Total", value: banners.length, tone: "info" },
          { label: "No ar agora", value: count("ativo"), tone: "ok" },
          { label: "Agendados", value: count("agendado"), tone: "warn" },
          { label: "Expirados / inativos", value: count("expirado") + count("inativo"), tone: "muted" },
        ]}
      />

      <Form method="get" className="pn-toolbar">
        <select name="status" defaultValue={filtro}>
          <option value="">Todos os status</option>
          <option value="ativo">No ar</option>
          <option value="agendado">Agendados</option>
          <option value="expirado">Expirados</option>
          <option value="inativo">Inativos</option>
        </select>
        <span style={{ fontSize: 12, color: "var(--pn-text-muted)" }}>
          Ordenados pela posição de exibição na home.
        </span>
        <button className="pn-btn-sm">Filtrar</button>
      </Form>

      {actionData && "erro" in actionData && actionData.erro && (
        <div className="ct-alert ct-alert--err" role="alert" style={{ marginBottom: 14 }}>
          {actionData.erro}
        </div>
      )}

      {visiveis.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={banners.length === 0 ? "Nenhum banner cadastrado" : "Nada com esse status"}
          description={
            banners.length === 0
              ? "Banners são o primeiro destaque da home. Adicione uma campanha, uma chamada sazonal ou uma vitrine de produtos."
              : "Mude o filtro acima ou crie um novo banner."
          }
          cta={
            banners.length === 0 ? (
              <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset>
                <Plus size={14} /> Adicionar primeiro banner
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="pn-banner-grid">
          {visiveis.map((b) => (
            <article key={b.id} className="pn-banner-card">
              <div className="hero">
                {b.imagem_path ? (
                  <img src={b.imagem_path} alt={b.titulo} />
                ) : (
                  <ImageIcon size={28} color="#94a3b8" />
                )}
                <span className="status">
                  <StatusBadge tone={STATUS_TONE[b.status]}>
                    {STATUS_LABEL[b.status]}
                  </StatusBadge>
                </span>
              </div>
              <div className="info">
                <h4>{b.titulo}</h4>
                {b.subtitulo ? <span className="sub">{b.subtitulo}</span> : null}
                <div className="meta">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span
                      title="Ordem na home"
                      style={{
                        fontSize: 10,
                        background: "rgba(15,23,42,0.06)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      #{b.ordem}
                    </span>
                  </span>
                  {b.link ? (
                    <a
                      href={b.link}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <LinkIcon size={11} />
                      {b.link.length > 32 ? b.link.slice(0, 32) + "…" : b.link}
                      <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span>Sem link</span>
                  )}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <CalendarClock size={12} />
                    {b.vigencia_de || b.vigencia_ate
                      ? `${fmtData(b.vigencia_de)} → ${fmtData(b.vigencia_ate)}`
                      : "Sem vigência"}
                  </span>
                </div>
              </div>
              <div className="col-actions">
                <Form method="post" replace style={{ display: "inline" }}>
                  <input type="hidden" name="_intent" value="move" />
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="delta" value="-1" />
                  <input type="hidden" name="snapshot" value={snapshotBanner(b)} />
                  <button
                    className="pn-icon-btn"
                    title="Subir na home"
                    disabled={b.ordem === 0 || enviando}
                  >
                    <ArrowUp size={14} />
                  </button>
                </Form>
                <Form method="post" replace style={{ display: "inline" }}>
                  <input type="hidden" name="_intent" value="move" />
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="delta" value="1" />
                  <input type="hidden" name="snapshot" value={snapshotBanner(b)} />
                  <button className="pn-icon-btn" title="Descer na home" disabled={enviando}>
                    <ArrowDown size={14} />
                  </button>
                </Form>
                <Form method="post" replace style={{ display: "inline" }}>
                  <input type="hidden" name="_intent" value="toggle" />
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="snapshot" value={snapshotBanner(b)} />
                  <button
                    className="pn-icon-btn"
                    title={b.ativo ? "Pausar" : "Ativar"}
                    disabled={enviando}
                  >
                    {b.ativo ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </Form>
                <Link
                  to={`?editar=${b.id}`}
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
                  onClick={(e) => handleExcluir(e, b)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {(abrindo || editando) ? <DrawerBanner editando={editando} /> : null}
    </div>
  );
}

function DrawerBanner({ editando }: { editando: BannerAdmin | null }) {
  return (
    <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
      <div className="pn-drawer" style={{ width: "min(560px, 100%)" }}>
        <div className="pn-drawer-head">
          <h3>{editando ? "Editar banner" : "Novo banner"}</h3>
          <Link to="/painel/banners" className="pn-btn-link" preventScrollReset>
            Fechar
          </Link>
        </div>
        <Form method="post" encType="multipart/form-data" replace>
          <input type="hidden" name="_intent" value={editando ? "update" : "create"} />
          {editando ? <input type="hidden" name="id" value={editando.id} /> : null}
          <div className="pn-drawer-body">
            <div
              className="pn-field"
              style={{
                background: "#f8fafc",
                border: "1px dashed var(--pn-border)",
                borderRadius: 8,
                padding: 14,
              }}
            >
              <label style={{ fontWeight: 600 }}>Imagem do banner</label>
              {editando?.imagem_path ? (
                <div
                  style={{
                    margin: "8px 0",
                    aspectRatio: "16/9",
                    background: "#e2e8f0",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={editando.imagem_path}
                    alt={editando.titulo}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    margin: "8px 0",
                    aspectRatio: "16/9",
                    background: "#e2e8f0",
                    borderRadius: 6,
                    display: "grid",
                    placeItems: "center",
                    color: "#94a3b8",
                  }}
                >
                  <ImageIcon size={32} />
                </div>
              )}
              <input type="file" name="imagem" accept="image/*" />
              <p
                className="pn-list-meta"
                style={{ fontSize: 11, marginTop: 6 }}
              >
                Recomendado: 1600×600 (16:9). Até 8MB. Você também pode informar uma URL
                externa abaixo se preferir.
              </p>
            </div>

            <div className="pn-field">
              <label htmlFor="titulo">Título *</label>
              <input
                id="titulo"
                name="titulo"
                required
                maxLength={255}
                defaultValue={editando?.titulo ?? ""}
              />
            </div>
            <div className="pn-field">
              <label htmlFor="subtitulo">Subtítulo</label>
              <input
                id="subtitulo"
                name="subtitulo"
                maxLength={255}
                defaultValue={editando?.subtitulo ?? ""}
              />
            </div>
            <div className="pn-field">
              <label htmlFor="link">Link ao clicar</label>
              <input
                id="link"
                name="link"
                placeholder="/loja?em_promocao=1 ou https://..."
                defaultValue={editando?.link ?? ""}
              />
            </div>
            <div className="pn-field">
              <label htmlFor="imagem_path">URL da imagem (alternativa ao upload)</label>
              <input
                id="imagem_path"
                name="imagem_path"
                placeholder="https://cdn.exemplo.com/banner.jpg"
                defaultValue={editando?.imagem_path ?? ""}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="pn-field">
                <label htmlFor="vigencia_de">Vigência de</label>
                <input
                  id="vigencia_de"
                  name="vigencia_de"
                  type="date"
                  defaultValue={dataInput(editando?.vigencia_de ?? null)}
                />
              </div>
              <div className="pn-field">
                <label htmlFor="vigencia_ate">Vigência até</label>
                <input
                  id="vigencia_ate"
                  name="vigencia_ate"
                  type="date"
                  defaultValue={dataInput(editando?.vigencia_ate ?? null)}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="pn-field">
                <label htmlFor="ordem">Ordem</label>
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
                    name="ativo"
                    value="true"
                    defaultChecked={editando ? editando.ativo : true}
                  />
                  <span className="track" />
                  <span style={{ fontSize: 13 }}>Ativo</span>
                </label>
              </div>
            </div>
          </div>
          <DrawerFootBanner editando={!!editando} />
        </Form>
      </div>
    </div>
  );
}

function DrawerFootBanner({ editando }: { editando: boolean }) {
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  return (
    <div className="pn-drawer-foot">
      <Link to="/painel/banners" className="pn-btn-sm">
        Cancelar
      </Link>
      <button className="pn-btn-sm mint" disabled={enviando}>
        {enviando ? "Salvando..." : editando ? "Salvar banner" : "Criar banner"}
      </button>
    </div>
  );
}
