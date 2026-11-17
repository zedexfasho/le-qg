import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LightString } from "@/components/brand/Decor";
import { Logo } from "@/components/brand/Logo";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { buttonClasses, containerClasses } from "@/components/ui/styles";
import { storyPhotos } from "@/data/lookbook";
import { site } from "@/data/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Notre histoire",
  description: "Le QG, c'est la terrasse de notre jeunesse à Dakar : les potes, les chaises en plastique, l'attaya et le coucher de soleil. Aujourd'hui, une boutique streetwear.",
  path: "/notre-histoire/",
});

export default function StoryPage() {
  return (
    <div className={`${containerClasses} pt-8`}>
      <div className="grid items-start gap-10 md:grid-cols-[1fr_320px]">
        <article>
          <SectionTitle as="h1" kicker="Le QG">Notre histoire</SectionTitle>
          <div className="space-y-5 text-lg leading-relaxed">
            {site.story.map((paragraph, i) => (
              <p key={i} className={i === 0 ? "font-medium" : "text-muted"}>
                {paragraph}
              </p>
            ))}
          </div>
          {storyPhotos.length > 0 && (
            <ul className="mt-10 grid grid-cols-3 gap-2 sm:gap-4">
              {storyPhotos.map((photo, i) => (
                <li key={photo.src} className={`rounded-2xl bg-surface p-1.5 shadow-warm sm:p-2 ${i === 1 ? "translate-y-3 rotate-1" : "-rotate-1"}`}>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-2">
                    <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 768px) 220px, 33vw" className="object-cover" />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/shop/" className={buttonClasses("primary", "lg", "mt-10")}>
            Passe au QG
          </Link>
        </article>
        <div className="relative mx-auto overflow-hidden rounded-3xl bg-brown px-6 pt-14 pb-8 md:sticky md:top-24">
          <LightString className="absolute inset-x-0 top-0 h-10 w-full text-cream/40" bulbs={4} />
          <Logo variant="badge" width={260} className="h-auto w-64" />
        </div>
      </div>
    </div>
  );
}
