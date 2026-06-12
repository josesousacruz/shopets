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
import type { MouseEvent } from "react";
import {
  CalendarRange,
  Copy,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Tag,
  Ticket,
  Trash2,
} from "lucide-react";
import { EmptyState } from "~/components/painel/EmptyState";
import { KpiStrip } from "~/components/painel/KpiStrip";
import { StatusBadge, type StatusTone } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { confirmDestrutivo, toastInfo } from "~/lib/painel-swal";
import { painel, PainelValidationError, type CupomAdmin } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Cupons — Painel Shopets" }];

type StatusCupom = "ativo" | "agendado" | "esgotado" | "expirado" | "inativo";

function statusCupom(c: CupomAdmin, agora = new Date()): StatusCupom {
  if (!c.ativo) return "inativo";
  if (c.uso_maximo != null && c.usos_atuais >= c.uso_maximo) return "esgotado";
  if (c.valido_de && new Date(c.valido_de) > agora) return "agendado";
  if (c.valido_ate && new Date(c.valido_ate) < agora) return "expirado";
  return "ativo";
}

const STATUS_TONE: Record<StatusCupom, StatusTone> = {
  ativo: "ok",
  agendado: "warn",
  esgotado: "danger",
  expirado: "danger",
  inativo: "muted",
};
const STATUS_LABEL: Record<StatusCupom, string> = {
  ativo: "Ativo",
  agendado: "Agendado",
  esgotado: "Esgotado",
  expirado: "Expirado",
  inativo: "Inativo",
};

const TIPO_LABEL: Record<CupomAdmin["tipo"], string> = {
  percentual: "Percentual",
  valor_fixo: "Valor fixo",
  frete_gratis: "Frete grátis",
};

function formataDesconto(c: CupomAdmin): string {
  if (c.tipo === "frete_gratis") return "Frete grátis";
  if (c.tipo === "percentual") return `${Number(c.valor).toFixed(0)}% OFF`;
  return Number(c.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + " OFF";
}

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const res = await painel.cupons.list(token);
  const url = new URL(request.url);
  const editarId = url.searchParams.get("editar");
  const editando = editarId
    ? res.data.find((c) => String(c.id) === editarId) ?? null
    : null;
  return json({
    cupons: res.data,
    abrindo: url.searchParams.get("novo") === "1",
    editando,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("_intent") ?? "");

  const payload = () => {
    const tipo = String(form.get("tipo") ?? "percentual") as CupomAdmin["tipo"];
    const str = (k: string) => {
      const v = String(form.get(k) ?? "");
      return v === "" ? null : v;
    };
    return {
      codigo: String(form.get("codigo") ?? "").toUpperCase().trim(),
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
    if (intent === "create") {
      await painel.cupons.create(token, payload());
    } else if (intent === "update") {
      await painel.cupons.update(token, String(form.get("id")), payload());
    } else if (intent === "delete") {
      await painel.cupons.remove(token, String(form.get("id")));
    } else if (intent === "duplicate") {
      const snap = parseSnapshotCupom(form);
      if (!snap) return json({ erro: "Snapshot ausente." }, { status: 400 });
      const sufixo = Math.random().toString(36).slice(2, 6).toUpperCase();
      await painel.cupons.create(token, {
        ...snap,
        codigo: `${snap.codigo}-${sufixo}`,
        ativo: false,
      });
    } else if (intent === "toggle") {
      const snap = parseSnapshotCupom(form);
      if (!snap) return json({ erro: "Snapshot ausente." }, { status: 400 });
      await painel.cupons.update(token, String(form.get("id")), { ...snap, ativo: !snap.ativo });
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
  const destino = intent === "create" || intent === "update" ? "/painel/cupons" : url.pathname + url.search;
  const sep = destino.includes("?") ? "&" : "?";
  return redirect(`${destino}${sep}feedback=${intent}`);
}

function parseSnapshotCupom(form: FormData): {
  codigo: string;
  tipo: CupomAdmin["tipo"];
  valor: number;
  valor_minimo_pedido: number;
  valido_de: string | null;
  valido_ate: string | null;
  uso_maximo: number | null;
  ativo: boolean;
} | null {
  const raw = String(form.get("snapshot") ?? "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function CuponsIndex() {
  const { cupons, abrindo, editando } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const submit = useSubmit();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();
  const q = searchParams.get("q")?.toUpperCase() ?? "";
  const filtroStatus = (searchParams.get("status") ?? "") as StatusCupom | "";
  const filtroTipo = (searchParams.get("tipo") ?? "") as CupomAdmin["tipo"] | "";

  const snapshotCupom = (c: CupomAdmin) =>
    JSON.stringify({
      codigo: c.codigo,
      tipo: c.tipo,
      valor: c.valor,
      valor_minimo_pedido: c.valor_minimo_pedido,
      valido_de: c.valido_de,
      valido_ate: c.valido_ate,
      uso_maximo: c.uso_maximo,
      ativo: c.ativo,
    });

  const handleExcluir = async (e: MouseEvent<HTMLButtonElement>, c: CupomAdmin) => {
    e.preventDefault();
    const ok = await confirmDestrutivo({
      titulo: `Excluir cupom "${c.codigo}"?`,
      mensagem:
        c.usos_atuais > 0
          ? `Este cupom já foi usado ${c.usos_atuais} vez(es). O histórico será preservado, mas o código não estará mais disponível.`
          : "O código será removido permanentemente.",
      confirmar: "Excluir",
    });
    if (!ok) return;
    const fd = new FormData();
    fd.set("_intent", "delete");
    fd.set("id", String(c.id));
    submit(fd, { method: "post", replace: true });
  };

  const comStatus = cupons.map((c) => ({ ...c, status: statusCupom(c) }));
  const visiveis = comStatus.filter(
    (c) =>
      (!q || c.codigo.includes(q)) &&
      (!filtroStatus || c.status === filtroStatus) &&
      (!filtroTipo || c.tipo === filtroTipo),
  );

  const count = (s: StatusCupom) => comStatus.filter((c) => c.status === s).length;
  const usadosTotal = cupons.reduce((sum, c) => sum + (c.usos_atuais ?? 0), 0);

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Promoções</span>
          <h1>Cupons de desconto</h1>
          <p>Crie códigos com regras de período, pedido mínimo e limite de uso.</p>
        </div>
        <div className="pn-head-actions">
          <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset>
            <Plus size={14} /> Novo cupom
          </Link>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "Total", value: cupons.length, tone: "info" },
          { label: "Ativos", value: count("ativo"), tone: "ok" },
          { label: "Agendados", value: count("agendado"), tone: "warn" },
          {
            label: "Vencidos / esgotados",
            value: count("expirado") + count("esgotado"),
            tone: count("expirado") + count("esgotado") > 0 ? "danger" : "muted",
          },
          { label: "Usos acumulados", value: usadosTotal, tone: "muted" },
        ]}
      />

      <Form method="get" className="pn-toolbar">
        <div className="pn-search">
          <Search size={14} />
          <input
            name="q"
            defaultValue={searchParams.get("q") ?? ""}
            placeholder="Buscar código..."
            style={{ textTransform: "uppercase" }}
          />
        </div>
        <select name="status" defaultValue={filtroStatus}>
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="agendado">Agendados</option>
          <option value="expirado">Expirados</option>
          <option value="esgotado">Esgotados</option>
          <option value="inativo">Inativos</option>
        </select>
        <select name="tipo" defaultValue={filtroTipo}>
          <option value="">Todos os tipos</option>
          <option value="percentual">Percentual</option>
          <option value="valor_fixo">Valor fixo</option>
          <option value="frete_gratis">Frete grátis</option>
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
          icon={Ticket}
          title={cupons.length === 0 ? "Nenhum cupom cadastrado" : "Nenhum cupom para esses filtros"}
          description={
            cupons.length === 0
              ? "Use cupons para campanhas pontuais — código de boas-vindas, recuperação de carrinho, promoção sazonal."
              : "Ajuste o código pesquisado, o status ou o tipo do cupom."
          }
          cta={
            cupons.length === 0 ? (
              <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset>
                <Plus size={14} /> Criar primeiro cupom
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="pn-card pn-table-wrap" style={{ padding: 0 }}>
          <table className="pn-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Desconto</th>
                <th>Pedido mínimo</th>
                <th>Usos</th>
                <th>Vigência</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((c) => {
                const pctUso =
                  c.uso_maximo && c.uso_maximo > 0
                    ? Math.min(100, (c.usos_atuais / c.uso_maximo) * 100)
                    : null;
                return (
                  <tr key={c.id}>
                    <td>
                      <CopyCodeButton codigo={c.codigo} />
                    </td>
                    <td>{TIPO_LABEL[c.tipo]}</td>
                    <td>
                      <strong>{formataDesconto(c)}</strong>
                    </td>
                    <td>
                      {Number(c.valor_minimo_pedido) > 0
                        ? Number(c.valor_minimo_pedido).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "—"}
                    </td>
                    <td style={{ minWidth: 100 }}>
                      <div className="pn-usage">
                        <span className="num">
                          {c.usos_atuais}
                          {c.uso_maximo != null ? ` / ${c.uso_maximo}` : ""}
                        </span>
                        {pctUso != null ? (
                          <div className="bar">
                            <span style={{ width: `${pctUso}%` }} />
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--pn-text-muted)" }}>
                      {c.valido_de || c.valido_ate ? (
                        <span
                          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <CalendarRange size={12} />
                          {fmtData(c.valido_de)} → {fmtData(c.valido_ate)}
                        </span>
                      ) : (
                        "Sem prazo"
                      )}
                    </td>
                    <td>
                      <StatusBadge tone={STATUS_TONE[c.status]}>
                        {STATUS_LABEL[c.status]}
                      </StatusBadge>
                    </td>
                    <td className="pn-row-actions" style={{ whiteSpace: "nowrap" }}>
                      <Link
                        to={`?editar=${c.id}`}
                        className="pn-icon-btn"
                        title="Editar"
                        preventScrollReset
                      >
                        <Pencil size={14} />
                      </Link>
                      <Form method="post" replace style={{ display: "inline" }}>
                        <input type="hidden" name="_intent" value="duplicate" />
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="snapshot" value={snapshotCupom(c)} />
                        <button
                          className="pn-icon-btn"
                          title="Duplicar (gera novo código inativo)"
                          disabled={enviando}
                        >
                          <Sparkles size={14} />
                        </button>
                      </Form>
                      <button
                        type="button"
                        className="pn-icon-btn danger"
                        title="Excluir"
                        disabled={enviando}
                        onClick={(e) => handleExcluir(e, c)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(abrindo || editando) ? <DrawerCupom editando={editando} /> : null}
    </div>
  );
}

function CopyCodeButton({ codigo }: { codigo: string }) {
  return (
    <button
      type="button"
      className="pn-coupon-chip"
      title="Copiar código"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(codigo);
          toastInfo(`Código ${codigo} copiado.`);
        } catch {
          /* sem feedback se navegador bloquear */
        }
      }}
    >
      <Tag size={12} /> {codigo} <Copy size={11} />
    </button>
  );
}

function DrawerCupom({ editando }: { editando: CupomAdmin | null }) {
  return (
    <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
      <div className="pn-drawer">
        <div className="pn-drawer-head">
          <h3>{editando ? "Editar cupom" : "Novo cupom"}</h3>
          <Link to="/painel/cupons" className="pn-btn-link" preventScrollReset>
            Fechar
          </Link>
        </div>
        <Form method="post" replace>
          <input type="hidden" name="_intent" value={editando ? "update" : "create"} />
          {editando ? <input type="hidden" name="id" value={editando.id} /> : null}
          <div className="pn-drawer-body">
            <div className="pn-field">
              <label htmlFor="codigo">Código *</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  id="codigo"
                  name="codigo"
                  required
                  maxLength={50}
                  defaultValue={editando?.codigo ?? ""}
                  style={{ textTransform: "uppercase", flex: 1 }}
                  placeholder="BEMVINDO10"
                />
                <button
                  type="button"
                  className="pn-btn-sm"
                  onClick={() => {
                    const el = document.getElementById("codigo") as HTMLInputElement | null;
                    if (!el) return;
                    el.value = Array.from({ length: 8 }, () =>
                      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(
                        Math.floor(Math.random() * 32),
                      ),
                    ).join("");
                  }}
                  title="Gerar código aleatório"
                >
                  <Sparkles size={14} /> Gerar
                </button>
              </div>
            </div>

            <div className="pn-field">
              <label htmlFor="tipo">Tipo de desconto</label>
              <select id="tipo" name="tipo" defaultValue={editando?.tipo ?? "percentual"}>
                <option value="percentual">Percentual (%)</option>
                <option value="valor_fixo">Valor fixo (R$)</option>
                <option value="frete_gratis">Frete grátis</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="pn-field">
                <label htmlFor="valor">Valor</label>
                <input
                  id="valor"
                  name="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editando?.valor ?? 0}
                />
              </div>
              <div className="pn-field">
                <label htmlFor="valor_minimo_pedido">Pedido mínimo (R$)</label>
                <input
                  id="valor_minimo_pedido"
                  name="valor_minimo_pedido"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editando?.valor_minimo_pedido ?? 0}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="pn-field">
                <label htmlFor="valido_de">Válido de</label>
                <input
                  id="valido_de"
                  name="valido_de"
                  type="date"
                  defaultValue={editando?.valido_de?.slice(0, 10) ?? ""}
                />
              </div>
              <div className="pn-field">
                <label htmlFor="valido_ate">Válido até</label>
                <input
                  id="valido_ate"
                  name="valido_ate"
                  type="date"
                  defaultValue={editando?.valido_ate?.slice(0, 10) ?? ""}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="pn-field">
                <label htmlFor="uso_maximo">Limite de uso</label>
                <input
                  id="uso_maximo"
                  name="uso_maximo"
                  type="number"
                  min="1"
                  defaultValue={editando?.uso_maximo ?? ""}
                  placeholder="Sem limite"
                />
              </div>
              <div className="pn-field">
                <label
                  className="pn-switch"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 20 }}
                >
                  <input
                    type="checkbox"
                    name="ativo"
                    value="true"
                    defaultChecked={editando ? editando.ativo : true}
                  />
                  <span className="track" />
                  <span style={{ fontSize: 13 }}>Cupom ativo</span>
                </label>
              </div>
            </div>

            {editando ? (
              <p className="pn-list-meta" style={{ marginTop: 10 }}>
                Já foi usado <strong>{editando.usos_atuais}</strong> vez(es).
              </p>
            ) : null}
          </div>
          <DrawerFootCupom editando={!!editando} />
        </Form>
      </div>
    </div>
  );
}

function DrawerFootCupom({ editando }: { editando: boolean }) {
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  return (
    <div className="pn-drawer-foot">
      <Link to="/painel/cupons" className="pn-btn-sm">
        Cancelar
      </Link>
      <button className="pn-btn-sm mint" disabled={enviando}>
        {enviando ? "Salvando..." : editando ? "Salvar cupom" : "Criar cupom"}
      </button>
    </div>
  );
}
