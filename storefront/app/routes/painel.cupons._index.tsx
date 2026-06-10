import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useFetcher, useLoaderData } from "@remix-run/react";
import { Trash2 } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError, type CupomAdmin } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Cupons — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const res = await painel.cupons.list(token);
  return json({ cupons: res.data });
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("_intent") ?? "");

  const payload = () => {
    const tipo = String(form.get("tipo") ?? "percentual");
    const str = (k: string) => {
      const v = String(form.get(k) ?? "");
      return v === "" ? null : v;
    };
    return {
      codigo: String(form.get("codigo") ?? ""),
      tipo,
      valor: tipo === "frete_gratis" ? 0 : Number(form.get("valor") ?? 0),
      valor_minimo_pedido: Number(form.get("valor_minimo_pedido") ?? 0),
      valido_de: str("valido_de"),
      valido_ate: str("valido_ate"),
      uso_maximo: form.get("uso_maximo") ? Number(form.get("uso_maximo")) : null,
      ativo: form.get("ativo") === "true",
    };
  };

  try {
    switch (intent) {
      case "create":
        await painel.cupons.create(token, payload());
        return json({ ok: "create" });
      case "update":
        await painel.cupons.update(token, String(form.get("id")), payload());
        return json({ ok: "update" });
      case "delete":
        await painel.cupons.remove(token, String(form.get("id")));
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
  return iso ? iso.slice(0, 10) : "";
}

function LinhaCupom({ c }: { c: CupomAdmin }) {
  const fetcher = useFetcher<typeof action>();
  const busy = fetcher.state !== "idle";
  return (
    <div className="pn-card" style={{ marginBottom: 14 }}>
      <fetcher.Form method="post" style={{ display: "grid", gap: 10 }}>
        <input type="hidden" name="id" value={c.id} />
        <div className="ct-row">
          <div className="ct-field">
            <label>Código</label>
            <input name="codigo" defaultValue={c.codigo} required style={{ textTransform: "uppercase" }} />
          </div>
          <div className="ct-field">
            <label>Tipo</label>
            <select name="tipo" defaultValue={c.tipo}>
              <option value="percentual">Percentual (%)</option>
              <option value="valor_fixo">Valor fixo (R$)</option>
              <option value="frete_gratis">Frete grátis</option>
            </select>
          </div>
          <div className="ct-field" style={{ maxWidth: 130 }}>
            <label>Valor</label>
            <input name="valor" type="number" step="0.01" min="0" defaultValue={c.valor} />
          </div>
        </div>
        <div className="ct-row">
          <div className="ct-field">
            <label>Pedido mínimo (R$)</label>
            <input name="valor_minimo_pedido" type="number" step="0.01" min="0" defaultValue={c.valor_minimo_pedido} />
          </div>
          <div className="ct-field" style={{ maxWidth: 130 }}>
            <label>Uso máximo</label>
            <input name="uso_maximo" type="number" min="1" defaultValue={c.uso_maximo ?? ""} placeholder="∞" />
          </div>
          <div className="ct-field" style={{ maxWidth: 130 }}>
            <label>Usos</label>
            <input value={c.usos_atuais} readOnly disabled />
          </div>
        </div>
        <div className="ct-row">
          <div className="ct-field">
            <label>Válido de</label>
            <input name="valido_de" type="date" defaultValue={dataInput(c.valido_de)} />
          </div>
          <div className="ct-field">
            <label>Válido até</label>
            <input name="valido_ate" type="date" defaultValue={dataInput(c.valido_ate)} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <label className="pn-switch" title="Ativo">
            <input type="checkbox" name="ativo" value="true" defaultChecked={c.ativo} />
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
                if (!window.confirm(`Excluir o cupom "${c.codigo}"?`)) e.preventDefault();
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </fetcher.Form>
    </div>
  );
}

export default function Cupons() {
  const { cupons } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Promoções</span>
          <h1>Cupons de desconto</h1>
          <p>Percentual, valor fixo ou frete grátis. O código é salvo em maiúsculas.</p>
        </div>
      </div>

      {actionData && "erro" in actionData && actionData.erro && (
        <div className="ct-alert ct-alert--err" role="alert" style={{ marginBottom: 18 }}>
          {actionData.erro}
        </div>
      )}

      {cupons.length === 0 ? (
        <div className="pn-card">
          <p className="card-sub">Nenhum cupom cadastrado.</p>
        </div>
      ) : (
        cupons.map((c) => <LinhaCupom key={c.id} c={c} />)
      )}

      <div className="pn-card">
        <h2>Novo cupom</h2>
        <Form method="post" style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <input type="hidden" name="_intent" value="create" />
          <div className="ct-row">
            <div className="ct-field">
              <label>Código *</label>
              <input name="codigo" required style={{ textTransform: "uppercase" }} placeholder="BEMVINDO10" />
            </div>
            <div className="ct-field">
              <label>Tipo</label>
              <select name="tipo" defaultValue="percentual">
                <option value="percentual">Percentual (%)</option>
                <option value="valor_fixo">Valor fixo (R$)</option>
                <option value="frete_gratis">Frete grátis</option>
              </select>
            </div>
            <div className="ct-field" style={{ maxWidth: 130 }}>
              <label>Valor</label>
              <input name="valor" type="number" step="0.01" min="0" defaultValue={0} />
            </div>
          </div>
          <div className="ct-row">
            <div className="ct-field">
              <label>Pedido mínimo (R$)</label>
              <input name="valor_minimo_pedido" type="number" step="0.01" min="0" defaultValue={0} />
            </div>
            <div className="ct-field" style={{ maxWidth: 130 }}>
              <label>Uso máximo</label>
              <input name="uso_maximo" type="number" min="1" placeholder="∞" />
            </div>
          </div>
          <div className="ct-row">
            <div className="ct-field">
              <label>Válido de</label>
              <input name="valido_de" type="date" />
            </div>
            <div className="ct-field">
              <label>Válido até</label>
              <input name="valido_ate" type="date" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label className="pn-switch" title="Ativo">
              <input type="checkbox" name="ativo" value="true" defaultChecked />
              <span className="track" />
            </label>
            <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>Ativo</span>
            <button type="submit" className="pn-btn-sm mint" style={{ marginLeft: "auto" }}>
              Adicionar cupom
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
