import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";

/** `headingLevel` : 2 quand la grille suit directement le titre h1 de la page */
export function ProductGrid({ products, priorityCount = 0, headingLevel = 3 }: { products: Product[]; priorityCount?: number; headingLevel?: 2 | 3 }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
      {products.map((product, i) => (
        <li key={product.slug}>
          <ProductCard product={product} priority={i < priorityCount} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
