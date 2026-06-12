import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Novo cliente — Painel" }];

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const fd = await request.formData();

  const body: Record<string, unknown> = {
    nome: fd.get("nome"),
    email: fd.get("email"),
    cpf_cnpj: fd.get("cpf_cnpj") || null,
    telefone: fd.get("telefone") || null,
    tipo_pessoa: fd.get("tipo_pessoa") || "fisica",
    aceita_marketing: fd.get("aceita_marketing") === "1",
    enviar_email: fd.get("enviar_email") === "1",
  };

  try {
    const res = await painel.clientes.create(token, body);
    return redirect(`/painel/clientes/${res.data.id_cliente}`);
  } catch (err: any) {
    return json(
      { errors: err?.errors ?? {}, message: err?.message ?? "Erro ao salvar" },
      { status: 422 },
    );
  }
}

export default function ClienteNovo() {
  const data = useActionData<typeof action>();
  const nav = useNavigation();
  const saving = nav.state === "submitting";
  const errors: Record<string, string[]> = (data && "errors" in data ? data.errors : {}) as any;
  const err = (k: string) => errors[k]?.[0] && <span className="err">{errors[k][0]}</span>;

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Relacionamento</span>
          <h1>Novo cliente</h1>
          <p>Cadastro manual — uma senha é gerada e enviada por e-mail.</p>
        </div>
      </div>

      {data && "message" in data && (
        <div className="ct-alert ct-alert--err">{(data as { message: string }).message}</div>
      )}

      <Form method="post" className="pn-form-grid">
        <div className="pn-card">
          <h2>Dados</h2>
          <div className="ct-field">
            <label htmlFor="nome">Nome *</label>
            <input id="nome" name="nome" required maxLength={160} />
            {err("nome")}
          </div>
          <div className="ct-row">
            <div className="ct-field">
              <label htmlFor="email">E-mail *</label>
              <input id="email" type="email" name="email" required />
              {err("email")}
            </div>
            <div className="ct-field">
              <label htmlFor="telefone">Telefone</label>
              <input id="telefone" name="telefone" />
            </div>
          </div>
          <div className="ct-row">
            <div className="ct-field">
              <label htmlFor="cpf_cnpj">CPF/CNPJ</label>
              <input id="cpf_cnpj" name="cpf_cnpj" />
            </div>
            <div className="ct-field">
              <label htmlFor="tipo_pessoa">Tipo</label>
              <select id="tipo_pessoa" name="tipo_pessoa" defaultValue="fisica">
                <option value="fisica">Pessoa Física</option>
                <option value="juridica">Pessoa Jurídica</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pn-card">
          <h2>Comunicação</h2>
          <label className="pn-check">
            <input type="checkbox" name="enviar_email" value="1" defaultChecked />
            Enviar e-mail com senha provisória
          </label>
          <label className="pn-check">
            <input type="checkbox" name="aceita_marketing" value="1" />
            Aceita receber comunicações de marketing
          </label>
        </div>

        <div className="pn-actions-bar">
          <button type="submit" className="pn-btn-sm mint" disabled={saving}>
            {saving ? "Salvando..." : "Criar cliente"}
          </button>
        </div>
      </Form>
    </div>
  );
}
