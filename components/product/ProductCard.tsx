import Link from "next/link";
import { ProductImage } from "@/components/product/ProductImage";
import { Price } from "@/components/product/Price";
import { discountPercent, hoverImage, isProductInStock, isVariantInStock, mainImage } from "@/lib/product";
import type { Product } from "@/lib/types";

export function ProductCard({ product, priority = false, headingLevel = 3 }: { product: Product; priority?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const inStock = isProductInStock(product);
  const discount = discountPercent(product);
  const second = hoverImage(product);

  return (
    <article className="group relative">
      <Link href={`/product/${product.slug}/`} className="block rounded-2xl focus-visible:outline-offset-4">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2 shadow-warm transition-shadow duration-300 group-hover:shadow-warm-lg">
          <ProductImage
            src={mainImage(product)}
            alt={product.name}
            fill
            preload={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className={`object-cover transition-[transform,opacity] duration-500 group-hover:scale-[1.03] motion-reduce:transform-none ${inStock ? "" : "opacity-60 grayscale-[40%]"}`}
          />
          {second && (
            <ProductImage
              src={second}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="hidden object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 [@media(hover:hover)]:block"
            />
          )}
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
            {!inStock && <span className="rounded-full bg-brown px-2.5 py-1 text-xs font-bold text-cream">Épuisé</span>}
            {inStock && product.isNew && <span className="rounded-full bg-sunset px-2.5 py-1 text-xs font-bold text-brown">Nouveau</span>}
            {inStock && discount && <span className="rounded-full bg-accent-strong px-2.5 py-1 text-xs font-bold text-on-accent">-{discount}%</span>}
          </div>
        </div>
        <div className="mt-3 px-0.5">
          <Heading className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{product.name}</Heading>
          <Price price={product.price} oldPrice={product.oldPrice} />
        </div>
      </Link>
      {product.variants.length > 1 && (
        <ul className="mt-1.5 flex gap-1.5 px-0.5" aria-label={`${product.variants.length} coloris`}>
          {product.variants.slice(0, 6).map((v) => (
            <li
              key={v.color}
              title={v.color}
              className={`size-3.5 rounded-full border border-ink/25 ${isVariantInStock(v) ? "" : "opacity-40"}`}
              style={{ backgroundColor: v.colorHex }}
            >
              <span className="sr-only">{v.color}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
