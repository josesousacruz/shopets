import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { Plus, Trash2 } from "lucide-react";
import { KpiStrip } from "~/components/painel/KpiStrip";
import { StatusBadge } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "./painel.compras._index";

export const meta: MetaFunction = () => [{ title: "Fornecedor — Painel Shopets" }];

export async function loader({ request: req, params }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const id = params.id!;
  const [fornRes, prodRes, histRes] = await Promise.all([
    painel.fornecedores.show(token, id),
    painel.fornecedores.produtos(token, id),
    painel.fornecedores.historico(token, id),
  ]);
  return json({ fornecedor: fornRes.data, produtos: prodRes.data, historico: histRes.data });
}

export async function action({ request: req, params }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const intent = String(fd.get("intent") ?? "");
  const id = params.id!;

  try {
    if (intent === "vincular") {
      await painel.fornecedores.vincularProduto(token, id, {
        id_produto: Number(fd.get("id_produto")),
        codigo_no_fornecedor: String(fd.get("codigo_no_fornecedor") ?? "") || null,
        preco_custo_fornecedor: fd.get("preco_custo_fornecedor") ? Number(fd.get("preco_custo_fornecedor")) : null,
        fornecedor_principal: fd.get("fornecedor_principal") === "1",
      });
      return redirect(`/painel/fornecedores/${id}?aba=produtos&feedback=criar`);
    }
    if (intent === "desvincular") {
      await painel.fornecedores.desvincularProduto(token, id, String(fd.get("id_produto")));
      return redirect(`/painel/fornecedores/${id}?aba=produtos&feedback=excluir`);
    }
    return json({ erro: "Operação desconhecida." }, { status: 400 });
  } catch (e) {
    if (e instanceof PainelValidationError) {
      return json({ erro: e.message, errors: e.errors }, { status: e.status });
    }
    return json({ erro: "Falha ao processar." }, { status: 500 });
  }
}

export default function FornecedorDetalhe() {
  const { fornecedor, produtos, historico } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  const aba = searchParams.get("aba") ?? "dados";

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Fornecedor</span>
          <h1>
            {fornecedor.nome} <StatusBadge tone={fornecedor.ativo ? "ok" : "muted"}>{fornecedor.ativo ? "Ativo" : "Inativo"}</StatusBadge>
          </h1>
          <p>{fornecedor.cnpj ?? "Sem CNPJ"}</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/fornecedores" className="pn-btn-sm">
            Voltar
          </Link>
          <Link to={`/painel/fornecedores?editar=${fornecedor.id_fornecedor}`} className="pn-btn-sm mint">
            Editar
          </Link>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "Pedidos", value: historico.metricas.total_pedidos, tone: "info" },
          { label: "Total comprado", value: formatBRL(historico.metricas.total_comprado), tone: "ok" },
          { label: "Produtos vinculados", value: produtos.length, tone: "muted" },
        ]}
      />

      <div className="pn-tabs">
        <Link to="?aba=dados" className={aba === "dados" ? "active" : ""}>
          Dados
        </Link>
        <Link to="?aba=produtos" className={aba === "produtos" ? "active" : ""}>
          Produtos
        </Link>
        <Link to="?aba=historico" className={aba === "historico" ? "active" : ""}>
          Histórico
        </Link>
      </div>

      {aba === "dados" ? (
        <div className="pn-card">
          <dl className="pn-dl">
            <div>
              <dt>E-mail</dt>
              <dd>{fornecedor.email ?? "—"}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>{fornecedor.telefone ?? "—"}</dd>
            </div>
            <div>
              <dt>Contato</dt>
              <dd>{fornecedor.contato_principal ?? "—"}</dd>
            </div>
            <div>
              <dt>Prazo médio</dt>
              <dd>{fornecedor.prazo_medio_dias ? `${fornecedor.prazo_medio_dias} dias` : "—"}</dd>
            </div>
            <div>
              <dt>Condição de pagamento</dt>
              <dd>{fornecedor.condicao_pagamento_padrao ?? "—"}</dd>
            </div>
            <div>
              <dt>Desconto padrão</dt>
              <dd>{fornecedor.desconto_padrao ? `${fornecedor.desconto_padrao}%` : "—"}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {aba === "produtos" ? (
        <>
          <div className="pn-card">
            <div className="pn-card-head">
              <h3>Vincular produto</h3>
            </div>
            <Form method="post" replace className="filters-row">
              <input type="hidden" name="intent" value="vincular" />
              <input name="id_produto" type="number" placeholder="ID do produto" required />
              <input name="codigo_no_fornecedor" placeholder="Cód. no fornecedor" />
              <input name="preco_custo_fornecedor" type="number" step="0.01" placeholder="Custo" />
              <label className="pn-check">
                <input type="checkbox" name="fornecedor_principal" value="1" /> Principal
              </label>
              <button type="submit" className="pn-btn-sm mint" disabled={enviando}>
                <Plus size={14} /> Vincular
              </button>
            </Form>
          </div>
          <div className="pn-card pn-table-wrap">
            <table className="pn-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Cód. fornecedor</th>
                  <th>Custo</th>
                  <th>Principal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {produtos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="pn-empty-row">
                      Nenhum produto vinculado.
                    </td>
                  </tr>
                ) : (
                  produtos.map((p) => (
                    <tr key={p.id_produto}>
                      <td>
                        <strong>{p.nome}</strong>
                      </td>
                      <td>{p.codigo_no_fornecedor ?? p.codigo_fornecedor ?? "—"}</td>
                      <td>{p.preco_custo_fornecedor ? formatBRL(Number(p.preco_custo_fornecedor)) : "—"}</td>
                      <td>{p.fornecedor_principal ? <StatusBadge tone="ok">Sim</StatusBadge> : "—"}</td>
                      <td className="pn-row-actions">
                        <Form method="post" replace style={{ display: "inline" }}>
                          <input type="hidden" name="intent" value="desvincular" />
                          <input type="hidden" name="id_produto" value={p.id_produto} />
                          <button type="submit" className="pn-btn-link" disabled={enviando}>
                            <Trash2 size={12} /> Remover
                          </button>
                        </Form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {aba === "historico" ? (
        <div className="pn-card pn-table-wrap">
          <table className="pn-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Data</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {historico.pedidos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pn-empty-row">
                    Nenhum pedido de compra.
                  </td>
                </tr>
              ) : (
                historico.pedidos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.numero}</strong>
                    </td>
                    <td>{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                    <td>{formatBRL(Number(p.total))}</td>
                    <td>
                      <StatusBadge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</StatusBadge>
                    </td>
                    <td className="pn-row-actions">
                      <Link to={`/painel/compras/${p.id}`} className="pn-btn-link">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
