"use client";

/**
 * Écran d'attente Le QG : la théière verse l'attaya de haut (pour la mousse),
 * le verre se remplit, et on passe au verre suivant : 1er amer, 2e doux, 3e sucré.
 * Animations en CSS (app/globals.css, classes qg-*), coupées si l'appareil demande moins de mouvement.
 */
import { useEffect, useId, useState } from "react";
import { LightString } from "./Decor";

const MESSAGES = {
  site: [
    "On sert le thé, installe-toi…",
    "On fait mousser l'attaya…",
    "On plie les hoodies…",
    "On cherche ta taille dans la réserve…",
    "Le livreur fait chauffer le Jakarta…",
    "On allume la guirlande…",
  ],
  admin: [
    "On compte la caisse…",
    "On range les commandes…",
    "On vérifie le stock…",
    "On réveille le livreur…",
    "On fait mousser l'attaya…",
  ],
} as const;

const GLASSES = [
  { n: "1er", taste: "amer" },
  { n: "2e", taste: "doux" },
  { n: "3e", taste: "sucré" },
];

/** Durée d'un verre (doit correspondre à --qg-pour dans globals.css) */
const TICK_MS = 2400;

type Props = {
  /** Texte lu par les lecteurs d'écran et affiché en premier */
  label?: string;
  tone?: keyof typeof MESSAGES;
  /** full : écran entier (chargement de page) ; compact : dans une page du dashboard */
  variant?: "full" | "compact";
};

export function FunLoader({ label, tone = "site", variant = "full" }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const messages = label ? [label, ...MESSAGES[tone]] : MESSAGES[tone];
  const message = messages[tick % messages.length];
  const glass = tick % GLASSES.length;
  const compact = variant === "compact";

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center ${compact ? "gap-2 py-10" : "min-h-[60vh] gap-4 px-4 py-12"}`}
    >
      <span className="sr-only">{label ?? "Chargement…"}</span>

      {!compact && <LightString className="h-12 w-64 text-ink/50 sm:w-80" bulbs={4} />}

      <TeaScene key={glass} className={compact ? "h-28 w-24" : "h-48 w-40 sm:h-56 sm:w-44"} />

      <p aria-hidden="true" className={`font-display font-semibold text-ink ${compact ? "text-base" : "text-xl sm:text-2xl"}`}>
        {message}
      </p>

      <ol aria-hidden="true" className={`flex items-center gap-2 ${compact ? "text-[11px]" : "text-xs"}`}>
        {GLASSES.map((g, i) => (
          <li
            key={g.n}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition-colors ${
              i < glass
                ? "border-accent/40 bg-accent/10 text-accent-strong"
                : i === glass
                  ? "border-accent bg-accent text-on-accent"
                  : "border-line text-muted"
            }`}
          >
            {g.n} <span className="font-normal opacity-80">· {g.taste}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Théière qui verse de haut dans un petit verre à thé (SVG, couleurs du thème) */
function TeaScene({ className = "" }: { className?: string }) {
  const clip = `qg-glass-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="30 0 122 156" className={className} aria-hidden="true" fill="none">
      <defs>
        <clipPath id={clip}>
          <path d="M94.5 99 L98.5 144.5 L121.5 144.5 L125.5 99 Z" />
        </clipPath>
      </defs>

      {/* Sol / plateau */}
      <ellipse cx="110" cy="150" rx="34" ry="4.5" className="fill-ink/10" />

      {/* Filet de thé versé de haut (c'est ce qui fait la mousse) */}
      <path d="M104 58 Q108 86 110 140" className="qg-stream stroke-orange" strokeWidth="3" strokeLinecap="round" />

      {/* Verre : thé + mousse qui monte */}
      <g clipPath={`url(#${clip})`}>
        <g className="qg-fill">
          <rect x="90" y="99" width="40" height="48" className="fill-orange-deep" />
          <rect x="90" y="99" width="40" height="10" className="fill-cream" />
          <circle cx="101" cy="104" r="1.8" className="qg-bubble fill-sand" />
          <circle cx="110" cy="103" r="1.4" className="qg-bubble fill-sand" style={{ animationDelay: "0.4s" }} />
          <circle cx="119" cy="105" r="1.6" className="qg-bubble fill-sand" style={{ animationDelay: "0.9s" }} />
        </g>
      </g>
      <path d="M93 98 L97.5 146 L122.5 146 L127 98" className="stroke-ink/70" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M99 106 L101 138" className="stroke-white/50" strokeWidth="2" strokeLinecap="round" />

      {/* Vapeur */}
      <path d="M134 94 q-5 -8 0 -16 q5 -8 0 -16" className="qg-steam stroke-ink/30" strokeWidth="2" strokeLinecap="round" />
      <path d="M143 98 q-4 -7 0 -13 q4 -7 0 -13" className="qg-steam stroke-ink/25" strokeWidth="2" strokeLinecap="round" style={{ animationDelay: "0.8s" }} />

      {/* Théière (pivote autour du bec pour que le filet reste accroché) */}
      <g className="qg-teapot">
        <path d="M44 34 Q30 42 44 56" className="stroke-ink" strokeWidth="4" strokeLinecap="round" />
        <path d="M46 40 Q46 24 68 24 Q90 24 90 40 L92 58 Q69 67 44 58 Z" className="fill-sand stroke-ink" strokeWidth="3" strokeLinejoin="round" />
        <path d="M58 26 Q68 14 78 26" className="fill-sunset stroke-ink" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="68" cy="15" r="3.5" className="fill-orange stroke-ink" strokeWidth="2" />
        <path d="M54 42 Q68 46 84 42" className="stroke-ink/30" strokeWidth="2" strokeLinecap="round" />
        <path d="M89 47 Q99 48 104 58" className="stroke-ink" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
