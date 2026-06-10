import { Link } from "@remix-run/react";
import { ChevronRight, AlertTriangle } from "lucide-react";

interface Props {
  eyebrow?: string;
  titulo: string;
  subtitulo?: string;
  /** Marca a página como modelo jurídico (mostra aviso "revise com seu jurídico"). */
  rascunhoLegal?: boolean;
  /** Data da última atualização (texto livre, ex.: "Junho de 2026"). */
  atualizadoEm?: string;
  children: React.ReactNode;
}

/**
 * Casca padrão das páginas institucionais — header navy/mint + container de
 * conteúdo legível. Mantém a tipografia/cores da loja (ink #04031E, mint #88E2CA).
 */
export function InstitucionalLayout({
  eyebrow,
  titulo,
  subtitulo,
  rascunhoLegal,
  atualizadoEm,
  children,
}: Props) {
  return (
    <div className="bg-[#FAFAF7]">
      <header className="bg-[#04031E] text-white">
        <div className="mx-auto max-w-3xl px-4 lg:px-8 py-12">
          <nav className="mb-5 flex items-center gap-1.5 text-[13px] text-white/55">
            <Link to="/" className="hover:text-[#88E2CA] transition-colors">
              Início
            </Link>
            <ChevronRight size={13} />
            <span className="text-white/80">{titulo}</span>
          </nav>
          {eyebrow && (
            <span className="inline-block text-[12px] font-bold uppercase tracking-[.14em] text-[#88E2CA] mb-3">
              {eyebrow}
            </span>
          )}
          <h1 className="font-display font-extrabold text-3xl lg:text-[34px] leading-tight">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="mt-3 text-[15px] leading-relaxed text-white/70 max-w-2xl">{subtitulo}</p>
          )}
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 lg:px-8 py-12">
        {rascunhoLegal && (
          <div className="mb-8 flex gap-3 rounded-xl border border-[#88E2CA]/60 bg-[#88E2CA]/12 px-4 py-3.5 text-[14px] leading-relaxed text-ink">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#0b8f72]" />
            <span>
              <strong className="font-bold">Modelo — revise com seu jurídico.</strong> Este texto é
              um rascunho de referência e deve ser validado por um(a) advogado(a) antes de entrar em
              vigor.
            </span>
          </div>
        )}

        <div className="inst-prose">{children}</div>

        {atualizadoEm && (
          <p className="mt-12 border-t border-ink/10 pt-6 text-[13px] text-slate-500">
            Última atualização: {atualizadoEm}.
          </p>
        )}
      </article>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .inst-prose{color:#3a3950;font-size:15.5px;line-height:1.72;font-family:'Inter',system-ui,sans-serif}
            .inst-prose h2{font-family:'Manrope',sans-serif;font-weight:800;color:#04031E;font-size:21px;margin:34px 0 12px;letter-spacing:-.01em}
            .inst-prose h2:first-child{margin-top:0}
            .inst-prose h3{font-family:'Manrope',sans-serif;font-weight:700;color:#04031E;font-size:16.5px;margin:22px 0 8px}
            .inst-prose p{margin:0 0 14px}
            .inst-prose ul,.inst-prose ol{margin:0 0 16px;padding-left:22px}
            .inst-prose li{margin:0 0 8px}
            .inst-prose ul li{list-style:disc}
            .inst-prose ol li{list-style:decimal}
            .inst-prose strong{color:#04031E;font-weight:700}
            .inst-prose a{color:#0b8f72;font-weight:600;text-decoration:underline;text-underline-offset:2px}
            .inst-prose code{background:rgba(136,226,202,.2);border:1px solid rgba(136,226,202,.45);border-radius:6px;padding:1px 6px;font-size:13px;color:#04031E}
            .inst-prose .lead{font-size:17px;color:#04031E;font-weight:500}
          `,
        }}
      />
    </div>
  );
}
