import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  NavLink,
  Outlet,
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
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowRight,
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
      { label: "Pontos de Venda", icon: Store, soon: true },
      { label: "Estoque", icon: Package, soon: true },
      { label: "Fornecedores", icon: Truck, soon: true },
    ],
  },
  {
    label: "Relacionamento",
    items: [{ label: "Clientes", icon: Users, soon: true }],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Visão geral", icon: Wallet, soon: true },
      { label: "Contas a Pagar", icon: TrendingDown, soon: true },
      { label: "Contas a Receber", icon: TrendingUp, soon: true },
      { label: "Fluxo de Caixa", icon: Banknote, soon: true },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Relatórios", icon: BarChart3, soon: true },
      { to: "/painel/configuracoes", label: "Configurações", icon: Settings },
    ],
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

function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const groups = NAV_GROUPS.map((g) => ({
    label: g.label,
    items: g.items.filter((it) => it.to && it.label.toLowerCase().includes(q.toLowerCase())),
  })).filter((g) => g.items.length);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

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
            placeholder="Buscar telas, pedidos, produtos…"
          />
          <span className="kbd" style={{ fontSize: 11, fontWeight: 600, color: "var(--pn-text-muted)" }}>
            ESC
          </span>
        </div>
        <div className="cmd-list">
          {groups.length === 0 && (
            <div style={{ padding: 28, textAlign: "center", fontSize: 13.5, color: "var(--pn-text-muted)" }}>
              Nenhum resultado para “{q}”
            </div>
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <div className="cmd-eyebrow">{g.label}</div>
              {g.items.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.to}
                    type="button"
                    className="cmd-item"
                    onClick={() => {
                      onClose();
                      navigate(it.to as string);
                    }}
                  >
                    <span className="ci">
                      <Icon size={16} />
                    </span>
                    {it.label}
                    <ArrowRight size={15} color="var(--pn-text-muted)" style={{ marginLeft: "auto" }} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
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
          <button
            type="button"
            className="brand-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          </button>
        </div>

        <PdvSwitcher pdvs={pdvs} pdvAtivoId={pdvAtivoId} />

        <nav className="pn-nav">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-eyebrow">{group.label}</span>
              {group.items.map((it) => {
                const Icon = it.icon;
                if (it.soon || !it.to) {
                  return (
                    <span className="navsoon" key={it.label} title="Em breve">
                      <Icon /> {it.label}
                      <span className="tag">em breve</span>
                    </span>
                  );
                }
                const badge = it.badgeKey ? badges[it.badgeKey] : 0;
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    onClick={() => setNavOpen(false)}
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    <Icon /> {it.label}
                    {badge > 0 && <span className="badge">{badge}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="foot">
          <div className="admin">
            <span className="avatar">{initial}</span>
            <span className="meta">
              <strong>{user.name}</strong>
              <span>{user.nivel_acesso}</span>
            </span>
          </div>
          <Form method="post" action="/painel/logout">
            <button type="submit" className="sair">
              <LogOut size={15} /> Sair
            </button>
          </Form>
        </div>
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
