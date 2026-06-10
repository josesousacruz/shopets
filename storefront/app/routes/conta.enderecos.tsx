import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useFetcher, useLoaderData, useNavigation } from "@remix-run/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  listarEnderecos,
  criarEndereco,
  atualizarEndereco,
  removerEndereco,
  ApiValidationError,
} from "~/lib/auth.server";
import { requireToken } from "~/lib/session.server";
import type { CepResultado, Endereco } from "~/types/api";
import contaStyles from "~/styles/conta.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: contaStyles }];

export const meta: MetaFunction = () => [{ title: "Endereços — Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireToken(request);
  const { data } = await listarEnderecos(token);
  return json({ enderecos: data });
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireToken(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "delete") {
    const id = Number(form.get("id"));
    await removerEndereco(token, id);
    return json({ ok: true, intent });
  }

  const payload: Partial<Endereco> = {
    apelido: String(form.get("apelido") ?? "") || null,
    cep: String(form.get("cep") ?? ""),
    logradouro: String(form.get("logradouro") ?? ""),
    numero: String(form.get("numero") ?? ""),
    complemento: String(form.get("complemento") ?? "") || null,
    bairro: String(form.get("bairro") ?? ""),
    cidade: String(form.get("cidade") ?? ""),
    uf: String(form.get("uf") ?? ""),
    tipo: String(form.get("tipo") ?? "entrega") as Endereco["tipo"],
    principal: form.get("principal") === "on",
  };

  try {
    if (intent === "update") {
      const id = Number(form.get("id"));
      await atualizarEndereco(token, id, payload);
    } else {
      await criarEndereco(token, payload);
    }
    return json({ ok: true, intent });
  } catch (err) {
    if (err instanceof ApiValidationError) {
      return json({ ok: false, errors: err.errors, message: err.message, intent }, { status: 422 });
    }
    throw err;
  }
}

const TIPO_LABEL: Record<Endereco["tipo"], string> = {
  entrega: "Entrega",
  cobranca: "Cobrança",
  ambos: "Entrega e cobrança",
};

export default function ContaEnderecos() {
  const { enderecos } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Endereco | null>(null);

  const ad = actionData as
    | { ok: boolean; intent?: string; errors?: Record<string, string[]>; message?: string }
    | undefined;
  const errors: Record<string, string[]> = ad?.errors ?? {};
  const message: string | undefined = ad?.message;
  const submitting = nav.state === "submitting";

  // Fecha o dialog quando a mutação (create/update) for bem-sucedida.
  useEffect(() => {
    if (nav.state === "idle" && ad?.ok && ad.intent !== "delete") {
      setOpen(false);
      setEditing(null);
    }
  }, [nav.state, ad]);

  function novo() {
    setEditing(null);
    setOpen(true);
  }
  function editar(e: Endereco) {
    setEditing(e);
    setOpen(true);
  }

  return (
    <div className="ct-wrap">
      <div className="ct-toolbar">
        <div className="ct-head" style={{ marginBottom: 0 }}>
          <h1>Endereços</h1>
          <p>Gerencie seus endereços de entrega e cobrança.</p>
        </div>
        <button type="button" className="ct-btn ct-btn--mint" style={{ width: "auto" }} onClick={novo}>
          <Plus size={16} /> Novo endereço
        </button>
      </div>

      {enderecos.length === 0 ? (
        <div className="ct-empty">
          Você ainda não cadastrou endereços.
          <div style={{ marginTop: 16 }}>
            <button type="button" className="ct-btn ct-btn--mint" style={{ width: "auto" }} onClick={novo}>
              <Plus size={16} /> Adicionar endereço
            </button>
          </div>
        </div>
      ) : (
        <div className="ct-addr-list">
          {enderecos.map((e) => (
            <article className="ct-addr" key={e.id}>
              {e.principal && <span className="badge">Principal</span>}
              <span className="apelido">{e.apelido || "Endereço"}</span>
              <span className="tipo">{TIPO_LABEL[e.tipo]}</span>
              <address>
                {e.logradouro}, {e.numero}
                {e.complemento ? ` — ${e.complemento}` : ""}
                <br />
                {e.bairro} — {e.cidade}/{e.uf}
                <br />
                CEP {e.cep}
              </address>
              <div className="actions">
                <button type="button" onClick={() => editar(e)}>Editar</button>
                <Form method="post" style={{ display: "inline" }}>
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" className="del"
                    onClick={(ev) => { if (!confirm("Remover este endereço?")) ev.preventDefault(); }}>
                    Remover
                  </button>
                </Form>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="ct-overlay" />
          <Dialog.Content className="ct-dialog" aria-describedby={undefined}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Dialog.Title asChild>
                <h2>{editing ? "Editar endereço" : "Novo endereço"}</h2>
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" aria-label="Fechar"><X size={20} /></button>
              </Dialog.Close>
            </div>

            <EnderecoForm
              key={editing?.id ?? "novo"}
              endereco={editing}
              errors={errors}
              message={message}
              submitting={submitting}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="ct-links" style={{ marginTop: 28 }}>
        <Link to="/conta">Voltar para a conta</Link>
      </div>
    </div>
  );
}

function EnderecoForm({
  endereco,
  errors,
  message,
  submitting,
}: {
  endereco: Endereco | null;
  errors: Record<string, string[]>;
  message?: string;
  submitting: boolean;
}) {
  const cepFetcher = useFetcher<{ found: boolean; endereco?: CepResultado }>();
  const [auto, setAuto] = useState<Partial<CepResultado>>({});

  // Quando o CEP retorna, preenche os campos.
  useEffect(() => {
    if (cepFetcher.data?.found && cepFetcher.data.endereco) {
      setAuto(cepFetcher.data.endereco);
    }
  }, [cepFetcher.data]);

  function onCepBlur(e: React.FocusEvent<HTMLInputElement>) {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length === 8) {
      cepFetcher.load(`/api/cep/${cep}`);
    }
  }

  const err = (f: string) => errors[f]?.[0];

  return (
    <Form method="post">
      <input type="hidden" name="intent" value={endereco ? "update" : "create"} />
      {endereco && <input type="hidden" name="id" value={endereco.id} />}

      {message && Object.keys(errors).length === 0 && (
        <div className="ct-alert ct-alert--err" role="alert">{message}</div>
      )}

      <div className="ct-field">
        <label htmlFor="apelido">Apelido (ex.: Casa, Trabalho)</label>
        <input id="apelido" name="apelido" type="text" defaultValue={endereco?.apelido ?? ""} />
        {err("apelido") && <span className="err">{err("apelido")}</span>}
      </div>

      <div className="ct-row ct-row--cep">
        <div className="ct-field" style={{ marginTop: 18 }}>
          <label htmlFor="cep">CEP</label>
          <input id="cep" name="cep" type="text" inputMode="numeric" required
            defaultValue={endereco?.cep ?? ""} onBlur={onCepBlur}
            placeholder="00000-000" />
          {cepFetcher.state === "loading" && <span className="err" style={{ color: "var(--muted)" }}>Buscando...</span>}
          {cepFetcher.data && cepFetcher.data.found === false && (
            <span className="err">CEP não encontrado. Preencha manualmente.</span>
          )}
          {err("cep") && <span className="err">{err("cep")}</span>}
        </div>
        <div className="ct-field" style={{ marginTop: 18 }}>
          <label htmlFor="logradouro">Logradouro</label>
          <input id="logradouro" name="logradouro" type="text" required
            key={auto.logradouro ?? endereco?.logradouro ?? "lg"}
            defaultValue={auto.logradouro ?? endereco?.logradouro ?? ""} />
          {err("logradouro") && <span className="err">{err("logradouro")}</span>}
        </div>
      </div>

      <div className="ct-row">
        <div className="ct-field">
          <label htmlFor="numero">Número</label>
          <input id="numero" name="numero" type="text" required defaultValue={endereco?.numero ?? ""} />
          {err("numero") && <span className="err">{err("numero")}</span>}
        </div>
        <div className="ct-field">
          <label htmlFor="complemento">Complemento</label>
          <input id="complemento" name="complemento" type="text" defaultValue={endereco?.complemento ?? ""} />
          {err("complemento") && <span className="err">{err("complemento")}</span>}
        </div>
      </div>

      <div className="ct-field">
        <label htmlFor="bairro">Bairro</label>
        <input id="bairro" name="bairro" type="text" required
          key={auto.bairro ?? endereco?.bairro ?? "br"}
          defaultValue={auto.bairro ?? endereco?.bairro ?? ""} />
        {err("bairro") && <span className="err">{err("bairro")}</span>}
      </div>

      <div className="ct-row" style={{ gridTemplateColumns: "1fr 90px" }}>
        <div className="ct-field">
          <label htmlFor="cidade">Cidade</label>
          <input id="cidade" name="cidade" type="text" required
            key={auto.cidade ?? endereco?.cidade ?? "cd"}
            defaultValue={auto.cidade ?? endereco?.cidade ?? ""} />
          {err("cidade") && <span className="err">{err("cidade")}</span>}
        </div>
        <div className="ct-field">
          <label htmlFor="uf">UF</label>
          <input id="uf" name="uf" type="text" maxLength={2} required
            key={auto.uf ?? endereco?.uf ?? "uf"}
            defaultValue={auto.uf ?? endereco?.uf ?? ""} />
          {err("uf") && <span className="err">{err("uf")}</span>}
        </div>
      </div>

      <div className="ct-field">
        <label htmlFor="tipo">Tipo</label>
        <select id="tipo" name="tipo" defaultValue={endereco?.tipo ?? "entrega"}>
          <option value="entrega">Entrega</option>
          <option value="cobranca">Cobrança</option>
          <option value="ambos">Entrega e cobrança</option>
        </select>
        {err("tipo") && <span className="err">{err("tipo")}</span>}
      </div>

      <div className="ct-field--inline">
        <input id="principal" name="principal" type="checkbox" defaultChecked={endereco?.principal} />
        <label htmlFor="principal">Definir como endereço principal</label>
      </div>

      <div className="dialog-actions">
        <Dialog.Close asChild>
          <button type="button" className="ct-btn ct-btn--ghost">Cancelar</button>
        </Dialog.Close>
        <button type="submit" className="ct-btn ct-btn--mint" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar endereço"}
        </button>
      </div>
    </Form>
  );
}
