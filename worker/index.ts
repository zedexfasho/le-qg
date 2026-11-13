/**
 * Le QG — Worker Cloudflare.
 *
 * - Le site public (dossier out/) est servi directement par Cloudflare.
 * - Ce Worker ne reçoit que /api/* (commandes, dashboard) et /media/* (photos).
 */
import { adminAnalytics } from "./analytics";
import { changePassword, createUser, currentUser, listUsers, login, logout, me, requireUser, updateUser } from "./auth";
import { adminFindCustomerByPhone, adminGetCustomer, adminListCustomers, adminUpdateCustomer } from "./customers";
import { HttpError, assertSameOrigin, errorResponse, type AppEnv } from "./http";
import { serveMedia, uploadMedia } from "./media";
import { testNotification } from "./notify";
import {
  adminAddNote,
  adminChangeStatus,
  adminCreateOrder,
  adminGetOrder,
  adminListOrders,
  adminPendingOrders,
  adminSummary,
  adminUpdateOrder,
  dailyMaintenance,
  publicCreateOrder,
} from "./orders";
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminGetProduct,
  adminListProducts,
  adminSetStock,
  adminUpdateProduct,
  publicCatalogue,
  publicStock,
} from "./products";
import { publish, publishStatus } from "./publish";

type Handler = (ctx: { request: Request; env: AppEnv; exec: ExecutionContext; params: string[] }) => Promise<Response> | Response;

interface Route {
  method: string;
  pattern: RegExp;
  handler: Handler;
  /** Accessible sans connexion */
  public?: boolean;
}

const id = (value: string) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, "Introuvable.");
  return n;
};
const user = async (request: Request, env: AppEnv) => requireUser(request, env);

const routes: Route[] = [
  // --- Public (site) ---
  { method: "POST", pattern: /^\/api\/orders$/, public: true, handler: ({ request, env, exec }) => publicCreateOrder(request, env, exec) },
  { method: "GET", pattern: /^\/api\/catalogue$/, public: true, handler: ({ env }) => publicCatalogue(env) },
  { method: "GET", pattern: /^\/api\/stock$/, public: true, handler: ({ env }) => publicStock(env) },

  // --- Connexion ---
  { method: "POST", pattern: /^\/api\/admin\/login$/, public: true, handler: ({ request, env }) => login(request, env) },
  { method: "POST", pattern: /^\/api\/admin\/logout$/, public: true, handler: ({ request, env }) => logout(request, env) },
  { method: "GET", pattern: /^\/api\/admin\/me$/, handler: async ({ request, env }) => me(await user(request, env)) },
  { method: "POST", pattern: /^\/api\/admin\/me\/password$/, handler: async ({ request, env }) => changePassword(request, env, await user(request, env)) },

  // --- Tableau de bord & analyses ---
  { method: "GET", pattern: /^\/api\/admin\/summary$/, handler: ({ env }) => adminSummary(env) },
  { method: "GET", pattern: /^\/api\/admin\/analytics$/, handler: ({ request, env }) => adminAnalytics(request, env) },

  // --- Commandes ---
  { method: "GET", pattern: /^\/api\/admin\/orders\/pending$/, handler: ({ env }) => adminPendingOrders(env) },
  { method: "GET", pattern: /^\/api\/admin\/orders$/, handler: ({ request, env }) => adminListOrders(request, env) },
  { method: "POST", pattern: /^\/api\/admin\/orders$/, handler: async ({ request, env }) => adminCreateOrder(request, env, await user(request, env)) },
  { method: "GET", pattern: /^\/api\/admin\/orders\/(\d+)$/, handler: ({ env, params }) => adminGetOrder(env, id(params[0])) },
  { method: "PATCH", pattern: /^\/api\/admin\/orders\/(\d+)$/, handler: async ({ request, env, params }) => adminUpdateOrder(request, env, await user(request, env), id(params[0])) },
  { method: "POST", pattern: /^\/api\/admin\/orders\/(\d+)\/status$/, handler: async ({ request, env, params }) => adminChangeStatus(request, env, await user(request, env), id(params[0])) },
  { method: "POST", pattern: /^\/api\/admin\/orders\/(\d+)\/notes$/, handler: async ({ request, env, params }) => adminAddNote(request, env, await user(request, env), id(params[0])) },

  // --- Clients ---
  { method: "GET", pattern: /^\/api\/admin\/customers$/, handler: ({ request, env }) => adminListCustomers(request, env) },
  { method: "GET", pattern: /^\/api\/admin\/customers\/lookup$/, handler: ({ request, env }) => adminFindCustomerByPhone(request, env) },
  { method: "GET", pattern: /^\/api\/admin\/customers\/(\d+)$/, handler: ({ env, params }) => adminGetCustomer(env, id(params[0])) },
  { method: "PATCH", pattern: /^\/api\/admin\/customers\/(\d+)$/, handler: ({ request, env, params }) => adminUpdateCustomer(request, env, id(params[0])) },

  // --- Produits & photos ---
  { method: "GET", pattern: /^\/api\/admin\/products$/, handler: ({ env }) => adminListProducts(env) },
  { method: "POST", pattern: /^\/api\/admin\/products$/, handler: ({ request, env }) => adminCreateProduct(request, env) },
  { method: "GET", pattern: /^\/api\/admin\/products\/([a-z0-9-]+)$/, handler: ({ env, params }) => adminGetProduct(env, params[0]) },
  { method: "PUT", pattern: /^\/api\/admin\/products\/([a-z0-9-]+)$/, handler: ({ request, env, params }) => adminUpdateProduct(request, env, params[0]) },
  { method: "DELETE", pattern: /^\/api\/admin\/products\/([a-z0-9-]+)$/, handler: ({ env, params }) => adminDeleteProduct(env, params[0]) },
  { method: "POST", pattern: /^\/api\/admin\/products\/([a-z0-9-]+)\/stock$/, handler: ({ request, env, params }) => adminSetStock(request, env, params[0]) },
  { method: "POST", pattern: /^\/api\/admin\/media$/, handler: ({ request, env }) => uploadMedia(request, env) },

  // --- Équipe, alertes, publication ---
  { method: "GET", pattern: /^\/api\/admin\/users$/, handler: ({ env }) => listUsers(env) },
  { method: "POST", pattern: /^\/api\/admin\/users$/, handler: ({ request, env }) => createUser(request, env) },
  { method: "PATCH", pattern: /^\/api\/admin\/users\/(\d+)$/, handler: async ({ request, env, params }) => updateUser(request, env, await user(request, env), id(params[0])) },
  { method: "POST", pattern: /^\/api\/admin\/notify\/test$/, handler: ({ env }) => testNotification(env) },
  { method: "GET", pattern: /^\/api\/admin\/publish$/, handler: ({ env }) => publishStatus(env) },
  { method: "POST", pattern: /^\/api\/admin\/publish$/, handler: ({ env }) => publish(env) },
];

async function handleApi(request: Request, env: AppEnv, exec: ExecutionContext): Promise<Response> {
  const { pathname } = new URL(request.url);
  let methodMismatch = false;
  for (const route of routes) {
    const match = pathname.match(route.pattern);
    if (!match) continue;
    if (route.method !== request.method) {
      methodMismatch = true;
      continue;
    }
    assertSameOrigin(request, env);
    // Toutes les routes /api/admin sont protégées, sauf connexion/déconnexion
    if (!route.public && !(await currentUser(request, env))) throw new HttpError(401, "Connexion requise.");
    return route.handler({ request, env, exec, params: match.slice(1) });
  }
  throw new HttpError(methodMismatch ? 405 : 404, methodMismatch ? "Méthode non autorisée." : "Route inconnue.");
}

export default {
  async fetch(request, env, exec): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      if (pathname.startsWith("/api/")) return await handleApi(request, env as AppEnv, exec);
      if (pathname.startsWith("/media/")) return await serveMedia(request, env as AppEnv, exec);
      return env.ASSETS.fetch(request);
    } catch (err) {
      return errorResponse(err);
    }
  },

  async scheduled(_event, env, exec): Promise<void> {
    exec.waitUntil(dailyMaintenance(env as AppEnv));
  },
} satisfies ExportedHandler<Env>;

