import type { ReactNode } from "react";

export type StatusTone = "ok" | "warn" | "danger" | "muted" | "info";

interface Props {
  tone?: StatusTone;
  children: ReactNode;
  title?: string;
}

/**
 * Etiqueta de status com bolinha colorida. Tons:
 *  - ok      verde-azulado (ativo, no ar, em vigência)
 *  - warn    âmbar (agendado, em breve)
 *  - danger  vermelho (expirado, esgotado, com erro)
 *  - info    azul (informativo)
 *  - muted   cinza (inativo, sem dados)
 */
export function StatusBadge({ tone = "muted", children, title }: Props) {
  return (
    <span className={`pn-status pn-status--${tone}`} title={title}>
      {children}
    </span>
  );
}
