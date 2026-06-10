import { useSearchParams } from "@remix-run/react";
import { SlidersHorizontal } from "lucide-react";

const ORDENS = [
  { value: "", label: "Relevância" },
  { value: "preco_asc", label: "Menor preço" },
  { value: "preco_desc", label: "Maior preço" },
  { value: "novidades", label: "Novidades" },
  { value: "nome", label: "Nome A→Z" },
];

interface Props {
  total: number;
  /** action of the GET form (so search/category routes submit to themselves). */
  action?: string;
  /** Opens the mobile filter drawer (omit to hide the button, e.g. on search). */
  onAbrirFiltros?: () => void;
}

export function SortBar({ total, action, onAbrirFiltros }: Props) {
  const [params] = useSearchParams();
  const ordemAtual = params.get("ordem") ?? "";

  // Preserve every param except `ordem` (the select owns it) and `page`
  // (changing sort should reset pagination).
  const hidden = Array.from(params.entries()).filter(
    ([k]) => k !== "ordem" && k !== "page"
  );

  return (
    <div className="sortbar">
      <div className="results-count">
        <b>{total}</b> {total === 1 ? "produto" : "produtos"}
      </div>

      {onAbrirFiltros && (
        <button type="button" className="filters-btn" onClick={onAbrirFiltros}>
          <SlidersHorizontal />
          Filtros
        </button>
      )}

      <div className="spacer" />

      <form method="get" action={action} className="sort">
        <label htmlFor="ordem-select">Ordenar:</label>
        {hidden.map(([k, v], i) => (
          <input key={`${k}-${i}`} type="hidden" name={k} value={v} />
        ))}
        <select
          id="ordem-select"
          name="ordem"
          defaultValue={ordemAtual}
          onChange={(e) => e.currentTarget.form?.submit()}
        >
          {ORDENS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <noscript>
          <button type="submit">Aplicar</button>
        </noscript>
      </form>
    </div>
  );
}
