import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  NavLink,
  Outlet,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
} from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Box,
  Layers,
  Image,
  Ticket,
  RotateCcw,
  Store,
  Package,
  Truck,
  Users,
  Wallet,
  TrendingDown,
  TrendingUp,
  Banknote,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowRight,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";
import { getSidebarCollapsed, setSidebarCollapsed } from "~/lib/painel-prefs";
import { getPdvAtivo } from "~/lib/pdv-context.server";
import { PdvSwitcher } from "~/components/painel/PdvSwitcher";
import { NotificationsBell } from "~/components/painel/NotificationsBell";
import painelStyles from "~/styles/painel.css?url";
import contaStyles from "~/styles/conta.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: contaStyles },
  { rel: "stylesheet", href: painelStyles },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token, user } = await requireAdmin(request);

  // Badges da nav (Pedidos a separar = pago + em separação; Devoluções na fila
  // = solicitadas). Best-effort: nunca derruba o shell se a API falhar.
  let badges = { pedidos: 0, devolucoes: 0 };
  let pdvs: Awaited<ReturnType<typeof painel.pontosVenda.list>>["data"] = [];
  try {
    const [pago, separacao, devolucoes, pdvList] = await Promise.all([
      painel.pedidos.list(token, { status: "pago" }),
      painel.pedidos.list(token, { status: "em_separacao" }),
      painel.devolucoes.list(token, { status: "solicitada" }),
      painel.pontosVenda.list(token).catch(() => ({ data: [] as typeof pdvs })),
    ]);
    badges = {
      pedidos: pago.meta.total + separacao.meta.total,
      devolucoes: devolucoes.meta.total,
    };
    pdvs = pdvList.data;
  } catch {
    // mantém zeros
  }

  const pdvAtivoId = await getPdvAtivo(request);

  return json({ user, badges, pdvs, pdvAtivoId });
}

type BadgeKey = "pedidos" | "devolucoes";

interface NavEntry {
  to?: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  soon?: boolean;
  badgeKey?: BadgeKey;
}
interface NavGroup {
  label: string;
  items: NavEntry[];
}

/** Fiel ao design "Shopets Admin" (shell.jsx). Itens sem tela no painel ainda
 * são exibidos como "em breve" (Operação, Relacionamento, Financeiro, Relatórios). */
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão geral",
    items: [{ to: "/painel", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    label: "E-commerce",
    items: [
      { to: "/painel/pedidos", label: "Pedidos", icon: ShoppingCart, badgeKey: "pedidos" },
      { to: "/painel/catalogo", label: "Produtos", icon: Box },
      { to: "/painel/categorias", label: "Categorias", icon: Layers },
      { to: "/painel/banners", label: "Banners", icon: Image },
      { to: "/painel/cupons", label: "Cupons", icon: Ticket },
      { to: "/painel/devolucoes", label: "Devoluções", icon: RotateCcw, badgeKey: "devolucoes" },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/painel/estoque", label: "Estoque", icon: Package, end: true },
      { to: "/painel/estoque/transferencias", label: "Transferências", icon: Package },
      { to: "/painel/estoque/inventario", label: "Inventário", icon: Package },
      { to: "/painel/estoque/curva-abc", label: "Curva ABC", icon: BarChart3 },
    ],
  },
  {
    label: "Relacionamento",
    items: [{ to: "/painel/clientes", label: "Clientes", icon: Users }],
  },
  {
    label: "Sistema",
    items: [{ to: "/painel/configuracoes", label: "Configurações", icon: Settings }],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) =>
  g.items.filter((it) => it.to).map((it) => ({ ...it, to: it.to as string, group: g.label })),
);

/** Build a breadcrumb trail (group › item › sub) from the current pathname. */
function useBreadcrumbs(pathname: string): string[] {
  return useMemo(() => {
    const match = [...ALL_ITEMS]
      .filter((it) => (it.end ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + "/")))
      .sort((a, b) => b.to.length - a.to.length)[0];
    if (!match) return ["Painel"];
    const crumbs = [match.group, match.label];
    const rest = pathname.slice(match.to.length).replace(/^\/+/, "");
    if (rest) crumbs.push(rest === "novo" ? "Novo" : "Detalhe");
    return crumbs;
  }, [pathname]);
}

type BuscaResult = {
  data: {
    pedidos: { id: number; numero: string; total: number; status: string }[];
    produtos: { id: number; nome: string; preco_venda: number }[];
    clientes: { id: number; nome: string; email: string }[];
  };
};

function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const fetcher = useFetcher<BuscaResult>();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(q), 250);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (debounced.trim().length >= 2) {
      fetcher.load(`/painel/api/busca?q=${encodeURIComponent(debounced)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const navGroups = NAV_GROUPS.map((g) => ({
    label: g.label,
    items: g.items.filter((it) => it.to && it.label.toLowerCase().includes(q.toLowerCase())),
  })).filter((g) => g.items.length);

  const remote = fetcher.data?.data;
  const hasRemote = !!remote && (
    remote.pedidos.length + remote.produtos.length + remote.clientes.length > 0
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const go = (path: string) => { onClose(); navigate(path); };

  return (
    <div className="pn-cmd-overlay" onClick={onClose}>
      <div className="pn-cmd" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input">
          <Search size={18} color="var(--pn-text-muted)" />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar pedidos, produtos, clientes…"
          />
          <span className="kbd" style={{ fontSize: 11, fontWeight: 600, color: "var(--pn-text-muted)" }}>
            ESC
          </span>
        </div>
        <div className="cmd-list">
          {q.trim().length < 2 && (
            <>
              <div className="cmd-eyebrow">Atalhos</div>
              <button type="button" className="cmd-item" onClick={() => go("/painel/catalogo/novo")}>
                <span className="ci"><Box size={16} /></span>
                Novo produto
                <ArrowRight size={15} color="var(--pn-text-muted)" style={{ marginLeft: "auto" }} />
              </button>
              <button type="button" className="cmd-item" onClick={() => go("/painel/cupons")}>
                <span className="ci"><Ticket size={16} /></span>
                Novo cupom
                <ArrowRight size={15} color="var(--pn-text-muted)" style={{ marginLeft: "auto" }} />
              </button>
            </>
          )}

          {hasRemote && remote!.pedidos.length > 0 && (
            <>
              <div className="cmd-eyebrow">Pedidos</div>
              {remote!.pedidos.map((p) => (
                <button key={`pe-${p.id}`} type="button" className="cmd-item"
                  onClick={() => go(`/painel/pedidos/${p.numero}`)}>
                  <span className="ci"><ShoppingCart size={16} /></span>
                  #{p.numero} — {p.status}
                  <ArrowRight size={15} color="var(--pn-text-muted)" style={{ marginLeft: "auto" }} />
                </button>
              ))}
            </>
          )}
          {hasRemote && remote!.produtos.length > 0 && (
            <>
              <div className="cmd-eyebrow">Produtos</div>
              {remote!.produtos.map((p) => (
                <button key={`pr-${p.id}`} type="button" className="cmd-item"
                  onClick={() => go(`/painel/catalogo/${p.id}`)}>
                  <span className="ci"><Box size={16} /></span>
                  {p.nome}
                  <ArrowRight size={15} color="var(--pn-text-muted)" style={{ marginLeft: "auto" }} />
                </button>
              ))}
            </>
          )}
          {hasRemote && remote!.clientes.length > 0 && (
            <>
              <div className="cmd-eyebrow">Clientes</div>
              {remote!.clientes.map((c) => (
                <button key={`cl-${c.id}`} type="button" className="cmd-item"
                  onClick={() => go(`/painel/clientes/${c.id}`)}>
                  <span className="ci"><Users size={16} /></span>
                  {c.nome} <span style={{ color: "var(--pn-text-muted)", marginLeft: 6 }}>{c.email}</span>
                  <ArrowRight size={15} color="var(--pn-text-muted)" style={{ marginLeft: "auto" }} />
                </button>
              ))}
            </>
          )}

          {navGroups.map((g) => (
            <div key={g.label}>
              <div className="cmd-eyebrow">{g.label}</div>
              {g.items.map((it) => {
                const Icon = it.icon;
                return (
                  <button key={it.to} type="button" className="cmd-item"
                    onClick={() => go(it.to as string)}>
                    <span className="ci"><Icon size={16} /></span>
                    {it.label}
                    <ArrowRight size={15} color="var(--pn-text-muted)" style={{ marginLeft: "auto" }} />
                  </button>
                );
              })}
            </div>
          ))}

          {q.trim().length >= 2 && !hasRemote && navGroups.length === 0 && fetcher.state !== "loading" && (
            <div style={{ padding: 28, textAlign: "center", fontSize: 13.5, color: "var(--pn-text-muted)" }}>
              Nenhum resultado para “{q}”.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FooterUser {
  name: string;
  nivel_acesso?: string | null;
}

function UserFooter({ user, initial }: { user: FooterUser; initial: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".pn-user")) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="foot">
      <div className={`pn-user${open ? " open" : ""}`}>
        <button type="button" className="trigger" onClick={() => setOpen((v) => !v)}>
          <span className="avatar">{initial}</span>
          <span className="meta">
            <strong>{user.name}</strong>
            <span>{user.nivel_acesso || "Admin"}</span>
          </span>
          <span className="more">
            <MoreHorizontal size={16} />
          </span>
        </button>
        {open ? (
          <div className="pn-user-menu" role="menu">
            <Form method="post" action="/painel/logout">
              <button type="submit" className="item">
                <LogOut size={14} /> Sair
              </button>
            </Form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PainelLayout() {
  const { user, badges, pdvs, pdvAtivoId } = useLoaderData<typeof loader>();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [collapsed, setCollapsedState] = useState(false);
  const crumbs = useBreadcrumbs(location.pathname);
  const initial = (user.name?.[0] ?? "S").toUpperCase();

  useEffect(() => {
    setCollapsedState(getSidebarCollapsed());
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsedState(next);
    setSidebarCollapsed(next);
  };

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  return (
    <div className={`pn-shell${navOpen ? " nav-open" : ""}${collapsed ? " collapsed" : ""}`}>
      <div className="pn-backdrop" onClick={() => setNavOpen(false)} aria-hidden />

      <aside className="pn-sidebar">
        <div className="brand">
          <span className="logo">
            <Store size={19} />
          </span>
          <span className="wordmark">
            Shopets
            <small>Admin</small>
          </span>
        </div>

        <button
          type="button"
          className="pn-sidebar-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <PdvSwitcher pdvs={pdvs} pdvAtivoId={pdvAtivoId} />

        <nav className="pn-nav">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-eyebrow">{group.label}</span>
              {group.items.map((it) => {
                if (!it.to) return null;
                const Icon = it.icon;
                const badge = it.badgeKey ? badges[it.badgeKey] : 0;
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    onClick={() => setNavOpen(false)}
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    <span className="ico">
                      <Icon />
                      {badge > 0 && <span className="dot" aria-hidden />}
                    </span>
                    <span className="label">{it.label}</span>
                    {badge > 0 && <span className="badge">{badge}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <UserFooter user={user} initial={initial} />
      </aside>

      <div className="pn-main">
        <header className="pn-topbar">
          <button
            type="button"
            className="menu-btn"
            onClick={() => setNavOpen((v) => !v)}
            aria-label="Menu"
          >
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="crumbs">
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {i > 0 && (
                  <span className="sep">
                    <ChevronRight size={14} />
                  </span>
                )}
                <span className={`c${i === crumbs.length - 1 ? " cur" : ""}`}>{c}</span>
              </span>
            ))}
          </div>

          <div className="spacer" />

          <button type="button" className="search" onClick={() => setCmdOpen(true)}>
            <Search size={16} />
            <span className="ph">Buscar pedidos, produtos…</span>
            <span className="kbd">⌘K</span>
          </button>

          <div className="acts">
            <NotificationsBell />
          </div>

          <div className="who">
            <span className="name">
              <strong>{user.name}</strong>
              <span>{user.nivel_acesso}</span>
            </span>
            <span className="avatar">{initial}</span>
          </div>
        </header>

        <div className="pn-content">
          <Outlet />
        </div>
      </div>

      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  );
}
