/** Classes partagées pour les boutons (utilisables sur <button> et <Link>) */
type ButtonVariant = "primary" | "secondary" | "whatsapp" | "ghost";
type ButtonSize = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[transform,background-color,box-shadow] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent-strong text-on-accent shadow-warm hover:shadow-warm-lg",
  secondary: "border-2 border-ink/80 text-ink hover:bg-ink/5",
  // Texte brun sur vert WhatsApp : contraste 8,5:1 (le blanc ne fait que 1,9:1)
  whatsapp: "bg-whatsapp text-[#10230F] shadow-warm hover:shadow-warm-lg",
  ghost: "text-ink hover:bg-ink/5",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = ""): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`.trim();
}

export const cardClasses = "rounded-2xl bg-surface shadow-warm";
export const containerClasses = "mx-auto w-full max-w-6xl px-4 sm:px-6";
