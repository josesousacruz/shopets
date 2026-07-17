import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { me } from "./auth.server";
import type { Cliente } from "~/types/api";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET é obrigatório em produção (storefront).");
}

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-secret-shopets-troque-em-producao";

const storage = createCookieSessionStorage({
  cookie: {
    name: "__shopets_session",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    secrets: [SESSION_SECRET],
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  },
});

const TOKEN_KEY = "token";

function getSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

/** Lê o token Bearer guardado no cookie de sessão (ou null). */
export async function getToken(request: Request): Promise<string | null> {
  const session = await getSession(request);
  const token = session.get(TOKEN_KEY);
  return typeof token === "string" && token.length > 0 ? token : null;
}

/** Cria a sessão com o token e redireciona. */
export async function createUserSession(token: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set(TOKEN_KEY, token);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await storage.commitSession(session) },
  });
}

/** Destrói a sessão e redireciona (default "/"). */
export async function logout(request: Request, redirectTo = "/") {
  const session = await getSession(request);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await storage.destroySession(session) },
  });
}

/** Serializa o Set-Cookie que apaga a sessão (sem redirecionar). */
export async function destroySessionCookie(request: Request): Promise<string> {
  const session = await getSession(request);
  return storage.destroySession(session);
}

/**
 * Exige um cliente autenticado válido e retorna seu token.
 *
 * Valida o token contra a API (/auth/me): se estiver ausente OU inválido
 * (expirado/revogado/banco resetado), LIMPA o cookie de sessão e redireciona
 * para /login. Sem isso, um token morto no cookie fazia as telas de conta
 * estourarem 401 em vez de mandar o usuário logar.
 */
export async function requireToken(
  request: Request,
  redirectTo: string = new URL(request.url).pathname,
): Promise<string> {
  const token = await getToken(request);
  if (token) {
    try {
      await me(token);
      return token;
    } catch {
      // token inválido/expirado — cai na limpeza abaixo
    }
  }
  const params = new URLSearchParams([["redirectTo", redirectTo]]);
  throw redirect(`/login?${params}`, {
    headers: { "Set-Cookie": await destroySessionCookie(request) },
  });
}

/** Retorna o cliente autenticado ou null (trata 401 como null). */
export async function getCliente(request: Request): Promise<Cliente | null> {
  const token = await getToken(request);
  if (!token) return null;
  try {
    const res = await me(token);
    return res.data;
  } catch {
    return null;
  }
}
