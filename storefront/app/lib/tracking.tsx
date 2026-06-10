import { useEffect, useState } from "react";
import { CONSENT_EVENT, readConsent } from "~/components/CookieConsent";

/**
 * Injeta os scripts de analytics (GA4 / Meta Pixel) — SOMENTE no cliente e
 * APENAS após o consentimento LGPD ser "accepted". Antes disso (ou se recusado)
 * nada é carregado, atendendo à LGPD.
 *
 * A injeção é feita via DOM (não no SSR) para que o consentimento, que vive no
 * localStorage, seja respeitado já na primeira renderização sem vazar scripts.
 */
export function AnalyticsScripts({ ga4, pixel }: { ga4?: string; pixel?: string }) {
  const [consent, setConsent] = useState<"accepted" | "rejected" | null>(null);

  // Lê o consentimento inicial e escuta mudanças (banner de cookies / outras abas).
  useEffect(() => {
    setConsent(readConsent());
    const onConsent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setConsent(detail === "accepted" ? "accepted" : "rejected");
    };
    const onStorage = () => setConsent(readConsent());
    window.addEventListener(CONSENT_EVENT, onConsent);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onConsent);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Injeta os scripts uma única vez, quando o consentimento for "accepted".
  useEffect(() => {
    if (consent !== "accepted") return;

    if (ga4 && !document.getElementById("ga4-src")) {
      const s = document.createElement("script");
      s.id = "ga4-src";
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${ga4}`;
      document.head.appendChild(s);

      const inline = document.createElement("script");
      inline.id = "ga4-init";
      inline.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga4}',{anonymize_ip:true});`;
      document.head.appendChild(inline);
    }

    if (pixel && !document.getElementById("fb-pixel")) {
      const inline = document.createElement("script");
      inline.id = "fb-pixel";
      inline.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`;
      document.head.appendChild(inline);
    }
  }, [consent, ga4, pixel]);

  return null;
}
