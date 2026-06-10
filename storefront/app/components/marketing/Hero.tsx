import { useEffect, useState } from "react";
import { Link } from "@remix-run/react";
import { ArrowRight, ShoppingCart } from "lucide-react";

const LABELS = [
  { key: "d", label: "dias" },
  { key: "h", label: "horas" },
  { key: "m", label: "min" },
  { key: "s", label: "seg" },
] as const;

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

/** Próximo domingo às 23h59. */
function nextSundayTarget(): Date {
  const t = new Date();
  const dias = (7 - t.getDay()) % 7 || 7;
  t.setDate(t.getDate() + dias);
  t.setHours(23, 59, 59, 0);
  return t;
}

function useCountdown() {
  // SSR-safe: começa com números estáticos, hidrata no cliente.
  const [parts, setParts] = useState({ d: "02", h: "14", m: "35", s: "34" });
  useEffect(() => {
    const target = nextSundayTarget();
    const tick = () => {
      const diff = target.getTime() - Date.now();
      const total = Math.max(0, Math.floor(diff / 1000));
      setParts({
        d: pad(Math.floor(total / 86400)),
        h: pad(Math.floor((total % 86400) / 3600)),
        m: pad(Math.floor((total % 3600) / 60)),
        s: pad(total % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return parts;
}

export function Hero() {
  const c = useCountdown();
  return (
    <section className="hero-promo">
      <div className="row">
        <div>
          <span className="pin">Promoção da semana · Termina domingo</span>
          <h1>
            Proteção completa pro seu celular,
            <br />
            <em>numa compra só.</em>
          </h1>
          <p>
            Capas resistentes, películas de vidro, carregadores rápidos e fones — tudo o
            que o seu celular precisa, com entrega rápida em todo o Brasil.
          </p>
          <div className="cta">
            <Link className="btn-pri" to="/loja?em_promocao=1">
              Ver ofertas
              <ArrowRight className="size-4" />
            </Link>
            <Link className="btn-sec" to="/loja">
              Ver catálogo
            </Link>
          </div>
          <div className="timer" aria-label="Tempo restante da promoção">
            {LABELS.map(({ key, label }) => (
              <div className="tk" key={key}>
                <b>{c[key]}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <article className="featured">
          <div className="crumb">Kit · Capa + Película + Carregador</div>
          <h3>Kit Proteção Total para o seu celular</h3>
          <ul>
            <li>Capa antichoque com bordas reforçadas</li>
            <li>Película de vidro temperado 9H</li>
            <li>Carregador turbo USB-C 20W</li>
            <li>Frete grátis e garantia de 7 dias</li>
          </ul>
          <div className="price-bar">
            <div className="pr">
              <small>R$ 199,90</small>
              <b>
                R$ 129,90
                <span className="pct">−35%</span>
              </b>
            </div>
            <Link className="buy" to="/loja?em_promocao=1">
              <ShoppingCart className="size-4" />
              Comprar
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
