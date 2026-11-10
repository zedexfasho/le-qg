import { formatPrice } from "@/lib/format";

export function Price({ price, oldPrice, size = "md" }: { price: number; oldPrice?: number; size?: "md" | "lg" }) {
  const promo = oldPrice !== undefined && oldPrice > price;
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 ${size === "lg" ? "text-2xl" : "text-base"}`}>
      <span className={`font-bold ${promo ? "text-accent-strong" : ""}`}>
        <span className="sr-only">{promo ? "Prix promo : " : "Prix : "}</span>
        {formatPrice(price)}
      </span>
      {promo && (
        <s className={`text-muted ${size === "lg" ? "text-base" : "text-sm"}`}>
          <span className="sr-only">au lieu de </span>
          {formatPrice(oldPrice)}
        </s>
      )}
    </p>
  );
}
