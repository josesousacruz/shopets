import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  FolderTree,
  Image,
  Ticket,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import painelStyles from "~/styles/painel.css?url";
import contaStyles from "~/styles/conta.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: contaStyles },
  { rel: "stylesheet", href: painelStyles },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAdmin(request);
  return json({ user });
}

const NAV = [
  { to: "/painel", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/painel/pedidos", label: "Pedidos", icon: Package, end: false },
  { to: "/painel/catalogo", label: "Catálogo", icon: Boxes, end: false },
  { to: "/painel/categorias", label: "Categorias", icon: FolderTree, end: false },
  { to: "/painel/banners", label: "Banners", icon: Image, end: false },
  { to: "/painel/cupons", label: "Cupons", icon: Ticket, end: false },
  { to: "/painel/configuracoes", label: "Configurações", icon: Settings, end: false },
];

export default function PainelLayout() {
  const { user } = useLoaderData<typeof loader>();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className={`pn-shell${navOpen ? " nav-open" : ""}`}>
      <div className="pn-backdrop" onClick={() => setNavOpen(false)} aria-hidden />

      <aside className="pn-sidebar">
        <div className="brand">
          <span className="wordmark">
            Shopets
            <small>Painel</small>
          </span>
        </div>
        <nav className="pn-nav">
          <span className="nav-eyebrow">Gestão</span>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="foot">
          <div className="admin">
            <span className="avatar">{(user.name?.[0] ?? "S").toUpperCase()}</span>
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
          <span className="title">Painel do Lojista</span>
          <div className="who">
            <span className="name">
              <strong>{user.name}</strong>
              <span>{user.nivel_acesso}</span>
            </span>
            <Form method="post" action="/painel/logout">
              <button type="submit" className="pn-btn-sm ghost">
                <LogOut size={15} /> Sair
              </button>
            </Form>
          </div>
        </header>

        <div className="pn-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
