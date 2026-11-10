import { describe, expect, it } from "vitest";
import { site } from "@/data/site";
import type { OrderLine } from "@/lib/types";
import { buildWhatsAppMessage, buildWhatsAppUrl, normalizePhone } from "@/lib/whatsapp";

/** Remplace les espaces insécables par des espaces normaux pour comparer lisiblement */
const plain = (s: string) => s.replace(/ /g, " ");

const hoodie: OrderLine = { name: "Hoodie zippé", color: "Gris chiné", size: "L", qty: 1, unitPrice: 25000 };
const jogging: OrderLine = { name: "Jogging", color: "Noir", size: "M", qty: 2, unitPrice: 15000 };

describe("buildWhatsAppMessage", () => {
  it("produit exactement le format du brief", () => {
    const message = buildWhatsAppMessage([hoodie, jogging], { shopName: "Le QG", paymentLine: "Wave / Orange Money / à la livraison" });
    expect(plain(message)).toBe(
      [
        "Salam Le QG 👋",
        "Je veux commander :",
        "",
        "• Hoodie zippé — Gris chiné — Taille L — x1 — 25 000 FCFA",
        "• Jogging — Noir — Taille M — x2 — 30 000 FCFA",
        "",
        "Total : 55 000 FCFA",
        "Nom :",
        "Quartier / ville de livraison :",
        "Paiement : Wave / Orange Money / à la livraison",
      ].join("\n"),
    );
  });

  it("gère un panier d'un seul article", () => {
    const message = plain(buildWhatsAppMessage([hoodie]));
    expect(message.match(/^• /gm)).toHaveLength(1);
    expect(message).toContain("Total : 25 000 FCFA");
  });

  it("multiplie le prix par la quantité", () => {
    const message = plain(buildWhatsAppMessage([{ ...jogging, qty: 3 }]));
    expect(message).toContain("x3 — 45 000 FCFA");
    expect(message).toContain("Total : 45 000 FCFA");
  });

  it("écrit « Taille unique » pour TU", () => {
    const message = buildWhatsAppMessage([{ name: "Bonnet", color: "Noir", size: "TU", qty: 1, unitPrice: 5000 }]);
    expect(message).toContain("Taille unique");
  });

  it("ignore les lignes à quantité nulle ou invalide", () => {
    const message = plain(buildWhatsAppMessage([hoodie, { ...jogging, qty: 0 }, { ...jogging, qty: Number.NaN }]));
    expect(message).not.toContain("Jogging");
    expect(message).toContain("Total : 25 000 FCFA");
  });

  it("met les retours à la ligne d'un nom sur une seule ligne", () => {
    const message = buildWhatsAppMessage([{ ...hoodie, name: "Hoodie\nzippé  \t  oversize" }]);
    expect(message).toContain("• Hoodie zippé oversize — ");
  });

  it("utilise le nom de la boutique par défaut", () => {
    expect(buildWhatsAppMessage([hoodie]).startsWith(`Salam ${site.name} 👋`)).toBe(true);
  });
});

describe("buildWhatsAppUrl", () => {
  it("encode accents, émojis, &, #, + et retours à la ligne, et se décode à l'identique", () => {
    const message = buildWhatsAppMessage([{ ...hoodie, name: "Maillot n°10 #rétro & co + 🔥", color: "Vert/Blanc ?" }]);
    const url = buildWhatsAppUrl(message, "+221 77 123 45 67");
    expect(url.startsWith("https://wa.me/221771234567?text=")).toBe(true);
    const encoded = url.split("?text=")[1];
    // Rien qui puisse casser l'URL
    expect(encoded).not.toMatch(/[#&+\s?]/);
    expect(decodeURIComponent(encoded)).toBe(message);
    expect(new URL(url).searchParams.get("text")).toBe(message);
  });

  it("sans numéro valide : ouvre WhatsApp sans destinataire, message conservé", () => {
    const url = buildWhatsAppUrl("Salam", "");
    expect(url).toBe("https://wa.me/?text=Salam");
    expect(buildWhatsAppUrl("Salam", "12345")).toBe("https://wa.me/?text=Salam");
  });

  it("sans message", () => {
    expect(buildWhatsAppUrl(undefined, "771234567")).toBe("https://wa.me/221771234567");
  });
});

describe("normalizePhone", () => {
  it.each([
    ["+221 77 123 45 67", "221771234567"],
    ["221771234567", "221771234567"],
    ["00221 77-123-45-67", "221771234567"],
    ["77 123 45 67", "221771234567"],
    ["(76) 123.45.67", "221761234567"],
    ["33 820 00 00", "221338200000"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "12345", "+33 6 12 34 56 78", "221 87 123 45 67", "7712345678", "abc"])("rejette « %s »", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it("rejette null / undefined", () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});
