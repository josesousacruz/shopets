import type { ShouldRevalidateFunction } from "@remix-run/react";

/**
 * Abrir/fechar um drawer via query param (?novo=1, ?editar=ID) não deve
 * re-executar o loader: os dados do drawer derivam da listagem já em memória,
 * então o open/close precisa ser instantâneo. O mesmo vale para a limpeza de
 * `?feedback=`/`?erro=` feita pelo useFlashFeedback logo após um save.
 *
 * Revalida normalmente quando qualquer OUTRO param muda (filtros, página),
 * quando a pathname muda ou após um submit (formMethod presente).
 *
 * IMPORTANTE: só liste em `drawerParams` params cujos dados o cliente consegue
 * derivar do que o loader já retornou. Se abrir o drawer exige uma chamada
 * extra à API (detalhe que não está na listagem), NÃO liste o param aqui.
 */
export function drawerShouldRevalidate(drawerParams: string[]): ShouldRevalidateFunction {
  const ignorados = [...drawerParams, "feedback", "erro"];
  return ({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }) => {
    // Só mutações (POST/PUT/...) forçam revalidação; form GET (filtros) é
    // navegação comum e segue a comparação de params abaixo.
    if (formMethod && formMethod.toLowerCase() !== "get") return defaultShouldRevalidate;
    if (currentUrl.pathname !== nextUrl.pathname) return defaultShouldRevalidate;
    const atual = new URLSearchParams(currentUrl.search);
    const proxima = new URLSearchParams(nextUrl.search);
    for (const p of ignorados) {
      atual.delete(p);
      proxima.delete(p);
    }
    atual.sort();
    proxima.sort();
    return atual.toString() === proxima.toString() ? false : defaultShouldRevalidate;
  };
}
