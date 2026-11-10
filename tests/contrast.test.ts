import { describe, expect, it } from "vitest";

/** Ratio de contraste WCAG 2.x entre deux couleurs hexadécimales */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Valeurs de app/globals.css
const light = { bg: "#FCEFDA", surface: "#FFFDF8", surface2: "#FDE0AF", ink: "#31160A", muted: "#5A2E17", accentStrong: "#B04A0E", onAccent: "#FFFDF8" };
const dark = { bg: "#1E0E06", surface: "#2A140A", surface2: "#3A1D0E", ink: "#FCEFDA", muted: "#E9CFB0", accentStrong: "#F39A3A", onAccent: "#1E0E06" };

const AA = 4.5;

describe("contrastes AA (texte normal ≥ 4,5:1)", () => {
  it.each([
    ["clair · texte sur fond", light.ink, light.bg],
    ["clair · texte secondaire sur fond", light.muted, light.bg],
    ["clair · texte secondaire sur carte", light.muted, light.surface],
    ["clair · texte secondaire sur sable", light.muted, light.surface2],
    ["clair · bouton principal", light.onAccent, light.accentStrong],
    ["clair · prix promo sur carte", light.accentStrong, light.surface],
    ["clair · prix promo sur fond", light.accentStrong, light.bg],
    ["sombre · texte sur fond", dark.ink, dark.bg],
    ["sombre · texte secondaire sur carte", dark.muted, dark.surface],
    ["sombre · texte secondaire sur fond 2", dark.muted, dark.surface2],
    ["sombre · bouton principal", dark.onAccent, dark.accentStrong],
    ["sombre · prix promo sur carte", dark.accentStrong, dark.surface],
    ["hero · brun sur sunset", "#31160A", "#F39A3A"],
    ["hero · brun sur orange", "#31160A", "#E76117"],
    ["badge Nouveau · brun sur sunset", "#31160A", "#F39A3A"],
    ["footer · crème sur brun", "#FCEFDA", "#31160A"],
    ["bouton WhatsApp · texte sombre sur vert", "#10230F", "#25D366"],
  ])("%s", (_, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA);
  });

  it("le blanc sur le vert WhatsApp serait insuffisant (justifie le texte sombre)", () => {
    expect(contrast("#FFFFFF", "#25D366")).toBeLessThan(AA);
  });
});
