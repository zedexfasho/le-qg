import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("storage — localStorage indisponible (navigation privée, quota plein)", () => {
  it("bascule en mémoire sans lever d'erreur", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("SecurityError");
        },
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
    });
    const { readStorage, writeStorage } = await import("@/lib/storage");
    expect(() => writeStorage("panier", "[1]")).not.toThrow();
    expect(readStorage("panier")).toBe("[1]");
  });

  it("utilise localStorage quand il fonctionne", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) },
    });
    const { readStorage, writeStorage } = await import("@/lib/storage");
    writeStorage("panier", "[2]");
    expect(store.get("panier")).toBe("[2]");
    expect(readStorage("panier")).toBe("[2]");
  });

  it("côté serveur (pas de window) : ne plante pas", async () => {
    const { readStorage, writeStorage } = await import("@/lib/storage");
    expect(readStorage("x")).toBeNull();
    expect(() => writeStorage("x", "1")).not.toThrow();
  });
});
