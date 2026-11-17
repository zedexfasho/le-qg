import { describe, expect, it } from "vitest";
import {
  describePaymentChange,
  EMPTY_PAYMENT_SETTINGS,
  mobileOptions,
  paymentInstructions,
  paysByMobile,
  publicMobileMoney,
  validatePaymentSettings,
  waveLinkFor,
} from "@/lib/payment";
import { describePromo, normalizePromoCode, promoDiscount, promoProblem, validatePromo, type Promo } from "@/lib/promo";
import { homeFor, isRole } from "@/lib/team";

const promo: Promo = {
  code: "AWA10",
  kind: "percent",
  value: 10,
  label: null,
  minSubtotal: 0,
  maxUses: null,
  firstOrderOnly: false,
  startsAt: null,
  endsAt: null,
  active: true,
};

describe("codes promo", () => {
  it("normalise le code", () => {
    expect(normalizePromoCode(" awa 10 ")).toBe("AWA10");
    expect(normalizePromoCode("ab")).toBeNull();
    expect(normalizePromoCode("ÉTÉ2026")).toBeNull();
    expect(normalizePromoCode(42)).toBeNull();
  });

  it("calcule la remise", () => {
    expect(promoDiscount(promo, 25_000)).toBe(2_500);
    expect(promoDiscount({ kind: "percent", value: 15 }, 9_990)).toBe(1_499);
    expect(promoDiscount({ kind: "fixed", value: 2_000 }, 15_000)).toBe(2_000);
    // jamais plus que le montant des articles
    expect(promoDiscount({ kind: "fixed", value: 5_000 }, 3_000)).toBe(3_000);
    expect(describePromo({ kind: "percent", value: 10 })).toBe("-10 %");
    expect(describePromo({ kind: "fixed", value: 2_000 })).toMatch(/^-2\s000\sFCFA$/);
  });

  it("refuse un code inutilisable, dans l'ordre", () => {
    const ctx = { subtotal: 20_000, uses: 0, today: "2026-11-17" };
    expect(promoProblem(promo, ctx)).toBeNull();
    expect(promoProblem({ ...promo, active: false }, ctx)).toMatch(/plus actif/);
    expect(promoProblem({ ...promo, startsAt: "2026-12-01" }, ctx)).toMatch(/pas encore/);
    expect(promoProblem({ ...promo, endsAt: "2026-11-16" }, ctx)).toMatch(/expiré/);
    expect(promoProblem({ ...promo, endsAt: "2026-11-17" }, ctx)).toBeNull();
    expect(promoProblem({ ...promo, maxUses: 3 }, { ...ctx, uses: 3 })).toMatch(/nombre de fois/);
    expect(promoProblem(promo, { ...ctx, customerUsed: true })).toMatch(/déjà utilisé/);
    expect(promoProblem({ ...promo, firstOrderOnly: true }, { ...ctx, customerHasOrdered: true })).toMatch(/première commande/);
    expect(promoProblem({ ...promo, firstOrderOnly: true }, { ...ctx, customerHasOrdered: false })).toBeNull();
    expect(promoProblem({ ...promo, minSubtotal: 30_000 }, ctx)).toMatch(/dès 30\s000\sFCFA/);
  });

  it("valide le formulaire du dashboard", () => {
    const ok = validatePromo({ code: "tabaski", kind: "fixed", value: "2 000", minSubtotal: "", maxUses: "", startsAt: "2026-11-20", endsAt: "2026-11-30" });
    expect(ok.errors).toEqual({});
    expect(ok.data).toMatchObject({ code: "TABASKI", kind: "fixed", value: 2000, minSubtotal: 0, maxUses: null, active: true, firstOrderOnly: false });

    expect(validatePromo({ code: "X", kind: "percent", value: 95 }).errors).toMatchObject({ code: expect.any(String), value: "Entre 1 et 90 %." });
    expect(validatePromo({ code: "AWA10", kind: "fixed", value: 50 }).errors.value).toBeDefined();
    expect(validatePromo({ code: "AWA10", kind: "nope", value: 10 }).errors.kind).toBeDefined();
    expect(validatePromo({ code: "AWA10", kind: "percent", value: 10, maxUses: 0 }).errors.maxUses).toBeDefined();
    expect(validatePromo({ code: "AWA10", kind: "percent", value: 10, startsAt: "2026-02-31" }).errors.startsAt).toBeDefined();
    expect(validatePromo({ code: "AWA10", kind: "percent", value: 10, startsAt: "2026-12-10", endsAt: "2026-12-01" }).errors.endsAt).toBeDefined();
    expect(validatePromo({ code: "AWA10", kind: "percent", value: 10, active: false, firstOrderOnly: true }).data).toMatchObject({ active: false, firstOrderOnly: true });
  });
});

describe("paiement Wave / Orange Money", () => {
  const config = { holder: "Le QG", wave: "771234567", waveLink: "https://pay.wave.com/m/M_test/c/sn/", orangeMoney: "+221 78 765 43 21" };
  const empty = { holder: "", wave: "", waveLink: "", orangeMoney: "" };

  it("lien Wave avec le montant, https uniquement", () => {
    expect(waveLinkFor(config.waveLink, 27_000)).toBe("https://pay.wave.com/m/M_test/c/sn/?amount=27000");
    expect(waveLinkFor("http://pay.wave.com/m/x", 1000)).toBeNull();
    expect(waveLinkFor("pas un lien", 1000)).toBeNull();
    // Un autre site qu'un lien Wave est refusé (faute de frappe, faux lien)
    expect(waveLinkFor("https://pay-wave.example.com/m/x", 1000)).toBeNull();
    expect(waveLinkFor("", 1000)).toBeNull();
  });

  it("liste les moyens configurés, celui du client en premier", () => {
    expect(mobileOptions(10_000, "wave", empty)).toEqual([]);
    const opts = mobileOptions(10_000, "orange_money", config);
    expect(opts.map((o) => o.method)).toEqual(["orange_money", "wave"]);
    expect(opts[0]).toMatchObject({ number: "78 765 43 21", link: null });
    expect(opts[1]).toMatchObject({ number: "77 123 45 67", link: expect.stringContaining("amount=10000") });
  });

  it("instructions du message « commande confirmée »", () => {
    expect(paysByMobile("especes")).toBe(false);
    expect(paysByMobile(null)).toBe(true);
    expect(paymentInstructions({ ref: "QG-ABC123", total: 15_000, paymentMethod: "especes" }, config)[0]).toMatch(/à la livraison : 15\s000\sFCFA en espèces/);
    const lines = paymentInstructions({ ref: "QG-ABC123", total: 15_000, paymentMethod: "wave" }, config);
    expect(lines[0]).toMatch(/Pour payer 15\s000\sFCFA/);
    expect(lines[1]).toMatch(/^• Wave au 77 123 45 67 \(Le QG\) : https:\/\/pay\.wave\.com\/.*amount=15000$/);
    expect(lines[2]).toMatch(/Orange Money au 78 765 43 21/);
    expect(lines.at(-1)).toMatch(/Motif : QG-ABC123/);
    // Rien de configuré : on n'invente pas d'instructions
    expect(paymentInstructions({ ref: "QG-ABC123", total: 15_000, paymentMethod: "wave" }, empty)).toEqual([]);
  });
});

describe("réglages de paiement (dashboard)", () => {
  it("valide et normalise les numéros", () => {
    const ok = validatePaymentSettings({ holder: " Le  QG ", wave: "+221 77 123 45 67", waveLink: "", orangeMoney: "78 765 43 21", waveEnabled: true, orangeMoneyEnabled: true });
    expect(ok.errors).toEqual({});
    expect(ok.data).toEqual({ holder: "Le QG", wave: "221771234567", waveLink: "", orangeMoney: "221787654321", waveEnabled: true, orangeMoneyEnabled: true });
  });

  it("refuse un numéro ou un lien faux, et un moyen actif sans numéro", () => {
    expect(validatePaymentSettings({ wave: "12345", orangeMoney: "771234567" }).errors.wave).toMatch(/invalide/);
    expect(validatePaymentSettings({ wave: "771234567", waveLink: "https://exemple.com/pay", orangeMoney: "771234567" }).errors.waveLink).toBeDefined();
    expect(validatePaymentSettings({ wave: "", waveLink: "", orangeMoney: "771234567" }).errors.wave).toMatch(/désactive Wave/);
    expect(validatePaymentSettings({ wave: "771234567", orangeMoney: "" }).errors.orangeMoney).toMatch(/désactive Orange Money/);
    // Désactivé : le numéro peut rester vide
    expect(validatePaymentSettings({ wave: "771234567", orangeMoney: "", orangeMoneyEnabled: false }).data?.orangeMoneyEnabled).toBe(false);
    // Lien Wave seul, sans numéro : accepté
    expect(validatePaymentSettings({ wave: "", waveLink: "https://pay.wave.com/m/M_x/c/sn/", orangeMoneyEnabled: false }).errors).toEqual({});
  });

  it("masque un moyen désactivé côté client", () => {
    const s = { ...EMPTY_PAYMENT_SETTINGS, holder: "QG", wave: "221771234567", waveLink: "https://pay.wave.com/m/M_x/c/sn/", orangeMoney: "221787654321", waveEnabled: false };
    expect(publicMobileMoney(s)).toEqual({ holder: "QG", wave: "", waveLink: "", orangeMoney: "221787654321", disabled: ["wave"] });
    expect(mobileOptions(1000, "wave", publicMobileMoney(s)).map((o) => o.method)).toEqual(["orange_money"]);
  });

  it("résume les changements pour l'alerte", () => {
    const before = { ...EMPTY_PAYMENT_SETTINGS, wave: "221771234567", orangeMoney: "221787654321" };
    expect(describePaymentChange(before, before)).toEqual([]);
    expect(describePaymentChange(before, { ...before, wave: "221701112233", orangeMoneyEnabled: false })).toEqual(["Wave : 77 123 45 67 → 70 111 22 33", "Orange Money désactivé"]);
  });
});

describe("rôles", () => {
  it("livreur limité aux livraisons", () => {
    expect(isRole("livreur")).toBe(true);
    expect(isRole("boss")).toBe(false);
    expect(homeFor("livreur")).toBe("/admin/livraisons/");
    expect(homeFor("admin")).toBe("/admin/");
  });
});
