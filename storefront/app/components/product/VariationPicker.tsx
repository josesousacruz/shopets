import * as ToggleGroup from "@radix-ui/react-toggle-group";
import type { Variacao } from "~/types/api";

interface Props {
  variacoes: Variacao[];
  selecionada: Variacao | null;
  onSelecionar: (v: Variacao) => void;
}

export function VariationPicker({ variacoes, selecionada, onSelecionar }: Props) {
  if (variacoes.length === 0) return null;

  // For MVP we assume variations differ by a single attribute (e.g. 'cor').
  const chave = Object.keys(variacoes[0].atributos)[0] ?? "Variação";
  const rotuloChave = chave.charAt(0).toUpperCase() + chave.slice(1);

  return (
    <div className="pdp-variations">
      <div className="vlabel">
        {rotuloChave}:{" "}
        <span>{selecionada ? selecionada.atributos[chave] ?? selecionada.nome : "Selecione"}</span>
      </div>
      <ToggleGroup.Root
        type="single"
        value={selecionada?.id.toString() ?? ""}
        onValueChange={(value) => {
          const v = variacoes.find((x) => x.id.toString() === value);
          if (v) onSelecionar(v);
        }}
        className="pdp-chips"
      >
        {variacoes.map((v) => (
          <ToggleGroup.Item
            key={v.id}
            value={v.id.toString()}
            disabled={!v.disponivel}
            className="pdp-chip"
          >
            {v.atributos[chave] ?? v.nome}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}
