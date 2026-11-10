/** Variables et secrets disponibles dans le Worker */
export type AppEnv = Env & {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  GITHUB_TOKEN?: string;
  /** Développement : origine du serveur Next (ex. http://localhost:3000) */
  DEV_ORIGIN?: string;
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...SECURITY_HEADERS, ...headers },
  });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.message, ...err.extra }, err.status);
  console.error(err);
  return json({ error: "Erreur interne. Réessaie dans un instant." }, 500);
}

/** Lit un corps JSON en limitant sa taille */
export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes = 64_000): Promise<T> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new HttpError(413, "Requête trop volumineuse.");
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "Requête trop volumineuse.");
  try {
    const data = JSON.parse(text) as unknown;
    if (typeof data !== "object" || data === null) throw new Error();
    return data as T;
  } catch {
    throw new HttpError(400, "Données illisibles.");
  }
}

/** Les requêtes qui modifient des données doivent venir du site lui-même (protection CSRF) */
export function assertSameOrigin(request: Request, env: AppEnv): void {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("Origin");
  const allowed = new Set([new URL(request.url).origin, new URL(env.SITE_URL).origin]);
  if (env.DEV_ORIGIN) allowed.add(env.DEV_ORIGIN);
  if (!origin || !allowed.has(origin)) throw new HttpError(403, "Origine non autorisée.");
}

export function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "local";
}

export const nowIso = () => new Date().toISOString();

/** Texte facultatif, nettoyé et borné */
export function optText(value: unknown, max = 500): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new HttpError(400, "Champ texte invalide.");
  const v = value.trim();
  if (v.length > max) throw new HttpError(400, `Texte trop long (${max} caractères max).`);
  return v || null;
}

export function optInt(value: unknown, { min = 0, max = 100_000_000 } = {}): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, "Nombre invalide.");
  return n;
}

/**
 * Limiteur simple stocké en base : `limit` actions par fenêtre de `windowSec` secondes.
 * Renvoie false si la limite est atteinte.
 */
export async function rateLimit(env: AppEnv, key: string, limit: number, windowSec: number): Promise<boolean> {
  const now = Date.now();
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, count, reset_at) VALUES (?1, 1, ?2)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at < ?3 THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at < ?3 THEN ?2 ELSE rate_limits.reset_at END
     RETURNING count`,
  )
    .bind(key, now + windowSec * 1000, now)
    .first<{ count: number }>();
  return (row?.count ?? 0) <= limit;
}

export async function clearRateLimit(env: AppEnv, key: string): Promise<void> {
  await env.DB.prepare("DELETE FROM rate_limits WHERE key = ?").bind(key).run();
}
