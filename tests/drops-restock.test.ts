import { describe, expect, it } from "vitest";
import { DEFAULT_DROP_COVER, DROP_COVER_RE, dropDateInput, validateDrop } from "@/lib/drops";
import { restockReadyMessage, validateRestockContact } from "@/lib/restock";

describe("validateDrop", () => {
  const valid = { title: "  Drop   de décembre ", date: "2026-12-05", description: " Les pièces de fin d'année. ", cover: "/media/0123456789abcdef0123.webp" };

  it("accepte un drop complet et le normalise", () => {
    const { data, errors } = validateDrop(valid);
    expect(errors).toEqual({});
    expect(data).toMatchObject({ title: "Drop de décembre", date: "2026-12-05T10:00:00.000Z", cover: valid.cover });
    expect(data?.description).toBe("Les pièces de fin d'année.");
  });

  it("refuse un nom vide, une date invalide et une couverture venue d'ailleurs", () => {
    const { data, errors } = validateDrop({ title: "X", date: "2026-02-31", description: "", cover: "https://exemple.com/a.webp" });
    expect(data).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(["cover", "date", "title"]);
  });

  it("refuse une description trop longue", () => {
    expect(validateDrop({ ...valid, description: "a".repeat(301) }).errors.description).toBeTruthy();
    expect(validateDrop({ ...valid, date: "2026-13-45" }).errors.date).toBeTruthy();
  });

  it("garde la date du jour dans le champ date du formulaire", () => {
    expect(dropDateInput("2026-12-05T10:00:00.000Z")).toBe("2026-12-05");
  });

  it("n'accepte que les photos du site ou du dashboard", () => {
    expect(DROP_COVER_RE.test(DEFAULT_DROP_COVER)).toBe(true);
    expect(DROP_COVER_RE.test("/media/0123456789abcdef0123.webp")).toBe(true);
    expect(DROP_COVER_RE.test("/media/../secret.webp")).toBe(false);
    expect(DROP_COVER_RE.test("javascript:alert(1)")).toBe(false);
  });
});

describe("validateRestockContact", () => {
  it("normalise le numéro et rend le prénom facultatif", () => {
    expect(validateRestockContact({ phone: "77 123 45 67", name: "" }).data).toEqual({ phone: "221771234567", name: null });
    expect(validateRestockContact({ phone: "+221 78 555 44 33", name: "  Awa  Diop " }).data).toEqual({ phone: "221785554433", name: "Awa Diop" });
  });

  it("refuse un numéro invalide ou un prénom trop long", () => {
    expect(validateRestockContact({ phone: "12", name: "" }).errors.phone).toBeTruthy();
    expect(validateRestockContact({ phone: "771234567", name: "a".repeat(61) }).errors.name).toBeTruthy();
    expect(validateRestockContact({ phone: 771234567 }).data).toBeNull();
  });
});

describe("restockReadyMessage", () => {
  it("cite la pièce, la taille et le lien de la fiche", () => {
    const text = restockReadyMessage({ name: "Awa", productName: "Hoodie", color: "Noir", size: "M", slug: "hoodie" });
    expect(text).toContain("Salam Awa");
    expect(text).toContain("« Hoodie » en Noir (Taille M)");
    expect(text).toMatch(/\/product\/hoodie\/$/m);
  });

  it("reste poli sans prénom ni taille", () => {
    const text = restockReadyMessage({ name: null, productName: "Bonnet", color: "Gris", size: null, slug: "bonnet" });
    expect(text.startsWith("Salam 👋")).toBe(true);
    expect(text).not.toContain("Taille");
  });
});
