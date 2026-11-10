import type { Metadata } from "next";
import { DropCard } from "@/components/drops/DropCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { containerClasses } from "@/components/ui/styles";
import { getDropProducts, getDrops } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Les drops",
  description: "Tous les arrivages du QG. Chaque drop, c'est quelques modèles en plusieurs coloris : premier arrivé, premier servi.",
  path: "/drops/",
});

export default async function DropsPage() {
  const drops = await getDrops();
  const counts = await Promise.all(drops.map(async (d) => (await getDropProducts(d.id)).length));

  return (
    <div className={`${containerClasses} pt-8`}>
      <SectionTitle as="h1" kicker="Les arrivages">Les drops du QG</SectionTitle>
      <p className="mb-8 max-w-2xl text-muted">
        Les pièces arrivent par lots. Quand c&apos;est parti, c&apos;est parti : suis nos réseaux pour être prévenu du prochain drop.
      </p>
      {drops.length > 0 ? (
        <ul className="grid gap-6 md:grid-cols-2">
          {drops.map((drop, i) => (
            <li key={drop.id}>
              <DropCard drop={drop} count={counts[i]} priority={i === 0} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-3xl bg-surface-2 p-8 text-center text-muted">Le premier drop arrive bientôt au QG.</p>
      )}
    </div>
  );
}
