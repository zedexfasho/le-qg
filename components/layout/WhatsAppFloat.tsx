import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { buildWhatsAppUrl, contactMessage } from "@/lib/whatsapp";

/** Bouton WhatsApp flottant (masqué sur mobile quand la barre d'achat d'une fiche produit est affichée) */
export function WhatsAppFloat() {
  return (
    <a
      href={buildWhatsAppUrl(contactMessage())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous écrire sur WhatsApp"
      className="wa-float fixed right-4 bottom-4 z-30 grid size-14 place-items-center rounded-full bg-whatsapp text-[#10230F] shadow-warm-lg transition-transform hover:scale-105 motion-reduce:transform-none sm:right-6 sm:bottom-6"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
