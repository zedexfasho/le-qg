import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LightString } from "@/components/brand/Decor";
import { Logo } from "@/components/brand/Logo";
import { containerClasses } from "@/components/ui/styles";
import type { Drop } from "@/lib/types";

export function Hero({ latestDrop }: { latestDrop?: Drop }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-sunset to-orange text-brown">
      <LightString className="absolute inset-x-0 top-0 h-14 w-full text-brown/70 sm:h-20" bulbs={6} />
      <div className={`${containerClasses} grid items-center gap-6 pt-20 pb-14 sm:pt-24 md:grid-cols-[1.1fr_1fr] md:pb-20`}>
        <div className="order-2 text-center md:order-1 md:text-left">
          {latestDrop && (
            <p className="mb-3 inline-block rounded-full bg-brown/90 px-3 py-1 text-xs font-bold tracking-wide text-cream uppercase">
              Le dernier drop vient d&apos;arriver
            </p>
          )}
          <h1 className="font-display text-5xl leading-[1.05] font-bold sm:text-6xl">Bienvenue au QG</h1>
          <p className="mx-auto mt-4 max-w-md text-lg font-medium md:mx-0">
            Le spot streetwear de Dakar. Choisis ta pièce, commande en deux minutes, on te livre.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
            <Link
              href="/shop/"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-brown px-7 font-semibold text-cream shadow-warm-lg transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
            >
              Passe au QG <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            {latestDrop && (
              <Link
                href={`/drops/${latestDrop.id}/`}
                className="inline-flex h-13 items-center justify-center rounded-full border-2 border-brown px-7 font-semibold hover:bg-brown/10"
              >
                Voir le dernier drop
              </Link>
            )}
          </div>
        </div>
        <div className="order-1 flex justify-center md:order-2">
          <Logo variant="badge" width={320} sizes="(min-width: 768px) 320px, (min-width: 640px) 288px, 224px" priority className="h-auto w-56 drop-shadow-[0_18px_30px_rgba(49,22,10,0.35)] sm:w-72 md:w-80" />
        </div>
      </div>
    </section>
  );
}
