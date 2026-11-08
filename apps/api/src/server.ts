import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { env, assertProductionEnv } from "./config/env.js";
import { authPlugin } from "./auth/plugin.js";
import { createGateway } from "./gateway/registry.js";
import { recordUsage } from "./usage/meter.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerPreferenceRoutes } from "./routes/preferences.js";
import { registerKnowledgeRoutes } from "./routes/knowledge.js";
import { registerMicrotaskRoutes } from "./routes/microtasks.js";
import { registerNotificationRoutes } from "./routes/notifications.js";
import { registerPackRoutes } from "./routes/pack.js";
import { registerPilotRoutes } from "./routes/pilot.js";
import { registerReviewRoutes } from "./routes/review.js";
import { registerVoiceRoutes } from "./routes/voice.js";
import { registerPrivacyRoutes } from "./routes/privacy.js";
import { registerTeachRoutes } from "./routes/teach.js";
import { registerInvitationRoutes } from "./routes/invitations.js";
import { registerGapRoutes } from "./routes/gaps.js";
import { privacyStore } from "./privacy/store.js";
import { startRetentionSweep } from "./privacy/sweep.js";
import { serviceInfo } from "./privacy/service.js";
import { getPack, getRegistry } from "./pack/active.js";
import { communityStore } from "./community/store.js";
import { registerCommunityGuard } from "./community/guard.js";
import { registerCommunityRoutes } from "./routes/community.js";
import { registerMemoryRoutes } from "./routes/memory.js";
import { registerComputeRoutes } from "./routes/compute.js";
import { registerNotebookRoutes } from "./routes/notebooks.js";
import { registerLearningRoutes } from "./routes/learning.js";
import { enforceComputePolicies } from "./compute/admission.js";

assertProductionEnv();

// 2026-09-24 — the recommended production deploy puts Nginx/Caddy in front
// of this process for TLS termination, so in production every request's
// socket peer is the reverse proxy, not the real client. Without trustProxy,
// `request.ip` (and therefore every per-IP rate limit below) would just be
// the proxy's IP, collapsing the limit onto a single "client" for everyone.
// `env.ts` has no explicit trustProxy/allowed-hop config yet (no
// TRUST_PROXY / X-Forwarded-For allowlist), so this trusts the immediate
// hop's X-Forwarded-For unconditionally, which is correct once Nginx/Caddy
// is the only thing able to reach this process directly (per the firewall
// rule for the recommended deploy: Postgres/Redis/API ports never exposed
// publicly, only 80/443 on the proxy). Follow-up: once the reverse proxy's IP (or
// subnet) is known, tighten this to that specific address instead of `true`
// so a client can't forge X-Forwarded-For if the proxy is ever misconfigured
// to pass the port through directly.
const app = Fastify({ logger: { redact: ["req.headers.authorization", 'req.headers["x-chat-token"]', "req.body.sessionTokens", "req.body.password", "req.body.invitationCode"] }, trustProxy: true });
const gateway = createGateway();
enforceComputePolicies();
app.log.info("compute admission enforced: communities need an enabled policy for model/embedding calls; approved-card answers remain available");
gateway.setMeter(recordUsage);
gateway.setScope(() => getPack().id);

await app.register(cors, { origin: env.corsOrigins });
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
// stage — the reference deployment runs exactly one API instance. If this
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
  // statusCode is required: without it Fastify treats the thrown object as an unknown error and
  // answers HTTP 500, so a rate-limited learner saw a server error (and the web app's "too many
  // questions" message for 429 never showed). Found by tools/smoke on 2026-10-03.
  errorResponseBuilder: (_request, context) => ({
    statusCode: context.statusCode,
    error: `Too many requests. Please retry after ${context.after}.`,
  }),
});

// Fail at start-up, with every problem listed, if a community pack is broken or the packs clash.
const packs = getRegistry();
app.log.info(`Serving ${packs.packs.length} community pack(s): ${packs.packs.map((p) => p.id).join(", ")} (default: ${packs.default.id})`);
// Before the routes it scopes: binds each request to its pack (x-pack header or ?pack=).
registerPackRoutes(app, communityStore);
registerCommunityGuard(app);

app.get("/health", async () => ({ ok: true }));
app.get("/health/providers", async () => gateway.healthCheckAll());

registerAuthRoutes(app);
registerCommunityRoutes(app);
registerMemoryRoutes(app);
registerComputeRoutes(app);
registerNotebookRoutes(app);
registerLearningRoutes(app,gateway);
registerChatRoutes(app, gateway);
registerPreferenceRoutes(app);
registerKnowledgeRoutes(app);
registerMicrotaskRoutes(app);
registerNotificationRoutes(app);
registerReviewRoutes(app);
registerPilotRoutes(app);
registerVoiceRoutes(app, gateway);
registerPrivacyRoutes(app);
registerTeachRoutes(app);
registerInvitationRoutes(app);
registerGapRoutes(app);

// F-012: say who may create an account, and warn if anyone can.
app.log.info(`accounts: registration "${env.registration}"`);
if (env.registration === "open" && env.nodeEnv !== "development") app.log.warn("REGISTRATION=open: anyone can create a contributor account. Use \"invite\" (the default) outside development.");

// F-002: empty expired chat text every hour; F-001: say in the log what the app will tell members.
startRetentionSweep(privacyStore, env.chatRetention, { log: (m) => app.log.info(m) });
const svc = serviceInfo();
app.log.info(`privacy: model location "${svc.modelLocation}", chat retention ${svc.retention.mode}${svc.retention.days ? ` (${svc.retention.days} days)` : ""}`);
if (svc.modelLocation === "remote") app.log.warn("MODEL_LOCATION is not set and the model server is not on this machine: members are told questions are answered on another server. Set MODEL_LOCATION=community or afribit.");

app.listen({ port: env.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Afribit AI API listening at ${address}`);
});
