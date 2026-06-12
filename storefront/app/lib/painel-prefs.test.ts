import { describe, it, expect, beforeEach } from "vitest";
import {
  getSidebarCollapsed,
  setSidebarCollapsed,
  getPdvAtivo,
  setPdvAtivo,
} from "./painel-prefs";

describe("painel-prefs / sidebar", () => {
  beforeEach(() => localStorage.clear());

  it("returns false when nothing stored", () => {
    expect(getSidebarCollapsed()).toBe(false);
  });

  it("persists true and reads back", () => {
    setSidebarCollapsed(true);
    expect(getSidebarCollapsed()).toBe(true);
  });

  it("toggles back to false", () => {
    setSidebarCollapsed(true);
    setSidebarCollapsed(false);
    expect(getSidebarCollapsed()).toBe(false);
  });
});

describe("painel-prefs / pdv ativo", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when nothing stored", () => {
    expect(getPdvAtivo()).toBeNull();
  });

  it("persists string id", () => {
    setPdvAtivo("3");
    expect(getPdvAtivo()).toBe("3");
  });

  it("clears with null", () => {
    setPdvAtivo("5");
    setPdvAtivo(null);
    expect(getPdvAtivo()).toBeNull();
  });
});
