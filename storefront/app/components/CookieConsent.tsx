import { useEffect, useState } from "react";
import { Link } from "@remix-run/react";
import { Cookie, X } from "lucide-react";

export const CONSENT_KEY = "shopets_cookie_consent";
export const CONSENT_EVENT = "shopets:consent";

export type ConsentValue = "accepted" | "rejected" | null;

/** Lê a escolha de consentimento do localStorage (client-only). */
export function readConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(CONSENT_KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

function persistConsent(value: Exclude<ConsentValue, null>) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // ignore
  }
  // Notifica o restante da app (AnalyticsScripts) sem precisar de reload.
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/**
 * Banner LGPD discreto (não bloqueante) no rodapé. Persiste a escolha em
 * localStorage e dispara um evento para liberar/segurar os scripts de analytics.
 */
export function CookieConsent() {
  // SSR: começa oculto (null) e só decide após hidratar para evitar flash/mismatch.
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (readConsent() === null) setVisivel(true);
  }, []);

  if (!visivel) return null;

  function decidir(value: Exclude<ConsentValue, null>) {
    persistConsent(value);
    setVisivel(false);
  }

  return (
    <div className="cookie-consent" role="dialog" aria-label="Aviso de cookies" aria-live="polite">
      <div className="cc-ic" aria-hidden>
        <Cookie size={20} />
      </div>
      <div className="cc-text">
        <strong>Usamos cookies</strong>
        <span>
          Utilizamos cookies para melhorar sua experiência e medir o desempenho da loja. Você pode aceitar
          ou recusar. Saiba mais na{" "}
          <Link to="/institucional/privacidade">Política de Privacidade</Link>.
        </span>
      </div>
      <div className="cc-actions">
        <button type="button" className="cc-btn ghost" onClick={() => decidir("rejected")}>
          Recusar
        </button>
        <button type="button" className="cc-btn mint" onClick={() => decidir("accepted")}>
          Aceitar
        </button>
      </div>
      <button type="button" className="cc-close" aria-label="Fechar" onClick={() => decidir("rejected")}>
        <X size={16} />
      </button>
    </div>
  );
}
