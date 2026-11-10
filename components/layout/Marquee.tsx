import { site } from "@/data/site";

/** Bandeau défilant (statique si l'utilisateur a réduit les animations) */
export function Marquee() {
  const items = [...site.marquee, ...site.marquee];
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((text, i) => (
        <li key={i} className="flex items-center gap-6 px-3 whitespace-nowrap">
          <span>{text}</span>
          <span aria-hidden="true" className="text-sunset">●</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="overflow-hidden bg-brown py-3 text-sm font-semibold text-cream dark:bg-[#140904]">
      <p className="sr-only">{site.marquee.join(" • ")}</p>
      <div className="flex w-max animate-marquee motion-reduce:animate-none" aria-hidden="true">
        {row(true)}
        {row(true)}
      </div>
    </div>
  );
}
