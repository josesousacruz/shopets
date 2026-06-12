/**
 * painel/charts.tsx — SVG charts portados do handoff "Shopets Admin"
 * (dashboard.jsx): Sparkline, SalesChart (área empilhada) e Donut.
 * Sem dependências externas. Cores via tokens --pn-* do painel.css.
 */
import { useId, useState } from "react";

/* ----------------------------- Sparkline ----------------------------- */
export function Sparkline({
  data,
  color = "var(--pn-accent)",
  w = 88,
  h = 36,
  fill = true,
  strokeW = 1.75,
}: {
  data: number[];
  color?: string;
  w?: number;
  h?: number;
  fill?: boolean;
  strokeW?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / span) * (h - 4) - 2]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gid = "spk" + useId().replace(/:/g, "");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
      {fill && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.16" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ----------------------------- SalesChart ----------------------------- */
export interface SalePoint {
  dia: string;
  ecom: number;
  pdv: number;
}
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function SalesChart({ data }: { data: SalePoint[] }) {
  const W = 760;
  const H = 240;
  const padL = 8;
  const padR = 8;
  const padT = 14;
  const padB = 26;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((d) => d.ecom + d.pdv);
  const max = Math.max(...totals) * 1.12;
  const x = (i: number) => padL + (i / (data.length - 1)) * iw;
  const y = (v: number) => padT + ih - (v / max) * ih;

  const areaPath = (key: "ecom" | "pdv", base: (d: SalePoint) => number) => {
    const top = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(base(d) + d[key]).toFixed(1)}`).join(" ");
    const bottom = data
      .map((_, i) => `L${x(data.length - 1 - i).toFixed(1)},${y(base(data[data.length - 1 - i])).toFixed(1)}`)
      .join(" ");
    return `${top} ${bottom} Z`;
  };
  const linePath = (key: "ecom" | "pdv", base: (d: SalePoint) => number) =>
    data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(base(d) + d[key]).toFixed(1)}`).join(" ");

  const yticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="pnGEcom" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--pn-accent)" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--pn-accent)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="pnGPdv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2563EB" stopOpacity="0.14" />
            <stop offset="1" stopColor="#2563EB" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--pn-divider)" strokeWidth="1" />
            <text x={W - padR} y={y(t) - 4} textAnchor="end" fontSize="10" fill="var(--pn-text-muted)" fontWeight="500">
              {t >= 1000 ? (t / 1000).toFixed(0) + "k" : t}
            </text>
          </g>
        ))}
        <path d={areaPath("pdv", () => 0)} fill="url(#pnGPdv)" />
        <path d={areaPath("ecom", (d) => d.pdv)} fill="url(#pnGEcom)" />
        <path d={linePath("pdv", () => 0)} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path
          d={linePath("ecom", (d) => d.pdv)}
          fill="none"
          stroke="var(--pn-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) =>
          i % 2 === 0 ? (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--pn-text-muted)" fontWeight="500">
              {d.dia}
            </text>
          ) : null,
        )}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke="var(--pn-text-muted)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].pdv + data[hover].ecom)} r="4" fill="var(--pn-accent)" stroke="#fff" strokeWidth="2" />
            <circle cx={x(hover)} cy={y(data[hover].pdv)} r="4" fill="#2563EB" stroke="#fff" strokeWidth="2" />
          </g>
        )}
        {data.map((_, i) => (
          <rect
            key={i}
            x={x(i) - iw / data.length / 2}
            y={padT}
            width={iw / data.length}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {hover != null && (
        <div
          style={{
            position: "absolute",
            left: `${(x(hover) / W) * 100}%`,
            top: 0,
            transform: "translateX(-50%)",
            marginLeft: 0,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "var(--pn-text)",
              color: "#fff",
              borderRadius: 9,
              padding: "9px 12px",
              fontSize: 12,
              boxShadow: "var(--pn-shadow-lg)",
              minWidth: 132,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 5, opacity: 0.7, fontSize: 11 }}>{data[hover].dia}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--pn-accent)" }} />
                E-commerce
              </span>
              <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{brl(data[hover].ecom)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#60A5FA" }} />
                PDV
              </span>
              <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{brl(data[hover].pdv)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Donut ----------------------------- */
export function Donut({ pagar, receber }: { pagar: number; receber: number }) {
  const total = pagar + receber || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  const pagarFrac = pagar / total;
  return (
    <svg width="132" height="132" viewBox="0 0 132 132">
      <circle cx="66" cy="66" r={r} fill="none" stroke="var(--pn-divider)" strokeWidth="14" />
      <circle
        cx="66"
        cy="66"
        r={r}
        fill="none"
        stroke="var(--pn-success)"
        strokeWidth="14"
        strokeDasharray={`${c * (1 - pagarFrac)} ${c}`}
        strokeDashoffset={c * 0.25}
        transform="rotate(-90 66 66)"
        strokeLinecap="round"
      />
      <circle
        cx="66"
        cy="66"
        r={r}
        fill="none"
        stroke="var(--pn-warning)"
        strokeWidth="14"
        strokeDasharray={`${c * pagarFrac} ${c}`}
        strokeDashoffset={-c * (1 - pagarFrac) + c * 0.25}
        transform="rotate(-90 66 66)"
        strokeLinecap="round"
      />
      <text x="66" y="61" textAnchor="middle" fontSize="11" fill="var(--pn-text-muted)" fontWeight="600">
        Saldo
      </text>
      <text x="66" y="78" textAnchor="middle" fontSize="15" fill="var(--pn-text)" fontWeight="700">
        +{((receber - pagar) / 1000).toFixed(1)}k
      </text>
    </svg>
  );
}
