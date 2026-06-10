import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useFetcher } from "@remix-run/react";
import { useRef, useState } from "react";
import { ArrowLeft, Trash2, UploadCloud } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import {
  painel,
  uploadFotoProduto,
  PainelValidationError,
  type VariacaoAdmin,
} from "~/lib/painel.server";
import { ProdutoCampos, lerProdutoForm } from "~/components/painel/ProdutoCampos";

export const meta: MetaFunction = ({ data }) => [
  { title: `${(data as { produto?: { nome?: string } } | undefined)?.produto?.nome ?? "Produto"} — Painel Shopets` },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const [produto, categorias] = await Promise.all([
    painel.produtos.show(token, params.id!),
    painel.categorias.list(token),
  ]);
  return json({ produto: produto.data, categorias: categorias.data });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const id = params.id!;
  const contentType = request.headers.get("content-type") ?? "";

  // ── Upload de foto (multipart): lê o arquivo em memória e reenvia ao Laravel ──
  if (contentType.includes("multipart/form-data")) {
    const uploadHandler = unstable_createMemoryUploadHandler({ maxPartSize: 8 * 1024 * 1024 });
    const form = await unstable_parseMultipartFormData(request, uploadHandler);
    const file = form.get("foto");
    if (!(file instanceof File) || file.size === 0) {
      return json({ erro: "Selecione uma imagem." }, { status: 422 });
    }
    try {
      await uploadFotoProduto(token, id, file);
      return json({ ok: "foto" });
    } catch (err) {
      if (err instanceof PainelValidationError) {
        return json({ erro: err.message, errors: err.errors }, { status: 422 });
      }
      throw err;
    }
  }

  const form = await request.formData();
  const intent = String(form.get("_intent") ?? "dados");

  try {
    switch (intent) {
      case "dados": {
        await painel.produtos.update(token, id, lerProdutoForm(form));
        return json({ ok: "dados" });
      }
      case "foto-delete": {
        await painel.produtos.fotoDelete(token, id, String(form.get("mediaId")));
        return json({ ok: "foto-delete" });
      }
      case "variacao-create": {
        await painel.variacoes.create(token, id, lerVariacaoForm(form));
        return json({ ok: "variacao" });
      }
      case "variacao-update": {
        await painel.variacoes.update(token, id, String(form.get("varId")), lerVariacaoForm(form));
        return json({ ok: "variacao" });
      }
      case "variacao-delete": {
        await painel.variacoes.remove(token, id, String(form.get("varId")));
        return json({ ok: "variacao-delete" });
      }
      default:
        return json({ erro: "Ação desconhecida." }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof PainelValidationError) {
      return json({ erro: err.message, errors: err.errors, intent }, { status: 422 });
    }
    throw err;
  }
}

function lerVariacaoForm(form: FormData): Record<string, unknown> {
  const cor = String(form.get("cor") ?? "").trim();
  return {
    sku: String(form.get("sku") ?? ""),
    nome_variacao: String(form.get("nome_variacao") ?? "") || null,
    atributos: cor ? { cor } : {},
    preco_venda: Number(form.get("preco_venda") ?? 0),
    estoque_atual: Number(form.get("estoque_atual") ?? 0),
    ativo: form.get("ativo") === "true",
  };
}

/* ── Componentes ─────────────────────────────────────── */

function Galeria({ produtoId, fotos }: { produtoId: number; fotos: { id: number; url: string; url_thumb: string }[] }) {
  const upload = useFetcher<typeof action>();
  const del = useFetcher<typeof action>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const submitFile = (file: File) => {
    const fd = new FormData();
    fd.append("foto", file);
    upload.submit(fd, { method: "post", encType: "multipart/form-data" });
  };

  const uploading = upload.state !== "idle";

  return (
    <div className="pn-card">
      <h2>Galeria de fotos</h2>
      <p className="card-sub">JP, PNG ou WebP até 8MB. A primeira foto é a principal.</p>

      {fotos.length > 0 && (
        <div className="pn-gallery">
          {fotos.map((f) => (
            <div className="pn-photo" key={f.id}>
              <img src={f.url_thumb || f.url} alt="" />
              <del.Form method="post">
                <input type="hidden" name="_intent" value="foto-delete" />
                <input type="hidden" name="mediaId" value={f.id} />
                <button type="submit" className="del" title="Remover foto" disabled={del.state !== "idle"}>
                  <Trash2 size={15} />
                </button>
              </del.Form>
            </div>
          ))}
        </div>
      )}

      <div
        className={`pn-dropzone${drag ? " drag" : ""}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) submitFile(file);
        }}
        role="button"
        tabIndex={0}
      >
        <UploadCloud size={22} style={{ margin: "0 auto 8px" }} />
        {uploading ? "Enviando..." : "Clique ou arraste uma imagem para enviar"}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) submitFile(file);
          e.currentTarget.value = "";
        }}
      />
      {upload.data && "erro" in upload.data && upload.data.erro && (
        <span className="err" style={{ display: "block", marginTop: 8 }}>
          {upload.data.erro}
        </span>
      )}
    </div>
  );
}

function VariacaoRow({ v }: { v: VariacaoAdmin }) {
  const fetcher = useFetcher<typeof action>();
  const busy = fetcher.state !== "idle";
  return (
    <fetcher.Form method="post" className="pn-var-row">
      <input type="hidden" name="varId" value={v.id} />
      <input name="sku" defaultValue={v.sku} placeholder="SKU" required />
      <input name="cor" defaultValue={(v.atributos?.cor as string) ?? ""} placeholder="Cor / atributo" />
      <input name="preco_venda" type="number" step="0.01" min="0" defaultValue={v.preco_venda} placeholder="Preço" />
      <input name="estoque_atual" type="number" min="0" defaultValue={v.estoque_atual} placeholder="Estoque" />
      <label className="pn-switch" title="Ativa">
        <input type="checkbox" name="ativo" value="true" defaultChecked={v.ativo} />
        <span className="track" />
      </label>
      <span style={{ display: "flex", gap: 6 }}>
        <button type="submit" name="_intent" value="variacao-update" className="pn-btn-sm ghost" disabled={busy}>
          Salvar
        </button>
        <button type="submit" name="_intent" value="variacao-delete" className="pn-btn-sm danger" disabled={busy}>
          <Trash2 size={14} />
        </button>
      </span>
    </fetcher.Form>
  );
}

function NovaVariacao() {
  const fetcher = useFetcher<typeof action>();
  const busy = fetcher.state !== "idle";
  const erro = fetcher.data && "erro" in fetcher.data ? fetcher.data.erro : null;
  return (
    <>
      <fetcher.Form method="post" className="pn-var-row">
        <input type="hidden" name="_intent" value="variacao-create" />
        <input name="sku" placeholder="SKU *" required />
        <input name="cor" placeholder="Cor / atributo" />
        <input name="preco_venda" type="number" step="0.01" min="0" placeholder="Preço *" required />
        <input name="estoque_atual" type="number" min="0" placeholder="Estoque" defaultValue={0} />
        <label className="pn-switch" title="Ativa">
          <input type="checkbox" name="ativo" value="true" defaultChecked />
          <span className="track" />
        </label>
        <button type="submit" className="pn-btn-sm mint" disabled={busy}>
          Adicionar
        </button>
      </fetcher.Form>
      {erro && <span className="err" style={{ display: "block", marginTop: 8 }}>{erro}</span>}
    </>
  );
}

export default function EditarProduto() {
  const { produto, categorias } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const saving = nav.state === "submitting" && nav.formData?.get("_intent") === "dados";
  const dadosErrors =
    actionData && "intent" in actionData && actionData.intent === "dados" && "errors" in actionData
      ? (actionData.errors as Record<string, string[]>)
      : undefined;

  return (
    <div>
      <div className="pn-head">
        <div>
          <Link to="/painel/catalogo" className="pn-btn-sm ghost" style={{ marginBottom: 10 }}>
            <ArrowLeft size={15} /> Catálogo
          </Link>
          <h1>{produto.nome}</h1>
          <p>
            /{produto.slug}
            {produto.visivel_ecommerce ? " · visível na loja" : " · oculto"}
          </p>
        </div>
        <Link to={`/produto/${produto.slug}`} className="pn-btn-sm ghost" target="_blank" rel="noreferrer">
          Ver na loja
        </Link>
      </div>

      {actionData && "ok" in actionData && actionData.ok === "dados" && (
        <div className="ct-alert ct-alert--ok" role="status" style={{ marginBottom: 18 }}>
          Produto salvo.
        </div>
      )}
      {actionData && "erro" in actionData && actionData.erro && (
        <div className="ct-alert ct-alert--err" role="alert" style={{ marginBottom: 18 }}>
          {actionData.erro}
        </div>
      )}

      <Form method="post">
        <input type="hidden" name="_intent" value="dados" />
        <ProdutoCampos produto={produto} categorias={categorias} errors={dadosErrors} />
        <div className="pn-actions-bar" style={{ marginTop: 18, marginBottom: 24 }}>
          <button type="submit" className="pn-btn-sm mint" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </Form>

      <Galeria produtoId={produto.id} fotos={produto.galeria} />

      <div className="pn-card">
        <h2>Variações</h2>
        <p className="card-sub">SKU, atributo (ex.: cor), preço e estoque.</p>

        {produto.variacoes.length > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <div className="pn-var-row" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
              <span>SKU</span>
              <span>Atributo</span>
              <span>Preço</span>
              <span>Estoque</span>
              <span>Ativa</span>
              <span></span>
            </div>
            {produto.variacoes.map((v) => (
              <VariacaoRow key={v.id} v={v} />
            ))}
          </div>
        ) : (
          <p className="card-sub">Nenhuma variação cadastrada.</p>
        )}

        <h2 style={{ fontSize: 15, marginTop: 18 }}>Adicionar variação</h2>
        <NovaVariacao />
      </div>
    </div>
  );
}
