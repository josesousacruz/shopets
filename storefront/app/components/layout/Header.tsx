import { Link, Form } from "@remix-run/react";
import { Search, ShoppingCart, Menu } from "lucide-react";
import { useState } from "react";
import { MobileNav } from "./MobileNav";

const NAV = [
  { to: "/loja", label: "Loja" },
  { to: "/loja/capas-para-celular", label: "Capas" },
  { to: "/loja/peliculas-e-protetores", label: "Películas" },
  { to: "/loja/carregadores", label: "Carregadores" },
  { to: "/loja/fones-de-ouvido", label: "Fones" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 lg:px-8 h-16 flex items-center gap-4">
        <button
          className="lg:hidden p-2 -ml-2"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" />
        </button>

        <Link to="/" className="font-display font-extrabold text-xl tracking-tight">
          shopets<span className="text-brand-primary">.</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 ml-6">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-medium text-slate-700 hover:text-brand-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Form action="/busca" method="get" className="flex-1 max-w-md ml-auto hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              name="q"
              type="search"
              placeholder="Buscar produtos..."
              className="w-full pl-9 pr-3 py-2 rounded-full bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </Form>

        <Link
          to="/carrinho"
          aria-label="Carrinho"
          className="ml-auto md:ml-0 p-2 hover:text-brand-primary transition-colors"
        >
          <ShoppingCart className="size-5" />
        </Link>
      </div>

      <MobileNav open={open} onClose={() => setOpen(false)} items={NAV} />
    </header>
  );
}
