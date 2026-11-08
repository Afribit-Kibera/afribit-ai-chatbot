import { serviceInfo } from "../privacy/service.js";
import type { FastifyInstance, FastifyReply } from "fastify";
import { getPack, getRegistry, runWithPack } from "../pack/active.js";
import { selectPack } from "../pack/request.js";
import type { CommunityPack } from "../pack/types.js";
import type { communityStore } from "../community/store.js";

declare module "fastify" {
  interface FastifyRequest {
    /** True when the request named a pack (x-pack header or ?pack=), as opposed to getting the default. */
    packExplicit: boolean;
  }
}

/** The branding a client may show: names, colours, the attribution line, and where to fetch the logo. Never any file path. */
export function publicBranding(pack: CommunityPack) {
  const b = pack.branding;
  return {
    shortName: b.shortName,
    tagline: b.tagline,
    accentColor: b.accentColor,
    accentInk: b.accentInk,
    welcomeTitle: b.welcomeTitle,
    welcomeText: b.welcomeText,
    composerPlaceholder: b.composerPlaceholder,
    ...(b.logo ? { logoUrl: `/api/v1/pack/brand/logo?pack=${encodeURIComponent(pack.id)}&v=${b.logo.etag.replace(/"/g, "")}` } : {}),
    poweredBy: b.poweredBy,
  };
}

/** Adds a header token to Vary without dropping what other plugins (CORS) already put there. */
function vary(reply: FastifyReply, token: string): void {
  const have = String(reply.getHeader("vary") ?? "");
  if (!have.split(",").some((t) => t.trim().toLowerCase() === token.toLowerCase())) reply.header("vary", have ? `${have}, ${token}` : token);
}

/**
 * Packs on the wire. This must be registered before the routes it scopes.
 *
 * Every request is bound to one pack for its whole life: the `x-pack` header, else `?pack=`, else the
 * server's default (an unknown id is a 404 listing the valid ones). The binding is Node's
 * AsyncLocalStorage, entered here with the rest of Fastify's chain as the callback, so getPack() gives
 * the right answer in every handler, in everything it awaits, and in a hijacked streaming reply.
 *
 * Public description of the community a pack is for: who it is for, which language modes it offers,
 * the suggested first questions and the disclaimers to show. A client can build its whole interface
 * from this, so the same app works for any community's pack. It never includes prompts, the review
 * keys or the knowledge text itself.
 */
export function registerPackRoutes(app: FastifyInstance, access?: Pick<typeof communityStore, "state">): void {
  app.decorateRequest("packExplicit", false);

  app.addHook("onRequest", (request, reply, done) => {
    const picked = selectPack(getRegistry(), request.headers, request.query as Record<string, unknown>);
    if (!picked.ok) {
      void reply.status(picked.status).send({ error: picked.error, packs: picked.packs });
      return;
    }
    request.packExplicit = picked.explicit;
    runWithPack(picked.pack, done);
  });

  app.get("/api/v1/packs", async (_request, reply) => {
    const registry = getRegistry();
    reply.header("cache-control", "public, max-age=300");
    return reply.send({
      default: registry.default.id,
      packs: registry.packs.map((p) => ({
        id: p.id,
        name: p.name,
        community: p.community,
        domain: { id: p.domain.id, label: p.domain.label },
        default: p.id === registry.default.id,
      })),
    });
  });

  // The pack's logo, validated when the pack was loaded. The pack comes from the same x-pack header or
  // ?pack= as everywhere else, so an <img> (which cannot send headers) uses the URL in branding.logoUrl.
  app.get("/api/v1/pack/brand/logo", async (request, reply) => {
    const logo = getPack().branding.logo;
    if (!logo) return reply.status(404).send({ error: "This pack has no logo" });
    reply
      .header("cache-control", "public, max-age=3600")
      .header("etag", logo.etag)
      .header("x-content-type-options", "nosniff")
      .header("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")
      .header("cross-origin-resource-policy", "cross-origin");
    vary(reply, "x-pack");
    if (request.headers["if-none-match"] === logo.etag) return reply.status(304).send();
    return reply.type(logo.contentType).send(logo.bytes);
  });

  app.get("/api/v1/pack", async (_request, reply) => {
    const pack = getPack();
    const membersOnly = access ? (await access.state(pack.id, null)).membersOnly : false;
    const live = pack.knowledge.entries.filter((c) => c.status === "approved" || c.status === "published").length;
    reply.header("cache-control", "no-store");
    vary(reply, "x-pack");
    return reply.send({
      schema: pack.schema,
      id: pack.id,
      membershipRequired: membersOnly,
      name: pack.name,
      version: pack.version,
      description: membersOnly ? "" : pack.description,
      license: pack.license,
      community: pack.community,
      domain: { id: pack.domain.id, label: pack.domain.label },
      defaultMode: pack.defaultMode,
      modes: pack.modes.map((m) => ({ id: m.id, label: m.label, description: m.description })),
      starterQuestions: membersOnly ? null : pack.starterQuestions,
      disclaimers: membersOnly ? [] : pack.disclaimers,
      branding: membersOnly ? { ...publicBranding(pack), welcomeTitle: null, welcomeText: null, composerPlaceholder: null, tagline: null } : publicBranding(pack),
      knowledge: membersOnly ? { topics: 0, publishedCards: 0 } : { topics: pack.knowledge.topics.length, publishedCards: live },
      // F-001 / F-002: where the model runs and how long chats are kept, so the app's privacy sentence is true.
      service: serviceInfo(),
    });
  });
}
