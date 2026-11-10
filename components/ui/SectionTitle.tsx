import type { ReactNode } from "react";
import { Underline } from "@/components/brand/Decor";

interface SectionTitleProps {
  children: ReactNode;
  kicker?: string;
  as?: "h1" | "h2";
  className?: string;
  action?: ReactNode;
}

export function SectionTitle({ children, kicker, as: Tag = "h2", className = "", action }: SectionTitleProps) {
  return (
    <div className={`mb-6 flex items-end justify-between gap-4 ${className}`}>
      <div>
        {kicker && <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">{kicker}</p>}
        <Tag className="font-display text-3xl font-bold leading-tight sm:text-4xl">{children}</Tag>
        <Underline className="mt-1 h-3 w-28" />
      </div>
      {action}
    </div>
  );
}
