import * as ToggleGroup from "@radix-ui/react-toggle-group";
import type { Variacao } from "~/types/api";
import { cn } from "~/lib/format";

interface Props {
  variacoes: Variacao[];
  selecionada: Variacao | null;
  onSelecionar: (v: Variacao) => void;
}

export function VariationPicker({ variacoes, selecionada, onSelecionar }: Props) {
  if (variacoes.length === 0) return null;

  // Group attributes — for MVP we assume each variation differs by a single attribute (e.g. 'cor')
  const chave = Object.keys(variacoes[0].atributos)[0] ?? "Variação";

  return (
    <div>
      <p className="text-sm font-semibold text-ink mb-2">
        {chave.charAt(0).toUpperCase() + chave.slice(1)}:{" "}
        <span className="font-normal text-slate-600">
          {selecionada ? (selecionada.atributos[chave] ?? selecionada.nome) : "Selecione"}
        </span>
      </p>
      <ToggleGroup.Root
        type="single"
        value={selecionada?.id.toString() ?? ""}
        onValueChange={(value) => {
          const v = variacoes.find((x) => x.id.toString() === value);
          if (v) onSelecionar(v);
        }}
        className="flex flex-wrap gap-2"
      >
        {variacoes.map((v) => {
          const label = v.atributos[chave] ?? v.nome;
          return (
            <ToggleGroup.Item
              key={v.id}
              value={v.id.toString()}
              disabled={!v.disponivel}
              className={cn(
                "px-3 py-2 rounded-full border text-sm font-medium transition-all",
                "data-[state=on]:bg-brand-primary data-[state=on]:text-white data-[state=on]:border-brand-primary",
                "data-[state=off]:bg-white data-[state=off]:border-slate-300 data-[state=off]:hover:border-brand-primary",
                !v.disponivel && "opacity-40 line-through cursor-not-allowed"
              )}
            >
              {label}
            </ToggleGroup.Item>
          );
        })}
      </ToggleGroup.Root>
    </div>
  );
}
