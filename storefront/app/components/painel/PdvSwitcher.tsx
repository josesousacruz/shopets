import { useState, useEffect, useRef } from "react";
import { Form } from "@remix-run/react";
import { Store, ChevronDown, Check, Globe2 } from "lucide-react";
import type { PontoVendaResumo } from "~/lib/painel.server";

interface Props {
  pdvs: PontoVendaResumo[];
  pdvAtivoId: number | null;
}

/**
 * Seletor de contexto do PDV ativo na sidebar do painel.
 * - "Todos os PDVs" = visão consolidada (id null)
 * - Submete para /painel/api/pdv-ativo via Form (action seta cookie)
 */
export function PdvSwitcher({ pdvs, pdvAtivoId }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const ativo = pdvs.find((p) => p.id === pdvAtivoId);
  const label = ativo?.nome ?? "Todos os PDVs";
  const sub = ativo ? "PDV selecionado" : "Visão consolidada";

  return (
    <div className="pn-store" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="si">
          {ativo ? <Store size={16} /> : <Globe2 size={16} />}
        </span>
        <span className="st">
          <strong>{label}</strong>
          <span>{sub}</span>
        </span>
        <ChevronDown size={15} color="var(--pn-text-muted)" />
      </button>

      {open && (
        <div className="pn-store-menu" role="menu">
          <Form method="post" action="/painel/api/pdv-ativo" reloadDocument>
            <button
              type="submit"
              name="id"
              value="all"
              className={`pn-store-item${pdvAtivoId == null ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="si"><Globe2 size={14} /></span>
              <span className="lbl">
                <strong>Todos os PDVs</strong>
                <span>Visão consolidada</span>
              </span>
              {pdvAtivoId == null && <Check size={14} />}
            </button>
            {pdvs.map((p) => (
              <button
                key={p.id}
                type="submit"
                name="id"
                value={String(p.id)}
                className={`pn-store-item${pdvAtivoId === p.id ? " active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="si"><Store size={14} /></span>
                <span className="lbl">
                  <strong>{p.nome}</strong>
                  <span>PDV físico</span>
                </span>
                {pdvAtivoId === p.id && <Check size={14} />}
              </button>
            ))}
          </Form>
        </div>
      )}
    </div>
  );
}
