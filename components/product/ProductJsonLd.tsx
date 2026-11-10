import { site } from "@/data/site";
import { isProductInStock, mainImage } from "@/lib/product";
import type { Product } from "@/lib/types";

/** Correspondance prudente de l'état vers schema.org (rien si l'état est ambigu) */
function itemCondition(condition: string): string | undefined {
  const value = condition.toLowerCase();
  if (value.includes("occasion") || value.includes("seconde main") || value.includes("porté")) return "https://schema.org/UsedCondition";
  if (value.includes("neuf")) return "https://schema.org/NewCondition";
  return undefined;
}

/** Données structurées Product (schema.org) pour Google */
export function ProductJsonLd({ product }: { product: Product }) {
  const url = `${site.url}/product/${product.slug}/`;
  const images = product.variants.flatMap((v) => v.images.slice(0, 1)).map((src) => `${site.url}${src}`);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.slug,
    image: images.length ? images : [`${site.url}${mainImage(product)}`],
    color: product.variants.map((v) => v.color).join(", "),
    ...(product.brandLabel ? { brand: { "@type": "Brand", name: product.brandLabel } } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "XOF",
      price: product.price,
      availability: isProductInStock(product) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      ...(itemCondition(product.condition) ? { itemCondition: itemCondition(product.condition) } : {}),
      seller: { "@type": "Organization", name: site.name },
    },
  };

  return (
    <script
      type="application/ld+json"
      // Échappe "<" pour qu'aucun texte produit ne puisse fermer la balise script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
