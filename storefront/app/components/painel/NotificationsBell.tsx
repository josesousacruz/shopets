import { useState, useEffect, useRef } from "react";
import { useFetcher, Link } from "@remix-run/react";
import { Bell, Check, CheckCheck } from "lucide-react";
import type { NotificacaoItem } from "~/lib/painel.server";

type FetcherData = {
  data: NotificacaoItem[];
  meta: { unread_count: number; total: number };
};

/**
 * Sino no topbar do painel. Faz polling em /painel/api/notificacoes
 * a cada 60s e abre dropdown com as últimas 10 não-lidas + ações.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fetcher = useFetcher<FetcherData>();
  const data = fetcher.data;
  const unread = data?.meta.unread_count ?? 0;

  useEffect(() => {
    fetcher.load("/painel/api/notificacoes?unread=1");
    const id = window.setInterval(
      () => fetcher.load("/painel/api/notificacoes?unread=1"),
      60_000,
    );
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const marcarTodas = () => {
    fetcher.submit(null, {
      method: "post",
      action: "/painel/api/notificacoes?intent=marcar-todas",
    });
  };

  return (
    <div className="notif-bell" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        title="Notificações"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 && <span className="dot" />}
      </button>

      {open && (
        <div className="notif-menu" role="menu">
          <div className="notif-head">
            <strong>Notificações</strong>
            {unread > 0 && (
              <button type="button" className="link" onClick={marcarTodas}>
                <CheckCheck size={13} /> Marcar todas
              </button>
            )}
          </div>

          {(!data || data.data.length === 0) && (
            <div className="notif-empty">Sem notificações novas.</div>
          )}

          {data?.data.slice(0, 10).map((n) => (
            <Link
              key={n.id}
              to={n.link ?? "/painel/notificacoes"}
              className="notif-item"
              onClick={() => setOpen(false)}
            >
              <div className="notif-body">
                <strong>{n.titulo}</strong>
                {n.mensagem && <span>{n.mensagem}</span>}
              </div>
              {n.lida_em == null && <Check size={14} color="var(--pn-accent)" />}
            </Link>
          ))}

          <div className="notif-foot">
            <Link to="/painel/notificacoes" onClick={() => setOpen(false)}>
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
