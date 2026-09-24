import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { env, assertProductionEnv } from "./config/env.js";
import { authPlugin } from "./auth/plugin.js";
import { createGateway } from "./gateway/registry.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerPreferenceRoutes } from "./routes/preferences.js";
import { registerKnowledgeRoutes } from "./routes/knowledge.js";
import { registerMicrotaskRoutes } from "./routes/microtasks.js";
import { registerNotificationRoutes } from "./routes/notifications.js";

assertProductionEnv();

// 2026-09-24 — infra/LUNANODE.md's deploy checklist puts Nginx/Caddy in front
// of this process for TLS termination, so in production every request's
// socket peer is the reverse proxy, not the real client. Without trustProxy,
// `request.ip` (and therefore every per-IP rate limit below) would just be
// the proxy's IP, collapsing the limit onto a single "client" for everyone.
// `env.ts` has no explicit trustProxy/allowed-hop config yet (no
// TRUST_PROXY / X-Forwarded-For allowlist), so this trusts the immediate
// hop's X-Forwarded-For unconditionally, which is correct once Nginx/Caddy
// is the only thing able to reach this process directly (per the firewall
// rule in LUNANODE.md §1: Postgres/Redis/API ports never exposed publicly,
// only 80/443 on the proxy). Follow-up: once the reverse proxy's IP (or
// subnet) is known, tighten this to that specific address instead of `true`
// so a client can't forge X-Forwarded-For if the proxy is ever misconfigured
// to pass the port through directly.
const app = Fastify({ logger: true, trustProxy: true });
const gateway = createGateway();

await app.register(cors, { origin: env.corsOrigin });
await app.register(authPlugin);

// 2026-09-24 — production blocker fix: /api/v1/chat[/stream] calls a paid
// OpenRouter model on every request and (at the time of writing) has no
// auth in front of it either, so an unlimited endpoint sitting on a metered
// API key is a direct cost-abuse vector. This registers the global default;
// the actual chat endpoints get a much stricter override (see chat.ts)
// since they're the expensive ones — this global limit is just a floor for
// every other route (health checks, preferences, knowledge lookups, feedback)
// which are cheap/local and mostly just need protection from basic abuse or
// runaway clients, not cost control. 100 req/min per IP is generous enough
// that it should never bother a legitimate single user of these cheap routes,
// while still bounding worst-case load on the Postgres pool.
//
// Single-process, in-memory store (the plugin's default) is fine at this
// stage — there's exactly one API instance per infra/LUNANODE.md. If this
// ever runs multi-instance behind a load balancer, the in-memory counters
// would be per-process and the effective limit would multiply by instance
// count; at that point use the plugin's `redis` store option pointed at the
// Redis instance this project already depends on (see env.ts's redisUrl,
// infra/docker-compose.yml) rather than reinventing distributed limiting.
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  // Match this codebase's existing error shape (see e.g. routes/preferences.ts's
  // `reply.status(400).send({ error: "..." })`) instead of the plugin's default
  // bare `{ statusCode, error, message }` body, so API consumers get one
  // consistent error contract regardless of which failure path they hit.
  errorResponseBuilder: (_request, context) => ({
    error: `Too many requests. Please retry after ${context.after}.`,
  }),
});

app.get("/health", async () => ({ ok: true }));
app.get("/health/providers", async () => gateway.healthCheckAll());

registerAuthRoutes(app);
registerChatRoutes(app, gateway);
registerPreferenceRoutes(app);
registerKnowledgeRoutes(app);
registerMicrotaskRoutes(app);
registerNotificationRoutes(app);

app.listen({ port: env.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Afribit AI API listening at ${address}`);
});
