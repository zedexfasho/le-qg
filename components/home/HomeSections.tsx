import Link from "next/link";
import { ArrowRight, MessageCircle, Shirt, Truck } from "lucide-react";
import { LightString } from "@/components/brand/Decor";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { ProductImage } from "@/components/product/ProductImage";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { buttonClasses } from "@/components/ui/styles";
import { categories } from "@/data/categories";
import { site } from "@/data/site";
import { mainImage } from "@/lib/product";
import type { Product } from "@/lib/types";
import { buildWhatsAppUrl, contactMessage } from "@/lib/whatsapp";

export function CategoryCards({ products }: { products: Product[] }) {
  const cards = categories
    .map((c) => ({ ...c, product: products.find((p) => p.category === c.id) }))
    .filter((c) => c.product);

  return (
    <section aria-labelledby="cat-title">
      <SectionTitle>
        <span id="cat-title">Fais ton choix</span>
      </SectionTitle>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-7">
        {cards.map((c) => (
          <li key={c.id} className="w-36 shrink-0 snap-start sm:w-auto">
            <Link href={`/shop/${c.id}/`} className="group block">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-2 shadow-warm">
                <ProductImage
                  src={c.product ? mainImage(c.product) : undefined}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 14vw, (min-width: 640px) 25vw, 144px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
                />
              </div>
              <p className="mt-2 text-center font-display text-lg font-bold">{c.label}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const STEPS = [
  { Icon: Shirt, title: "Choisis", text: "Ton modèle, ta couleur et ta taille dans le catalogue." },
  { Icon: MessageCircle, title: "Envoie sur WhatsApp", text: "Un message tout prêt part avec ta commande. Tu confirmes, c'est tout." },
  { Icon: Truck, title: "Reçois chez toi", text: "Livraison Dakar en 24h, banlieue et régions aussi. Paiement Wave, Orange Money ou à la livraison." },
];

export function HowToOrder() {
  return (
    <section aria-labelledby="how-title" className="rounded-3xl bg-surface-2 px-5 py-10 sm:px-10">
      <SectionTitle>
        <span id="how-title">Comment commander</span>
      </SectionTitle>
      <ol className="grid gap-6 sm:grid-cols-3">
        {STEPS.map(({ Icon, title, text }, i) => (
          <li key={title} className="flex gap-4 sm:flex-col">
            <div className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-bg shadow-warm">
              <Icon className="size-7 text-accent-strong" aria-hidden="true" />
              <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-brown font-display text-sm font-bold text-cream">
                {i + 1}
              </span>
            </div>
            <div>
              <h3 className="font-display text-xl font-bold">{title}</h3>
              <p className="mt-1 text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function StoryTeaser() {
  return (
    <section aria-labelledby="story-title" className="relative overflow-hidden rounded-3xl bg-brown px-6 pt-14 pb-10 text-cream sm:px-12">
      <LightString className="absolute inset-x-0 top-0 h-12 w-full text-cream/40" bulbs={5} />
      <h2 id="story-title" className="font-display text-3xl font-bold sm:text-4xl">Notre histoire</h2>
      <p className="mt-4 max-w-2xl text-lg text-cream/90">{site.story[0]}</p>
      <Link href="/notre-histoire/" className="mt-6 inline-flex items-center gap-2 font-semibold text-sunset underline-offset-4 hover:underline">
        Lire la suite <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

export function SocialBlock() {
  return (
    <section aria-labelledby="social-title" className="text-center">
      <h2 id="social-title" className="font-display text-3xl font-bold">Suis le QG</h2>
      <p className="mx-auto mt-2 max-w-md text-muted">Les drops sortent d&apos;abord sur nos réseaux. Une question ? On répond sur WhatsApp.</p>
      <div className="mt-6 flex flex-col items-center gap-5">
        <SocialLinks className="justify-center text-ink" />
        <a href={buildWhatsAppUrl(contactMessage())} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "lg")}>
          <WhatsAppIcon className="size-5" /> Écrire au QG sur WhatsApp
        </a>
      </div>
    </section>
  );
}
