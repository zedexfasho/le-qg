/**
 * Motifs graphiques Le QG, en SVG léger (pas d'images).
 */

/** Guirlande d'ampoules — séparateur de sections et haut du hero */
export function LightString({ className = "", bulbs = 5 }: { className?: string; bulbs?: number }) {
  const width = 600;
  const step = width / (bulbs + 1);
  return (
    <svg viewBox={`0 0 ${width} 70`} className={className} aria-hidden="true" preserveAspectRatio="none" fill="none">
      <path d={`M0 10 Q${width / 4} 38 ${width / 2} 18 T${width} 10`} stroke="currentColor" strokeWidth="2.5" />
      {Array.from({ length: bulbs }, (_, i) => {
        const x = step * (i + 1);
        const y = 22 + (i % 2) * 6;
        return (
          <g key={i}>
            <line x1={x} y1={y - 8} x2={x} y2={y + 6} stroke="currentColor" strokeWidth="2" />
            <circle
              cx={x}
              cy={y + 18}
              r="11"
              className="animate-twinkle fill-sunset"
              style={{ animationDelay: `${(i * 0.7) % 3}s` }}
            />
            <circle cx={x - 3} cy={y + 15} r="3" fill="#FFFDF8" fillOpacity="0.7" />
          </g>
        );
      })}
    </svg>
  );
}

/** Trait orange façon pinceau, comme sous le logo */
export function Underline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 16" className={className} aria-hidden="true" preserveAspectRatio="none">
      <path d="M4 11 Q60 2 120 6 T196 7" stroke="var(--qg-orange)" strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Cintre (repris du badge) */
export function HangerIcon({ className = "", strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7.5V6.6c1-.4 1.8-1.3 1.8-2.4A1.9 1.9 0 0 0 12 2.3c-1 0-1.8.7-1.9 1.6" />
      <path d="M12 7.5 2.6 15.4c-.8.7-.3 2 .7 2h17.4c1 0 1.5-1.3.7-2z" />
    </svg>
  );
}
