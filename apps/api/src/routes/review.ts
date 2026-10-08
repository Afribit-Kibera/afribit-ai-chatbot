import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance, FastifyReply } from "fastify";
import { retrieveKnowledge } from "../knowledge/retrieval.js";
import { getPack } from "../pack/active.js";
import { counts, createCard, editCard, getCard, listCards, listTopics, ReviewError, transitionCard, type CardInput } from "../review/service.js";
import { STATUSES } from "../review/rules.js";

/**
 * The review workflow for knowledge cards, for a community's reviewers (role reviewer or admin), and the
 * small web page that uses it. The page is plain files under apps/api/public/review so it needs no build
 * and no inline script (it works under a strict Content-Security-Policy).
 */
const here = path.dirname(fileURLToPath(import.meta.url));
// apps/api/src/routes and apps/api/dist/routes are the same depth below apps/api.
const publicDir = path.resolve(here, "..", "..", "public", "review");

function page(file: string): string {
  return readFileSync(path.join(publicDir, file), "utf8").replaceAll("{{PACK_NAME}}", getPack().name.replace(/[<>&"]/g, ""));
}

function fail(reply: FastifyReply, err: unknown) {
  if (err instanceof ReviewError) return reply.status(err.httpStatus).send({ error: err.message });
  throw err;
}

export function registerReviewRoutes(app: FastifyInstance): void {
  const staticHeaders = (reply: FastifyReply, type: string) =>
    reply
      .header("content-type", type)
      .header("cache-control", "no-cache")
      .header("x-content-type-options", "nosniff")
      .header("content-security-policy", "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");

  app.get("/review", async (_req, reply) => staticHeaders(reply, "text/html; charset=utf-8").send(page("index.html")));
  app.get("/review/app.js", async (_req, reply) => staticHeaders(reply, "text/javascript; charset=utf-8").send(page("app.js")));
  app.get("/review/style.css", async (_req, reply) => staticHeaders(reply, "text/css; charset=utf-8").send(page("style.css")));

  const auth = { preHandler: app.requireReviewer };
  const actor = (req: { user: { id: string } }) => req.user.id;

  app.get("/api/v1/review/overview", auth, async () => {
    const pack = getPack();
    return { pack: { id: pack.id, name: pack.name, community: pack.community.name, domain: pack.domain.label }, statuses: STATUSES, counts: await counts(), topics: await listTopics() };
  });

  app.get<{ Querystring: { status?: string; q?: string } }>("/api/v1/review/cards", auth, async (req, reply) => {
    try {
      return { cards: await listCards({ status: req.query.status, q: req.query.q }) };
    } catch (err) {
      return fail(reply, err);
    }
  });

  app.get<{ Params: { id: string } }>("/api/v1/review/cards/:id", auth, async (req, reply) => {
    try {
      return await getCard(req.params.id);
    } catch (err) {
      return fail(reply, err);
    }
  });

  app.post<{ Body: CardInput }>("/api/v1/review/cards", auth, async (req, reply) => {
    try {
      return reply.status(201).send({ card: await createCard(actor(req), req.body ?? {}) });
    } catch (err) {
      return fail(reply, err);
    }
  });

  app.put<{ Params: { id: string }; Body: CardInput }>("/api/v1/review/cards/:id", auth, async (req, reply) => {
    try {
      return await editCard(actor(req), req.params.id, req.body ?? {});
    } catch (err) {
      return fail(reply, err);
    }
  });

  app.post<{ Params: { id: string }; Body: { to?: string; note?: string } }>("/api/v1/review/cards/:id/transition", auth, async (req, reply) => {
    try {
      return await transitionCard(actor(req), req.params.id, String(req.body?.to ?? ""), req.body?.note?.trim() || null);
    } catch (err) {
      return fail(reply, err);
    }
  });

  // "What would the assistant be handed for this question?" -- for checking a card is found, and by what.
  app.get<{ Querystring: { q?: string } }>("/api/v1/review/try", auth, async (req, reply) => {
    const q = req.query.q?.trim();
    if (!q) return reply.status(400).send({ error: "q is required" });
    const found = await retrieveKnowledge(q, 5);
    return { results: found.map((r) => ({ id: r.conceptId, confidence: r.confidence, content: r.authoritativeContent.slice(0, 300) })) };
  });
}
