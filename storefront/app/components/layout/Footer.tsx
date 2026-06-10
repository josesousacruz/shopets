import { Link } from "@remix-run/react";

const FOOTER_LINKS = [
  { to: "/institucional/sobre", label: "Sobre" },
  { to: "/institucional/faq", label: "FAQ" },
  { to: "/institucional/trocas", label: "Trocas e devoluções" },
  { to: "/institucional/privacidade", label: "Privacidade" },
  { to: "/institucional/termos", label: "Termos de uso" },
];

export function Footer() {
  return (
    <footer className="bg-ink text-slate-300 mt-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8 py-12 grid gap-8 md:grid-cols-3">
        <div>
          <p className="font-display font-extrabold text-white text-xl tracking-tight">
            shopets<span className="text-brand-accent">.</span>
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Capas e acessórios para celular com entrega rápida em todo o Brasil.
          </p>
        </div>

        <div>
          <p className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Atendimento</p>
          <ul className="space-y-2 text-sm">
            {FOOTER_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-white transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Pagamento</p>
          <p className="text-sm text-slate-400">Pix, cartão de crédito e boleto.</p>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-4 text-xs text-slate-500">
          © {new Date().getFullYear()} Shopets. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
