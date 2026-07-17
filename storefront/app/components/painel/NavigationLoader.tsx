import { useNavigation } from "@remix-run/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  BarChart3,
  Box,
  Package,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

/** Ícones dos módulos do painel exibidos no overlay (estilo Zoho). */
const MODULOS = [ShoppingCart, Box, Package, Wallet, Users, BarChart3];

/**
 * Feedback de transição entre telas em duas camadas:
 * - barra de progresso fina no topo, só aparece se a navegação passar de 120ms
 *   (navegações rápidas não piscam nada);
 * - overlay com os ícones dos módulos em onda, só após 450ms (navegações
 *   realmente lentas ganham o loader de marca).
 *
 * Cobre apenas `state === "loading"` (navegação/redirect); submits de form já
 * têm feedback próprio nos botões ("Salvando…").
 */
export function NavigationLoader() {
  const navigation = useNavigation();
  const loading = navigation.state === "loading";
  const [bar, setBar] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [done, setDone] = useState(false);
  const visivel = useRef(false);

  useEffect(() => {
    if (loading) {
      setDone(false);
      const t1 = window.setTimeout(() => {
        visivel.current = true;
        setBar(true);
      }, 120);
      const t2 = window.setTimeout(() => setOverlay(true), 450);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
    if (!visivel.current) return;
    // Terminou: completa a barra e faz o fade antes de desmontar.
    setDone(true);
    const t = window.setTimeout(() => {
      visivel.current = false;
      setBar(false);
      setOverlay(false);
      setDone(false);
    }, 280);
    return () => window.clearTimeout(t);
  }, [loading]);

  if (!bar && !overlay) return null;

  return (
    <>
      <div
        className={`pn-progress${done ? " done" : ""}`}
        role="progressbar"
        aria-label="Carregando página"
      />
      {overlay ? (
        <div className={`pn-loadscreen${done ? " done" : ""}`} aria-hidden>
          <div className="tiles">
            {MODULOS.map((Icon, i) => (
              <span key={i} className="tile" style={{ "--i": i } as CSSProperties}>
                <Icon size={20} />
              </span>
            ))}
          </div>
          <span className="msg">Carregando…</span>
        </div>
      ) : null}
    </>
  );
}
