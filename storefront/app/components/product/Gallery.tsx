import { useState } from "react";
import { cn } from "~/lib/format";

interface Imagem {
  url: string;
  url_medium: string;
  url_large: string;
}

export function Gallery({ imagens, nome }: { imagens: Imagem[]; nome: string }) {
  const [ativa, setAtiva] = useState(0);

  if (imagens.length === 0) {
    return (
      <div className="pdp-gallery">
        <div className="main empty">Sem imagem</div>
      </div>
    );
  }

  const principal = imagens[ativa];

  return (
    <div className="pdp-gallery">
      <div className="main">
        <img src={principal.url_large} alt={nome} />
      </div>

      {imagens.length > 1 && (
        <div className="thumbs">
          {imagens.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setAtiva(i)}
              className={cn(i === ativa && "is-active")}
              aria-label={`Imagem ${i + 1} de ${imagens.length}`}
            >
              <img src={img.url_medium} alt={`${nome} — miniatura ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
