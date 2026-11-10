import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main id="contenu" className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo variant="wordmark" width={150} priority className="mx-auto mb-6 block w-fit" />
        <div className="rounded-3xl bg-surface p-6 shadow-warm">
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 mb-6 text-sm text-muted">Commandes, clients, produits et chiffres du QG.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
