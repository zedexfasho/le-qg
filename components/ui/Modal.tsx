"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** "center" = fenêtre centrée, "sheet" = panneau qui monte du bas sur mobile */
  layout?: "center" | "sheet" | "full";
  footer?: ReactNode;
}

/** Fenêtre modale basée sur <dialog> : focus, Échap et accessibilité gérés par le navigateur */
export function Modal({ open, onClose, title, children, layout = "center", footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const position =
    layout === "sheet"
      ? "mt-auto mb-0 w-full max-w-none rounded-t-3xl sm:m-auto sm:max-w-md sm:rounded-3xl max-h-[85dvh]"
      : layout === "full"
        ? "m-0 h-dvh max-h-none w-screen max-w-none rounded-none bg-night text-cream"
        : "m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl max-h-[85dvh]";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label={title}
      className={`bg-bg p-0 text-ink shadow-warm-lg backdrop:backdrop-blur-[2px] ${position}`}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-3">
          <h2 className={`font-display text-xl font-bold ${layout === "full" ? "sr-only" : ""}`}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid size-10 place-items-center rounded-full hover:bg-ink/10"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </dialog>
  );
}
