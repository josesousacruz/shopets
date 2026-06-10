import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import {
  json,
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { Form, useActionData, useFetcher, useLoaderData } from "@remix-run/react";
import { ImageIcon, Trash2 } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError, salvarBannerComUpload, type BannerAdmin } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Banners — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const res = await painel.banners.list(token);
  return json({ banners: res.data });
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);

  // Multipart (com upload de imagem) precisa ser parseado antes.
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
    switch (intent) {
      case "create":
        if (file) await salvarBannerComUpload(token, null, campos(), file);
        else await painel.banners.create(token, payloadJson());
        return json({ ok: "create" });
      case "update": {
        const id = String(form.get("id"));
        if (file) await salvarBannerComUpload(token, id, campos(), file);
        else await painel.banners.update(token, id, payloadJson());
        return json({ ok: "update" });
      }
      case "delete":
        await painel.banners.remove(token, String(form.get("id")));
        return json({ ok: "delete" });
      default:
        return json({ erro: "Ação inválida." }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof PainelValidationError) {
      return json({ erro: err.message, errors: err.errors, intent }, { status: 422 });
    }
    throw err;
  }
}

function dataInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function LinhaBanner({ b }: { b: BannerAdmin }) {
  const fetcher = useFetcher<typeof action>();
  const busy = fetcher.state !== "idle";
  return (
    <div className="pn-card" style={{ marginBottom: 14 }}>
      <fetcher.Form method="post" encType="multipart/form-data">
        <input type="hidden" name="id" value={b.id} />
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div
            style={{
              width: 132,
              height: 80,
              borderRadius: 12,
              overflow: "hidden",
              background: "rgba(4,3,30,.06)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              border: "1px solid var(--line)",
            }}
          >
            {b.imagem_path ? (
              <img src={b.imagem_path} alt={b.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <ImageIcon size={22} style={{ color: "var(--muted)" }} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 280, display: "grid", gap: 10 }}>
            <div className="ct-row">
              <div className="ct-field" style={{ flex: 2 }}>
                <label>Título</label>
                <input name="titulo" defaultValue={b.titulo} required />
              </div>
              <div className="ct-field" style={{ maxWidth: 96 }}>
                <label>Ordem</label>
                <input name="ordem" type="number" min="0" defaultValue={b.ordem} />
              </div>
            </div>
            <div className="ct-field">
              <label>Subtítulo</label>
              <input name="subtitulo" defaultValue={b.subtitulo ?? ""} />
            </div>
            <div className="ct-row">
              <div className="ct-field" style={{ flex: 2 }}>
                <label>Link</label>
                <input name="link" defaultValue={b.link ?? ""} placeholder="/loja?em_promocao=1" />
              </div>
              <div className="ct-field">
                <label>Imagem (URL/path)</label>
                <input name="imagem_path" defaultValue={b.imagem_path ?? ""} placeholder="https://..." />
              </div>
            </div>
            <div className="ct-row">
              <div className="ct-field">
                <label>Vigência de</label>
                <input name="vigencia_de" type="date" defaultValue={dataInput(b.vigencia_de)} />
              </div>
              <div className="ct-field">
                <label>Vigência até</label>
                <input name="vigencia_ate" type="date" defaultValue={dataInput(b.vigencia_ate)} />
              </div>
              <div className="ct-field">
                <label>Trocar imagem (upload)</label>
                <input name="imagem" type="file" accept="image/*" />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <label className="pn-switch" title="Ativo">
                <input type="checkbox" name="ativo" value="true" defaultChecked={b.ativo} />
                <span className="track" />
              </label>
              <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>Ativo</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button type="submit" name="_intent" value="update" className="pn-btn-sm mint" disabled={busy}>
                  Salvar
                </button>
                <button
                  type="submit"
                  name="_intent"
                  value="delete"
                  className="pn-btn-sm danger"
                  disabled={busy}
                  onClick={(e) => {
                    if (!window.confirm(`Excluir o banner "${b.titulo}"?`)) e.preventDefault();
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </fetcher.Form>
    </div>
  );
}

export default function Banners() {
  const { banners } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Vitrine</span>
          <h1>Banners da home</h1>
          <p>Somente banners ativos e dentro da vigência aparecem na loja, ordenados por ordem.</p>
        </div>
      </div>

      {actionData && "erro" in actionData && actionData.erro && (
        <div className="ct-alert ct-alert--err" role="alert" style={{ marginBottom: 18 }}>
          {actionData.erro}
        </div>
      )}

      {banners.length === 0 ? (
        <div className="pn-card">
          <p className="card-sub">Nenhum banner cadastrado.</p>
        </div>
      ) : (
        banners.map((b) => <LinhaBanner key={b.id} b={b} />)
      )}

      <div className="pn-card">
        <h2>Novo banner</h2>
        <Form method="post" encType="multipart/form-data" style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <input type="hidden" name="_intent" value="create" />
          <div className="ct-row">
            <div className="ct-field" style={{ flex: 2 }}>
              <label>Título *</label>
              <input name="titulo" required />
            </div>
            <div className="ct-field" style={{ maxWidth: 96 }}>
              <label>Ordem</label>
              <input name="ordem" type="number" min="0" defaultValue={0} />
            </div>
          </div>
          <div className="ct-field">
            <label>Subtítulo</label>
            <input name="subtitulo" />
          </div>
          <div className="ct-row">
            <div className="ct-field" style={{ flex: 2 }}>
              <label>Link</label>
              <input name="link" placeholder="/loja?em_promocao=1" />
            </div>
            <div className="ct-field">
              <label>Imagem (URL/path)</label>
              <input name="imagem_path" placeholder="https://..." />
            </div>
          </div>
          <div className="ct-row">
            <div className="ct-field">
              <label>Vigência de</label>
              <input name="vigencia_de" type="date" />
            </div>
            <div className="ct-field">
              <label>Vigência até</label>
              <input name="vigencia_ate" type="date" />
            </div>
            <div className="ct-field">
              <label>Imagem (upload)</label>
              <input name="imagem" type="file" accept="image/*" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label className="pn-switch" title="Ativo">
              <input type="checkbox" name="ativo" value="true" defaultChecked />
              <span className="track" />
            </label>
            <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>Ativo</span>
            <button type="submit" className="pn-btn-sm mint" style={{ marginLeft: "auto" }}>
              Adicionar banner
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
