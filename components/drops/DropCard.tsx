import Link from "next/link";
import { ProductImage } from "@/components/product/ProductImage";
import { formatDate } from "@/lib/format";
import type { Drop } from "@/lib/types";

export function DropCard({ drop, count, priority = false }: { drop: Drop; count: number; priority?: boolean }) {
  return (
    <Link href={`/drops/${drop.id}/`} className="group block overflow-hidden rounded-3xl bg-gradient-to-br from-sunset to-orange text-brown shadow-warm transition-shadow hover:shadow-warm-lg">
      <div className="relative aspect-[3/2] overflow-hidden">
        <ProductImage
          src={drop.cover}
          alt=""
          fill
          preload={priority}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transform-none"
        />
      </div>
      <div className="p-5">
        <p className="text-sm font-semibold">{formatDate(drop.date)}</p>
        <h2 className="font-display text-2xl font-bold">{drop.title}</h2>
        <p className="mt-1 text-sm font-medium">
          {count > 0 ? `${count} pièce${count > 1 ? "s" : ""}` : "Bientôt en ligne"}
        </p>
      </div>
    </Link>
  );
}
