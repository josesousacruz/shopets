import { createCookie } from "@remix-run/node";

/**
 * Cookie de contexto do PDV ativo no painel admin.
 * - valor numérico: filtra dashboards/estoque/relatórios por aquele PDV
 * - null: visão consolidada ("Todos os PDVs")
 */
export const pdvCookie = createCookie("painel_pdv_ativo", {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
  httpOnly: true,
  path: "/",
});

export async function getPdvAtivo(request: Request): Promise<number | null> {
  const value = await pdvCookie.parse(request.headers.get("Cookie"));
  return typeof value === "number" ? value : null;
}

export async function serializePdvAtivo(id: number | null): Promise<string> {
  return await pdvCookie.serialize(id);
}
