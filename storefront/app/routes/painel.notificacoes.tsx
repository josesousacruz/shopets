import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData, useSubmit } from "@remix-run/react";
import { CheckCheck, Inbox } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Notificações — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo") ?? undefined;
  const unread = url.searchParams.get("unread") === "1";
  const page = Number(url.searchParams.get("page") ?? "1");

  const res = await painel.notificacoes.list(token, { tipo, unread, page });
  return json(res);
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  await painel.notificacoes.marcarTodasLidas(token);
  return json({ ok: true });
}

export default function NotificacoesPage() {
  const { data, meta } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Sistema</span>
          <h1>Notificações</h1>
          <p>{meta.unread_count} não lida(s) de {meta.total} total.</p>
        </div>
        <div className="pn-head-actions">
          {meta.unread_count > 0 && (
            <Form method="post" onSubmit={(e) => { e.preventDefault(); submit(null, { method: "post" }); }}>
              <button type="submit" className="pn-btn-sm mint">
                <CheckCheck size={14} /> Marcar todas como lidas
              </button>
            </Form>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="pn-card pn-empty">
          <Inbox size={32} color="var(--pn-text-muted)" />
          <p>Nenhuma notificação por aqui.</p>
        </div>
      ) : (
        <div className="pn-card pn-list">
          {data.map((n) => (
            <Link key={n.id} to={n.link ?? "#"} className="pn-list-row">
              <div>
                <strong>{n.titulo}</strong>
                {n.mensagem && <span className="pn-list-sub">{n.mensagem}</span>}
                <span className="pn-list-meta">{n.tipo} · {new Date(n.created_at).toLocaleString("pt-BR")}</span>
              </div>
              {n.lida_em == null && <span className="pn-badge mint">Nova</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
