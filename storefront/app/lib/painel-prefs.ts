const KEY_SIDEBAR = "painel.sidebar.collapsed";
const KEY_PDV = "painel.pdv.ativo";

export function getSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY_SIDEBAR) === "1";
}

export function setSidebarCollapsed(v: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_SIDEBAR, v ? "1" : "0");
}

export function getPdvAtivo(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_PDV);
}

export function setPdvAtivo(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id == null) window.localStorage.removeItem(KEY_PDV);
  else window.localStorage.setItem(KEY_PDV, id);
}
