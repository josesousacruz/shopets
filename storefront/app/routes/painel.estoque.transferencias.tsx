import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { ArrowRightLeft, ChevronLeft } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Transferências — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);
  const deRaw = url.searchParams.get("de");
  const de = deRaw ? Number(deRaw) : null;

  const depRes = await painel.estoque.depositos(token);

  let saldosOrigem: Awaited<ReturnType<typeof painel.estoque.list>>["data"] = [];
  if (de) {
    const res = await painel.estoque.list(token, { deposito_id: de });
    saldosOrigem = res.data.filter((s) => s.saldo - s.reservado > 0);
  }

  return json({ depositos: depRes.data, saldosOrigem, de });
}

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();

  const de = Number(fd.get("de"));
  const para = Number(fd.get("para"));
  const observacao = String(fd.get("observacao") ?? "").trim() || undefined;

  if (!de || !para) {
    return json({ error: "Selecione depósito de origem e destino." }, { status: 422 });
  }
  if (de === para) {
    return json({ error: "Origem e destino precisam ser diferentes." }, { status: 422 });
  }

  const itens: { produto_variacao_id: number; qtd: number }[] = [];
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith("qtd_")) continue;
    const qtd = Number(value);
    if (!qtd || qtd <= 0) continue;
    const id = Number(key.slice(4));
    if (id > 0) itens.push({ produto_variacao_id: id, qtd });
  }

  if (itens.length === 0) {
    return json({ error: "Informe ao menos uma quantidade a transferir." }, { status: 422 });
  }

  try {
    await painel.estoque.transferir(token, { de, para, itens, observacao });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Falha ao transferir.";
    return json({ error: msg }, { status: 422 });
  }

  return redirect("/painel/estoque");
}

export default function TransferenciasIndex() {
  const { depositos, saldosOrigem, de } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">
            <Link to="/painel/estoque" className="pn-btn-link">
              <ChevronLeft size={12} /> Estoque
            </Link>{" "}
            · Operação
          </span>
          <h1>
            <ArrowRightLeft size={18} /> Transferências entre depósitos
          </h1>
          <p>Selecione o depósito de origem, preencha as quantidades e escolha o destino.</p>
        </div>
      </div>

      <Form method="get" className="pn-card pn-filters">
        <div className="filters-row">
          <select name="de" defaultValue={searchParams.get("de") ?? ""}>
            <option value="">Depósito de origem...</option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
                {d.default ? " (padrão)" : ""}
              </option>
            ))}
          </select>
          <button className="pn-btn-sm">Carregar saldos</button>
        </div>
      </Form>

      {!de ? (
        <div className="pn-card">
          <p className="pn-empty-row">Escolha o depósito de origem para começar.</p>
        </div>
      ) : saldosOrigem.length === 0 ? (
        <div className="pn-card">
          <p className="pn-empty-row">O depósito de origem não tem saldo disponível.</p>
        </div>
      ) : (
        <Form method="post">
          <input type="hidden" name="de" value={de} />
          <div className="pn-card pn-filters" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ fontSize: 12.5 }}>Destino:</label>
            <select name="para" required defaultValue="">
              <option value="" disabled>
                Escolher depósito destino...
              </option>
              {depositos
                .filter((d) => d.id !== de && d.ativo)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
            </select>
            <input
              name="observacao"
              placeholder="Observação (opcional)"
              maxLength={500}
              style={{ flex: 1 }}
            />
          </div>

          <div className="pn-card pn-table-wrap">
            <table className="pn-table">
              <thead>
                <tr>
                  <th>Produto / SKU</th>
                  <th>Disponível</th>
                  <th>Qtd a transferir</th>
                </tr>
              </thead>
              <tbody>
                {saldosOrigem.map((s) => {
                  const disp = Math.max(0, s.saldo - s.reservado);
                  const variacaoId = s.variacao?.id_variacao;
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.variacao?.produto?.nome ?? "—"}</strong>
                        <span className="pn-list-meta">SKU: {s.variacao?.sku ?? "—"}</span>
                      </td>
                      <td>{disp}</td>
                      <td style={{ width: 140 }}>
                        <input
                          type="number"
                          min={0}
                          max={disp}
                          step={1}
                          defaultValue={0}
                          name={variacaoId ? `qtd_${variacaoId}` : undefined}
                          disabled={!variacaoId}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {actionData && "error" in actionData ? (
            <p className="pn-form-err" style={{ marginTop: 8 }}>
              {actionData.error}
            </p>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <Link to="/painel/estoque" className="pn-btn-sm">
              Cancelar
            </Link>
            <button className="pn-btn-sm mint" disabled={enviando}>
              {enviando ? "Transferindo..." : "Confirmar transferência"}
            </button>
          </div>
        </Form>
      )}
    </div>
  );
}
