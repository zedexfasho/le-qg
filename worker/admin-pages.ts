/**
 * Pages du dashboard (/admin/…) : servies uniquement à une personne connectée.
 * Sans session valide → page de connexion. Un livreur ne reçoit que la page Livraisons.
 * (Les données, elles, sont protégées séparément par l'API /api/admin.)
 */
import { homeFor } from "@/lib/team";
import { currentUser } from "./auth";
import type { AppEnv } from "./http";

const LOGIN = "/admin/connexion/";
const PUBLIC = /^\/admin\/connexion(\/|$)/;

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

export async function serveAdminPage(request: Request, env: AppEnv): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (!PUBLIC.test(pathname)) {
    const user = await currentUser(request, env);
    if (!user) return redirect(`${LOGIN}?retour=${encodeURIComponent(pathname + url.search)}`);
    if (user.role === "livreur" && !pathname.startsWith("/admin/livraisons")) return redirect(homeFor("livreur"));
  }

  const res = await env.ASSETS.fetch(request);
  const out = new Response(res.body, res);
  // Jamais en cache (ni navigateur ni Cloudflare) et jamais dans Google
  out.headers.set("Cache-Control", "private, no-store");
  out.headers.set("X-Robots-Tag", "noindex, nofollow");
  return out;
}
