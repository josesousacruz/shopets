import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { painel, type AdminUser } from "./painel.server";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET é obrigatório em produção (painel).");
}

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-secret-shopets-troque-em-producao";

const storage = createCookieSessionStorage({
  cookie: {
    // Cookie SEPARADO do cliente (__shopets_session) — token de User (admin/gerente).
    name: "__shopets_admin",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    secrets: [SESSION_SECRET],
    maxAge: 60 * 60 * 12, // 12h
  },
});

const TOKEN_KEY = "token";

function getSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

/** Lê o token Bearer admin do cookie (ou null). */
export async function getAdminToken(request: Request): Promise<string | null> {
  const session = await getSession(request);
  const token = session.get(TOKEN_KEY);
  return typeof token === "string" && token.length > 0 ? token : null;
}

/** Cria a sessão admin com o token e redireciona. */
export async function createAdminSession(token: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set(TOKEN_KEY, token);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await storage.commitSession(session) },
  });
}

/** Revoga o token no backend (best-effort) e destrói a sessão. */
export async function adminLogout(request: Request, redirectTo = "/painel/login") {
  const session = await getSession(request);
  const token = session.get(TOKEN_KEY);
  if (typeof token === "string" && token) {
    try {
      await painel.auth.logout(token);
    } catch {
      // token já inválido — segue destruindo o cookie
    }
  }
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await storage.destroySession(session) },
  });
}

/** Exige token admin; senão redireciona para /painel/login?redirectTo=... */
export async function requireAdminToken(
  request: Request,
  redirectTo: string = new URL(request.url).pathname,
): Promise<string> {
  const token = await getAdminToken(request);
  if (!token) {
    const params = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/painel/login?${params}`);
  }
  return token;
}

/**
 * Exige um admin autenticado válido. Retorna {token, user}.
 * Se o token estiver ausente OU inválido (401/403), redireciona ao login.
 */
export async function requireAdmin(
  request: Request,
  redirectTo: string = new URL(request.url).pathname,
): Promise<{ token: string; user: AdminUser }> {
  const token = await requireAdminToken(request, redirectTo);
  const user = await getAdmin(request, token);
  if (!user) {
    const params = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/painel/login?${params}`);
  }
  return { token, user };
}

/** Retorna o admin autenticado ou null (trata 401/403 como null). */
export async function getAdmin(
  request: Request,
  knownToken?: string,
): Promise<AdminUser | null> {
  const token = knownToken ?? (await getAdminToken(request));
  if (!token) return null;
  try {
    const res = await painel.auth.me(token);
    return res.data;
  } catch {
    return null;
  }
}
