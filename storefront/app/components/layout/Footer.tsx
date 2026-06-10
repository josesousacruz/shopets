import { Link } from "@remix-run/react";

const CATALOGO = [
  { to: "/loja/capas-para-celular", label: "Capas para Celular" },
  { to: "/loja/peliculas-e-protetores", label: "Películas e Protetores" },
  { to: "/loja/carregadores", label: "Carregadores" },
  { to: "/loja/fones-de-ouvido", label: "Fones de Ouvido" },
  { to: "/loja/power-banks", label: "Power Banks" },
];

const SUPORTE = [
  { to: "/institucional/faq", label: "FAQ" },
  { to: "/institucional/trocas", label: "Trocas e devoluções" },
  { to: "/institucional/sobre", label: "Fale conosco" },
  { to: "/institucional/privacidade", label: "Privacidade" },
  { to: "/institucional/termos", label: "Termos" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="fc-footer">
      <div className="grid">
        <div className="brand">
          <Link className="fc-logo" to="/" style={{ color: "#fff" }}>
            <span className="wordmark" style={{ color: "#fff" }}>
              shopets<span style={{ color: "var(--mint)" }}>.</span>
              <small style={{ color: "rgba(255,255,255,.55)" }}>capas e acessórios</small>
            </span>
          </Link>
          <p>
            Capas, películas, carregadores e fones com entrega rápida em todo o
            Brasil. Acessórios para o seu celular com a qualidade que você merece.
          </p>
          <div className="pay">
            <span>PIX</span>
            <span>VISA</span>
            <span>MASTER</span>
            <span>ELO</span>
            <span>BOLETO</span>
          </div>
        </div>

        <div>
          <h4>Catálogo</h4>
          <ul>
            {CATALOGO.map((l) => (
              <li key={l.to}>
                <Link to={l.to}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4>Conta</h4>
          <ul>
            <li><a href="#">Entrar</a></li>
            <li><a href="#">Meus pedidos</a></li>
            <li><a href="#">Lista de desejos</a></li>
          </ul>
        </div>

        <div>
          <h4>Suporte</h4>
          <ul>
            {SUPORTE.map((l) => (
              <li key={l.to}>
                <Link to={l.to}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="legal">
        <span>© {year} Shopets · Todos os direitos reservados</span>
        <span>Termos · Privacidade</span>
      </div>
    </footer>
  );
}
