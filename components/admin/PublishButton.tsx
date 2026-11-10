"use client";

import { Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { api, useApi } from "@/lib/admin/api";
import { timeAgo } from "@/lib/admin/format";

interface PublishStatus {
  configured: boolean;
  telegram: boolean;
  error?: string;
  lastRun?: { status: string; conclusion: string | null; createdAt: string; updatedAt: string; url: string } | null;
}

function describe(run: NonNullable<PublishStatus["lastRun"]>): string {
  if (run.status !== "completed") return `Publication en cours (lancée ${timeAgo(run.createdAt)})…`;
  if (run.conclusion === "success") return `Dernière publication réussie ${timeAgo(run.updatedAt)}.`;
  return `La dernière publication a échoué (${timeAgo(run.updatedAt)}).`;
}

/** Reconstruit le site public avec les produits à jour (via GitHub Actions) */
export function PublishButton({ compact = false }: { compact?: boolean }) {
  const { data, reload } = useApi<PublishStatus>("/publish");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const running = data?.lastRun && data.lastRun.status !== "completed";

  // Suit la publication en cours
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => void reload(), 15_000);
    return () => clearInterval(t);
  }, [running, reload]);

  const publish = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await api("/publish", { method: "POST" });
      setMessage("C'est parti : le site sera à jour dans 2 à 3 minutes.");
      setTimeout(() => void reload(), 5_000);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={compact ? "" : "space-y-2"}>
      <button type="button" onClick={publish} disabled={busy || !!running || data?.configured === false} className={buttonClasses("primary", "md")}>
        <Rocket className="size-4" aria-hidden="true" />
        {busy ? "Lancement…" : running ? "Publication en cours…" : "Publier le site"}
      </button>
      {!compact && (
        <p className="text-sm text-muted" role="status">
          {message ??
            (data?.configured === false
              ? "Publication automatique pas encore configurée (voir README, section « Publication automatique »)."
              : data?.error
                ? data.error
                : data?.lastRun
                  ? describe(data.lastRun)
                  : "")}
          {data?.lastRun?.url && (
            <>
              {" "}
              <a href={data.lastRun.url} target="_blank" rel="noopener noreferrer" className="underline">
                Détails
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
