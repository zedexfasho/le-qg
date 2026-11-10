"use client";

import { Ruler } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { site } from "@/data/site";

/** Mesures indicatives (vêtement à plat, en cm) — à ajuster selon tes fournisseurs */
const ROWS = [
  { size: "XS", chest: "84–88", length: "66", waist: "68–72" },
  { size: "S", chest: "88–94", length: "68", waist: "72–78" },
  { size: "M", chest: "94–100", length: "70", waist: "78–84" },
  { size: "L", chest: "100–106", length: "72", waist: "84–90" },
  { size: "XL", chest: "106–112", length: "74", waist: "90–96" },
  { size: "XXL", chest: "112–120", length: "76", waist: "96–104" },
];

export function SizeGuide({ productName }: { productName: string }) {
  const [open, setOpen] = useState(false);
  const help = buildWhatsAppUrl(`Salam ${site.name} 👋 J'hésite sur la taille pour « ${productName} ». Je mesure … cm et je pèse … kg.`);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4 hover:text-accent-strong">
        <Ruler className="size-4" aria-hidden="true" />
        Guide des tailles
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Guide des tailles">
        <p className="mb-4 text-sm text-muted">Mesures indicatives en centimètres. Entre deux tailles ? Prends la plus grande pour un style oversize.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Correspondance des tailles en centimètres</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-3 font-semibold">Taille</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Tour de poitrine</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Longueur haut</th>
                <th scope="col" className="py-2 font-semibold">Tour de taille</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.size} className="border-b border-line/60">
                  <th scope="row" className="py-2 pr-3 font-bold">{row.size}</th>
                  <td className="py-2 pr-3">{row.chest}</td>
                  <td className="py-2 pr-3">{row.length}</td>
                  <td className="py-2">{row.waist}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm">
          Toujours un doute ?{" "}
          <a href={help} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
            Demande-nous sur WhatsApp
          </a>
          , on te conseille.
        </p>
      </Modal>
    </>
  );
}
