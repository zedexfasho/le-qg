import { HttpError, json, type AppEnv } from "./http";
import { telegramConfigured } from "./notify";

/**
 * Bouton « Publier le site » : déclenche le workflow GitHub Actions qui reconstruit
 * le site avec le catalogue à jour (nouveaux produits, photos, textes) puis le redéploie.
 */
function github(env: AppEnv, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "le-qg-dashboard",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });
}

export async function publishStatus(env: AppEnv): Promise<Response> {
  const base = { telegram: telegramConfigured(env) };
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return json({ ...base, configured: false });
  const res = await github(env, `/actions/workflows/${env.GITHUB_WORKFLOW}/runs?per_page=1`);
  if (!res.ok) return json({ ...base, configured: true, error: `GitHub a répondu ${res.status}` });
  const data = (await res.json()) as { workflow_runs?: { status: string; conclusion: string | null; created_at: string; updated_at: string; html_url: string; event: string }[] };
  const run = data.workflow_runs?.[0];
  return json({
    ...base,
    configured: true,
    lastRun: run ? { status: run.status, conclusion: run.conclusion, createdAt: run.created_at, updatedAt: run.updated_at, url: run.html_url, event: run.event } : null,
  });
}

export async function publish(env: AppEnv): Promise<Response> {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    throw new HttpError(400, "La publication automatique n'est pas encore configurée (voir le guide dans le README). En attendant : npm run deploy.");
  }
  const res = await github(env, `/actions/workflows/${env.GITHUB_WORKFLOW}/dispatches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: "main" }),
  });
  if (!res.ok) throw new HttpError(502, `GitHub a refusé la publication (${res.status}). Vérifie le jeton GITHUB_TOKEN.`);
  return json({ ok: true }, 202);
}
