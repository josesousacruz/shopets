import { Link, Form, useLocation, useRouteLoaderData } from "@remix-run/react";
import { ShoppingCart, Menu } from "lucide-react";
import { useState } from "react";
import { MobileNav } from "./MobileNav";
import { useCart } from "~/components/cart/CartContext";
import { formatBRL } from "~/lib/format";
import type { Cliente } from "~/types/api";

const CATEGORIES = [
  { to: "/", label: "Início" },
  { to: "/loja/capas-para-celular", label: "Capas para Celular", pill: "novidades" },
  { to: "/loja/peliculas-e-protetores", label: "Películas e Protetores" },
  { to: "/loja/carregadores", label: "Carregadores" },
  { to: "/loja/cabos-usb", label: "Cabos USB" },
  { to: "/loja/fones-de-ouvido", label: "Fones de Ouvido" },
  { to: "/loja/caixas-de-som-bluetooth", label: "Caixas de Som Bluetooth" },
  { to: "/loja/suportes-e-acessorios", label: "Suportes e Acessórios" },
  { to: "/loja/power-banks", label: "Power Banks" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const root = useRouteLoaderData("root") as
    | { cliente?: Cliente | null; cartCount?: number; cartSubtotal?: number }
    | undefined;
  const cliente = root?.cliente ?? null;
  const primeiroNome = cliente?.nome?.trim().split(/\s+/)[0] ?? "";
  const cartCount = root?.cartCount ?? 0;
  const cartSubtotal = root?.cartSubtotal ?? 0;
  const { openCart } = useCart();

  return (
    <>
      {/* ── Utility bar ── */}
      <div className="fc-utility">
        <div className="row">
          <div className="perks">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v9z" />
              </svg>
              Frete grátis acima de R$199
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 10h18M7 15h3" />
              </svg>
              Pix com 5% OFF
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z" />
              </svg>
              Troca em 7 dias
            </span>
          </div>
          <div className="links">
            <a href="#">Acompanhar pedido</a>
            <a href="#">Ajuda</a>
            {cliente ? (
              <Link to="/conta">Minha conta</Link>
            ) : (
              <Link to="/login">Entrar / Criar conta</Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Header row ── */}
      <header className="fc-header">
        <div className="row">
          <button
            className="fc-menu-btn fc-icon-btn"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </button>

          <Link className="fc-logo" to="/">
            <span className="wordmark">
              shopets<span style={{ color: "var(--mint-deep)" }}>.</span>
              <small>capas e acessórios</small>
            </span>
          </Link>

          <Form className="fc-search" action="/busca" method="get">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              name="q"
              type="search"
              placeholder="Buscar capas, películas, carregadores..."
            />
            <span className="scope">
              Tudo
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="m3 5 3 3 3-3" />
              </svg>
            </span>
          </Form>

          <div className="fc-actions">
            <Link
              className="fc-icon-btn"
              to={cliente ? "/conta" : "/login"}
              title={cliente ? "Minha conta" : "Entrar ou criar conta"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
              <span className="stack label">
                {cliente ? (
                  <>
                    <small>Olá, {primeiroNome}</small>
                    Minha conta
                  </>
                ) : (
                  <>
                    <small>Olá!</small>
                    Entrar / Criar conta
                  </>
                )}
              </span>
            </Link>
            <button
              type="button"
              className="fc-icon-btn fc-cart"
              onClick={openCart}
              aria-label={`Carrinho${cartCount > 0 ? `, ${cartCount} ${cartCount === 1 ? "item" : "itens"}` : " vazio"}`}
            >
              <ShoppingCart className="size-5" />
              <span className="stack label">
                <small>Carrinho</small>
                {formatBRL(cartSubtotal)}
              </span>
              {cartCount > 0 && <span className="count">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ── Categories nav ── */}
      <nav className="fc-cats">
        <div className="row">
          {CATEGORIES.map((c) => {
            const active = c.to === "/" ? pathname === "/" : pathname === c.to;
            return (
              <Link key={c.to} to={c.to} className={active ? "active" : undefined}>
                {c.label}
                {c.pill && <span className="pill">{c.pill}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <MobileNav open={open} onClose={() => setOpen(false)} items={CATEGORIES} />
    </>
  );
}
