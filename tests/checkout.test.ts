import { describe, expect, it } from "vitest";
import { CHECKOUT_ZONES, deliveryFeeFor, validateCheckout } from "@/lib/checkout";

const valid = {
  name: "  Awa   Ndiaye ",
  phone: "77 123 45 67",
  district: "Mermoz, près de la pharmacie",
  zone: CHECKOUT_ZONES[0],
  payment: "wave",
  note: "",
};

describe("validateCheckout", () => {
  it("accepte un formulaire complet et nettoie les champs", () => {
    const { data, errors } = validateCheckout(valid);
    expect(errors).toEqual({});
    expect(data).toEqual({
      name: "Awa Ndiaye",
      phone: "221771234567",
      district: "Mermoz, près de la pharmacie",
      zone: CHECKOUT_ZONES[0],
      payment: "wave",
      note: null,
    });
  });

  it("accepte le numéro au format international", () => {
    expect(validateCheckout({ ...valid, phone: "+221 70 222 33 44" }).data?.phone).toBe("221702223344");
  });

  it("signale chaque champ manquant ou invalide", () => {
    const { data, errors } = validateCheckout({ name: "A", phone: "123", district: "", zone: "Paris", payment: "carte" });
    expect(data).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(["district", "name", "payment", "phone", "zone"]);
  });

  it("refuse un message trop long et des valeurs qui ne sont pas du texte", () => {
    expect(validateCheckout({ ...valid, note: "x".repeat(501) }).errors.note).toBeDefined();
    expect(validateCheckout({ ...valid, name: 42, phone: null }).errors).toMatchObject({ name: expect.any(String), phone: expect.any(String) });
  });

  it("garde le message du client", () => {
    expect(validateCheckout({ ...valid, note: "  Livrer après 18h " }).data?.note).toBe("Livrer après 18h");
  });
});

describe("deliveryFeeFor", () => {
  it("renvoie null pour une zone inconnue", () => {
    expect(deliveryFeeFor("Paris")).toBeNull();
  });
});
