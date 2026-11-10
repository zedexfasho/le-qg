"use client";

import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useRef, useState } from "react";
import { ProductImage } from "@/components/product/ProductImage";
import { Modal } from "@/components/ui/Modal";
import { PLACEHOLDER_IMAGE } from "@/lib/product";

interface GalleryProps {
  images: string[];
  alt: string;
  /** Image prioritaire (LCP) */
  priority?: boolean;
}

/** Galerie : swipe sur mobile (scroll-snap natif), miniatures, zoom au tap */
export function Gallery({ images: input, alt, priority = false }: GalleryProps) {
  const images = input.length > 0 ? input : [PLACEHOLDER_IMAGE];
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
    setActive(index);
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (index !== active) setActive(index);
  };

  return (
    <div className="md:sticky md:top-24">
      <div className="relative overflow-hidden rounded-2xl bg-surface-2 shadow-warm">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto"
          aria-roledescription="carrousel"
          aria-label={`Photos de ${alt}`}
        >
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setZoom(i)}
              className="relative h-full w-full shrink-0 snap-center cursor-zoom-in"
              aria-label={`Agrandir la photo ${i + 1} sur ${images.length}`}
            >
              <ProductImage
                src={src}
                alt={`${alt} — photo ${i + 1}`}
                fill
                preload={priority && i === 0}
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-bg/80 text-ink">
          <ZoomIn className="size-4" aria-hidden="true" />
        </span>
        {images.length > 1 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden" aria-hidden="true">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full bg-ink transition-all ${i === active ? "w-5 opacity-90" : "w-1.5 opacity-30"}`} />
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <ul className="mt-3 hidden gap-2 md:flex" aria-label="Miniatures">
          {images.map((src, i) => (
            <li key={`${src}-${i}`}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Voir la photo ${i + 1}`}
                aria-current={i === active}
                className={`relative block size-20 overflow-hidden rounded-xl border-2 transition-colors ${i === active ? "border-accent" : "border-transparent opacity-75 hover:opacity-100"}`}
              >
                <ProductImage src={src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={zoom !== null} onClose={() => setZoom(null)} title={`Photo de ${alt}`} layout="full">
        {zoom !== null && (
          <div className="relative flex h-[calc(100dvh-6rem)] items-center justify-center">
            <div className="relative h-full w-full" style={{ touchAction: "pinch-zoom" }}>
              <ProductImage src={images[zoom]} alt={`${alt} — photo ${zoom + 1}`} fill sizes="100vw" className="object-contain" />
            </div>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((zoom - 1 + images.length) % images.length)}
                  className="absolute left-0 grid size-12 place-items-center rounded-full bg-cream/15 text-cream"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((zoom + 1) % images.length)}
                  className="absolute right-0 grid size-12 place-items-center rounded-full bg-cream/15 text-cream"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
