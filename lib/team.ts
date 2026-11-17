/** Rôles de l'équipe : l'admin voit tout, le livreur seulement ses livraisons */
export const ROLES = ["admin", "livreur"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin (tout le dashboard)",
  livreur: "Livreur (livraisons seulement)",
};

export const isRole = (value: unknown): value is Role => (ROLES as readonly unknown[]).includes(value);

/** Page d'arrivée après connexion */
export const homeFor = (role: Role) => (role === "livreur" ? "/admin/livraisons/" : "/admin/");
