import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useActionFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";

export const meta: MetaFunction = () => [{ title: "Novo Pedido de Compra — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);

  const [fornRes, depRes, estoque] = await Promise.all([
    painel.fornecedores.list(token, { status: "ativo" }),
    painel.estoque.depositos(token),
    painel.estoque.list(token, {}),
  ]);

  // Dedupe variações (uma por id_variacao) com último custo conhecido.
  const variacoesMap = new Map<number, { id: number; label: string; custo: number }>();
  for (const s of estoque.data) {
    const v = s.variacao;
    if (!v) continue;
    if (!variacoesMap.has(v.id_variacao)) {
      variacoesMap.set(v.id_variacao, {
        id: v.id_variacao,
        label: `${v.produto?.nome ?? "Produto"} — ${v.sku ?? v.id_variacao}`,
        custo: Number(s.custo_medio) || 0,
      });
    }
  }

  return json({
    fornecedores: fornRes.data,
    depositos: depRes.data,
    variacoes: Array.from(variacoesMap.values()),
  });
}

interface ItemRow {
  produto_variacao_id: string;
  qtd: string;
  custo_unit: string;
}

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();

  let itens: { produto_variacao_id: number; qtd: number; custo_unit: number }[] = [];
  try {
    itens = JSON.parse(String(fd.get("itens_json") ?? "[]"));
  } catch {
    itens = [];
  }
  itens = itens.filter((i) => i.produto_variacao_id && i.qtd > 0);

  if (itens.length === 0) {
    return json({ erro: "Adicione ao menos um item válido." }, { status: 422 });
  }

  const body = {
    fornecedor_id: Number(fd.get("fornecedor_id")),
    deposito_id: Number(fd.get("deposito_id")),
    previsao_entrega: String(fd.get("previsao_entrega") ?? "") || null,
    frete: Number(fd.get("frete") ?? 0),
    desconto: Number(fd.get("desconto") ?? 0),
    condicao_pagamento: String(fd.get("condicao_pagamento") ?? "") || null,
    observacoes: String(fd.get("observacoes") ?? "") || null,
    itens,
  };

  try {
    const r = await painel.compras.create(token, body);
    return redirect(`/painel/compras/${r.data.id}?feedback=criar`);
  } catch (e) {
    if (e instanceof PainelValidationError) {
      return json({ erro: e.message, errors: e.errors }, { status: e.status });
    }
    return json({ erro: "Falha ao criar pedido." }, { status: 500 });
  }
}

export default function ComprasNovo() {
  const { fornecedores, depositos, variacoes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);

  const [rows, setRows] = useState<ItemRow[]>([{ produto_variacao_id: "", qtd: "1", custo_unit: "0" }]);
  const [frete, setFrete] = useState("0");
  const [desconto, setDesconto] = useState("0");

  const custoPorVariacao = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of variacoes) m.set(String(v.id), v.custo);
    return m;
  }, [variacoes]);

  function updateRow(i: number, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function onSelectVariacao(i: number, id: string) {
    const custo = custoPorVariacao.get(id);
    updateRow(i, { produto_variacao_id: id, custo_unit: custo ? String(custo) : rows[i].custo_unit });
  }
  function addRow() {
    setRows((prev) => [...prev, { produto_variacao_id: "", qtd: "1", custo_unit: "0" }]);
  }
  function removeRow(i: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  const subtotal = rows.reduce((s, r) => s + Number(r.qtd || 0) * Number(r.custo_unit || 0), 0);
  const total = Math.max(0, subtotal + Number(frete || 0) - Number(desconto || 0));

  const itensJson = JSON.stringify(
    rows
      .filter((r) => r.produto_variacao_id)
      .map((r) => ({
        produto_variacao_id: Number(r.produto_variacao_id),
        qtd: Number(r.qtd || 0),
        custo_unit: Number(r.custo_unit || 0),
      })),
  );

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Operação</span>
          <h1>Novo Pedido de Compra</h1>
          <p>Selecione fornecedor, depósito e itens.</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/compras" className="pn-btn-sm">
            Voltar
          </Link>
        </div>
      </div>

      <Form method="post" replace>
        <input type="hidden" name="itens_json" value={itensJson} />

        <div className="pn-card">
          <div className="pn-field-row">
            <div className="pn-field">
              <label htmlFor="fornecedor_id">Fornecedor *</label>
              <select id="fornecedor_id" name="fornecedor_id" required defaultValue="">
                <option value="" disabled>
                  Selecione…
                </option>
                {fornecedores.map((f) => (
                  <option key={f.id_fornecedor} value={f.id_fornecedor}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="pn-field">
              <label htmlFor="deposito_id">Depósito *</label>
              <select id="deposito_id" name="deposito_id" required defaultValue="">
                <option value="" disabled>
                  Selecione…
                </option>
                {depositos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="pn-field-row">
            <div className="pn-field">
              <label htmlFor="previsao_entrega">Previsão de entrega</label>
              <input id="previsao_entrega" name="previsao_entrega" type="date" />
            </div>
            <div className="pn-field">
              <label htmlFor="condicao_pagamento">Condição de pagamento (ex.: 30/60/90)</label>
              <input id="condicao_pagamento" name="condicao_pagamento" placeholder="à vista ou 30/60" />
            </div>
          </div>
        </div>

        <div className="pn-card">
          <div className="pn-card-head">
            <h3>Itens</h3>
            <button type="button" className="pn-btn-sm" onClick={addRow}>
              <Plus size={14} /> Adicionar item
            </button>
          </div>
          <table className="pn-table">
            <thead>
              <tr>
                <th>Produto / SKU</th>
                <th>Qtd</th>
                <th>Custo unit.</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <select
                      value={r.produto_variacao_id}
                      onChange={(e) => onSelectVariacao(i, e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Selecione…
                      </option>
                      {variacoes.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ width: 90 }}>
                    <input
                      type="number"
                      min={1}
                      value={r.qtd}
                      onChange={(e) => updateRow(i, { qtd: e.target.value })}
                    />
                  </td>
                  <td style={{ width: 120 }}>
                    <input
                      type="number"
                      min={0}
                      step="0.0001"
                      value={r.custo_unit}
                      onChange={(e) => updateRow(i, { custo_unit: e.target.value })}
                    />
                  </td>
                  <td>{formatBRL(Number(r.qtd || 0) * Number(r.custo_unit || 0))}</td>
                  <td className="pn-row-actions">
                    <button type="button" className="pn-btn-link" onClick={() => removeRow(i)}>
                      <Trash2 size={12} /> Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pn-card">
          <div className="pn-field-row">
            <div className="pn-field">
              <label htmlFor="frete">Frete</label>
              <input id="frete" name="frete" type="number" min={0} step="0.01" value={frete} onChange={(e) => setFrete(e.target.value)} />
            </div>
            <div className="pn-field">
              <label htmlFor="desconto">Desconto</label>
              <input id="desconto" name="desconto" type="number" min={0} step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
            </div>
          </div>
          <div className="pn-field">
            <label htmlFor="observacoes">Observações</label>
            <textarea id="observacoes" name="observacoes" rows={2} />
          </div>
          <div className="pn-totais">
            <div>
              Subtotal: <strong>{formatBRL(subtotal)}</strong>
            </div>
            <div>
              Total: <strong>{formatBRL(total)}</strong>
            </div>
          </div>
        </div>

        <div className="pn-form-actions">
          <Link to="/painel/compras" className="pn-btn-sm">
            Cancelar
          </Link>
          <button type="submit" className="pn-btn-sm mint" disabled={enviando}>
            {enviando ? "Salvando…" : "Criar pedido (rascunho)"}
          </button>
        </div>
      </Form>
    </div>
  );
}
