import { HttpError, json, type AppEnv } from "./http";

/**
 * Photos des produits ajoutées depuis le dashboard, stockées dans Cloudflare KV.
 * Le navigateur les redimensionne avant l'envoi (grande + petite version).
 */
const TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
const MAX_BYTES = 3 * 1024 * 1024;

export async function uploadMedia(request: Request, env: AppEnv): Promise<Response> {
  const form = await request.formData().catch(() => {
    throw new HttpError(400, "Envoi illisible.");
  });
  const full = form.get("full");
  const small = form.get("small");
  if (!(full instanceof File) || !(small instanceof File)) throw new HttpError(400, "Photo manquante.");
  const ext = TYPES[full.type];
  if (!ext || full.type !== small.type) throw new HttpError(400, "Format de photo non accepté (WebP, JPEG ou PNG).");
  if (full.size > MAX_BYTES || small.size > MAX_BYTES) throw new HttpError(413, "Photo trop lourde (3 Mo maximum).");

  const id = [...crypto.getRandomValues(new Uint8Array(10))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const metadata = { contentType: full.type };
  await Promise.all([
    env.MEDIA.put(`${id}.${ext}`, await full.arrayBuffer(), { metadata }),
    env.MEDIA.put(`${id}-sm.${ext}`, await small.arrayBuffer(), { metadata }),
  ]);
  return json({ src: `/media/${id}.${ext}` }, 201);
}

export async function serveMedia(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> {
  const name = new URL(request.url).pathname.slice("/media/".length);
  if (!/^[a-f0-9]{20}(-sm)?\.(webp|jpg|png)$/.test(name)) return new Response("Introuvable", { status: 404 });

  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const { value, metadata } = await env.MEDIA.getWithMetadata<{ contentType: string }>(name, "arrayBuffer");
  if (!value) return new Response("Introuvable", { status: 404 });
  const response = new Response(value, {
    headers: {
      "Content-Type": metadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
  ctx.waitUntil(cache.put(request, response.clone()));
  return response;
}
