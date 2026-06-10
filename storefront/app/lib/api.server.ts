import { env } from "./env.server";
import type { Banner, Categoria, Paginated, ProdutoDetalhe, ProdutoLista } from "~/types/api";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(env.apiBaseUrl + path);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    if (res.status === 404) throw new Response("Not Found", { status: 404 });
    throw new ApiError(res.status, `API ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  produtos: {
    list: (params: Record<string, string | number | undefined>) =>
      get<Paginated<ProdutoLista>>("/produtos", params),
    show: (slug: string) =>
      get<{ data: ProdutoDetalhe }>(`/produtos/${slug}`),
  },
  categorias: {
    list: () => get<{ data: Categoria[] }>("/categorias"),
  },
  banners: {
    list: () => get<{ data: Banner[] }>("/banners"),
  },
  busca: (params: { q: string; por_pagina?: number }) =>
    get<Paginated<ProdutoLista> & { termo: string }>("/busca", params),
};
