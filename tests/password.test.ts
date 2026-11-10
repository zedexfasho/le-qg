import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, safeEqual, temporaryPassword, verifyPassword } from "@/lib/password";

describe("mots de passe", () => {
  it("hachage vérifiable, sel aléatoire", async () => {
    const a = await hashPassword("un-mot-de-passe", undefined, 1000);
    const b = await hashPassword("un-mot-de-passe", undefined, 1000);
    expect(a.hash).not.toBe(b.hash);
    expect(await verifyPassword("un-mot-de-passe", a)).toBe(true);
    expect(await verifyPassword("mauvais", a)).toBe(false);
  });

  it("règles et génération", () => {
    expect(passwordProblem("court")).not.toBeNull();
    expect(passwordProblem("assez-long-ok")).toBeNull();
    expect(temporaryPassword()).toMatch(/^[a-zA-Z2-9]{12}$/);
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
  });
});
