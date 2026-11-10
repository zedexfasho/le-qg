import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryCards, HowToOrder, SocialBlock, StoryTeaser } from "@/components/home/HomeSections";
import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/layout/Marquee";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { containerClasses } from "@/components/ui/styles";
import { getLatestDrop, getNewArrivals, getProducts } from "@/lib/catalog";

export default async function HomePage() {
  const [latestDrop, newArrivals, products] = await Promise.all([getLatestDrop(), getNewArrivals(8), getProducts()]);

  return (
    <>
      <Hero latestDrop={latestDrop} />
      <Marquee />

      <div className={`${containerClasses} space-y-16 pt-12 sm:space-y-20`}>
        <section aria-labelledby="new-title">
          <SectionTitle
            action={
              <Link href="/shop/" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline">
                Tout voir <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          >
            <span id="new-title">Les nouveautés du QG</span>
          </SectionTitle>
          {newArrivals.length > 0 ? (
            <ProductGrid products={newArrivals} />
          ) : (
            <p className="rounded-3xl bg-surface-2 p-8 text-center text-muted">Les premières pièces arrivent très bientôt au QG.</p>
          )}
        </section>

        <CategoryCards products={products} />
        <HowToOrder />
        <StoryTeaser />
        <SocialBlock />
      </div>
    </>
  );
}
