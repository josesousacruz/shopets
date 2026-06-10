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
      <div className="aspect-square rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-400">
        Sem imagem
      </div>
    );
  }

  const principal = imagens[ativa];

  return (
    <div className="flex gap-4">
      {imagens.length > 1 && (
        <div className="hidden md:flex flex-col gap-2 w-20">
          {imagens.map((img, i) => (
            <button
              key={i}
              onClick={() => setAtiva(i)}
              className={cn(
                "aspect-square rounded-xl overflow-hidden border-2 transition-colors",
                i === ativa ? "border-brand-primary" : "border-transparent hover:border-slate-300"
              )}
              aria-label={`Imagem ${i + 1}`}
            >
              <img src={img.url_medium} alt={`${nome} - ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="flex-1">
        <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
          <img
            src={principal.url_large}
            alt={nome}
            className="w-full h-full object-cover"
          />
        </div>

        {imagens.length > 1 && (
          <div className="md:hidden mt-3 flex gap-2 overflow-x-auto">
            {imagens.map((img, i) => (
              <button
                key={i}
                onClick={() => setAtiva(i)}
                className={cn(
                  "shrink-0 w-16 aspect-square rounded-lg overflow-hidden border-2",
                  i === ativa ? "border-brand-primary" : "border-transparent"
                )}
              >
                <img src={img.url_medium} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
