import type { StatusTone } from "./StatusBadge";

export interface KpiItem {
  label: string;
  value: string | number;
  hint?: string;
  tone?: StatusTone;
}

interface Props {
  items: KpiItem[];
}

/**
 * Faixa horizontal de KPIs para o topo de uma seção. Cada KPI recebe um tom
 * que vira a barrinha colorida na lateral esquerda — comunica saúde da seção
 * sem ler números.
 */
export function KpiStrip({ items }: Props) {
  return (
    <div className="pn-kpis">
      {items.map((k) => (
        <div key={k.label} className="pn-kpi" data-tone={k.tone}>
          <span className="label">{k.label}</span>
          <span className="value">{k.value}</span>
          {k.hint ? <span className="hint">{k.hint}</span> : null}
        </div>
      ))}
    </div>
  );
}
