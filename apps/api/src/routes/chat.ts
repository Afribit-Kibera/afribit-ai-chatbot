import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ExplanationLevel, LanguageModeId } from "@afribit/shared";
import { sendMessage, sessionPackId, streamMessage } from "../chat/chatService.js";
import { pool } from "../db/pool.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { matchOrigin } from "../config/cors.js";
import { getPack, getRegistry, runWithPack } from "../pack/active.js";
import { isKnownMode, modeErrorMessage } from "../pack/modes.js";
import type { CommunityPack } from "../pack/types.js";
import { env } from "../config/env.js";
import { parseSource } from "../pilot/source.js";
import { parseClientHistory } from "../privacy/history.js";

interface SendMessageBody {
  sessionId?: string;
  /**
   * IGNORED (F-002 security fix, 8 Oct 2026): the account behind a conversation comes only from a verified
   * sign-in token, never from the body, so nobody can attach a conversation to someone else's account.
   */
  userId?: string;
  message: string;
  /** F-002: recent turns from the browser, used only when the server keeps no chats. */
  history?: unknown;
  languageMode?: LanguageModeId;
  explanationLevel?: ExplanationLevel;
  /** Server-issued notify_token from PUT /api/v1/notifications/subscription -- see chatService.ts's SendMessageInput. */
  notifyToken?: string;
  /**
   * Channel label from the learner's link (?ref=kibera-hub). A lowercase slug or it is ignored (never an
   * error); stored once when a conversation is created. See pilot/source.ts.
   */
  source?: unknown;
}

/**
 * Which pack answers this message. A stored conversation stays with the pack it started in, so its
 * pack wins over the request's default; naming a different pack for it is a 409. Replies and returns
 * null when it refuses. A session id we do not know starts a new conversation in the request's pack.
 */
async function packForMessage(request: FastifyRequest, reply: FastifyReply, sessionId: string | null | undefined, lookup: typeof sessionPackId): Promise<CommunityPack | null> {
  const requested = getPack();
  if (!sessionId) return requested;
  const stored = await lookup(sessionId);
  if (stored === undefined) return requested;
  const owner = stored === null ? getRegistry().default : getRegistry().get(stored);
  if (!owner) {
    void reply.status(409).send({ error: `This conversation belongs to the pack "${stored}", which this server no longer serves. Start a new conversation.` });
    return null;
  }
  if (request.packExplicit && owner.id !== requested.id) {
    void reply.status(409).send({ error: `This conversation belongs to the pack "${owner.id}", but the request asked for "${requested.id}". Start a new conversation to use another pack.`, pack: owner.id });
    return null;
  }
  return owner;
}

/** Shared checks for the three chat routes. Replies and returns null when the request is refused; otherwise the pack to answer in. */
async function acceptMessage(request: FastifyRequest, reply: FastifyReply, body: SendMessageBody | undefined, sessionId: string | null | undefined, lookup: typeof sessionPackId = sessionPackId): Promise<CommunityPack | null> {
  if (!body?.message?.trim()) {
    void reply.status(400).send({ error: "message is required" });
    return null;
  }
  const history = parseClientHistory(body.history);
  if (!history.ok) {
    void reply.status(400).send({ error: history.error });
    return null;
  }
  const pack = await packForMessage(request, reply, sessionId, lookup);
  if (!pack) return null;
  // The language mode is checked against the pack that will answer, which may be the conversation's rather than the default.
  if (body.languageMode && !runWithPack(pack, () => isKnownMode(body.languageMode as string))) {
    void reply.status(400).send({ error: runWithPack(pack, () => modeErrorMessage("languageMode")) });
    return null;
  }
  return pack;
}

// 2026-09-24 — every route below that calls sendMessage/streamMessage ends up
// calling the paid OpenRouter model, so all three get a much stricter limit
// than the server-wide default registered in server.ts (100/min, sized for
// cheap routes like preferences/knowledge lookups). Note this is slightly
// broader than the task's literal "/api/v1/chat and /api/v1/chat/stream" —
// /api/v1/chat/:sessionId/message hits the exact same sendMessage() call and
// would otherwise be a free bypass of the limit below, so it gets the same
// treatment for the fix to actually hold.
//
// 15 requests/minute per IP is deliberately not a generic low-effort SaaS
// default: this product is meant to be usable from a shared classroom/kiosk
// device or a single community wifi hotspot, where several real users can
// share one IP. A per-user or per-session limit would be the more precise
// fix, but there's no auth yet to hang that on (see README's "No
// authentication anywhere" gap), so IP is what's available today. 15/min
// gives one person a normal back-and-forth conversation (a message roughly
// every 4 seconds, well above normal typing/reading pace) while still
// capping worst-case spend per IP to well under a hundred paid model
// calls/hour if someone scripts against it. Revisit this number once real
// usage data exists.
/** The chat service functions, injectable so the routes can be tested without a database (privacyCases.ts). */
export interface ChatService {
  sendMessage: typeof sendMessage;
  streamMessage: typeof streamMessage;
  sessionPackId: typeof sessionPackId;
}
const defaultService: ChatService = { sendMessage, streamMessage, sessionPackId };

/** The signed-in account, from a verified token only (optionalAuth ran first), or null. */
function verifiedUserId(request: FastifyRequest): string | null {
  return (request.user as { id?: string } | undefined)?.id ?? null;
}

export function registerChatRoutes(app: FastifyInstance, gateway: AfribitAIGateway, service: ChatService = defaultService): void {
  const chatRouteRateLimit = { rateLimit: { max: 15, timeWindow: "1 minute" } };
  const chatOptions = { config: chatRouteRateLimit, preHandler: app.optionalAuth };

  /** The validated recent turns (acceptMessage already refused a malformed list). */
  const historyOf = (body: SendMessageBody) => {
    const h = parseClientHistory(body.history);
    return h.ok ? h.history : [];
  };

  app.post<{ Body: SendMessageBody }>("/api/v1/chat", chatOptions, async (request, reply) => {
    const body = request.body;
    const pack = await acceptMessage(request, reply, body, body?.sessionId, service.sessionPackId);
    if (!pack) return;
    const result = await runWithPack(pack, () =>
      service.sendMessage(gateway, {
        sessionId: body.sessionId ?? null,
        userId: verifiedUserId(request),
        message: body.message,
        languageMode: body.languageMode,
        explanationLevel: body.explanationLevel,
        notifyToken: body.notifyToken,
        source: parseSource(body.source),
        history: historyOf(body),
      }),
    );
    return reply.send(result);
  });

  app.post<{ Params: { sessionId: string }; Body: SendMessageBody }>("/api/v1/chat/:sessionId/message", chatOptions, async (request, reply) => {
    const body = request.body;
    const pack = await acceptMessage(request, reply, body, request.params.sessionId, service.sessionPackId);
    if (!pack) return;
    const result = await runWithPack(pack, () =>
      service.sendMessage(gateway, {
        sessionId: request.params.sessionId,
        userId: verifiedUserId(request),
        message: body.message,
        languageMode: body.languageMode,
        explanationLevel: body.explanationLevel,
        notifyToken: body.notifyToken,
        source: parseSource(body.source),
        history: historyOf(body),
      }),
    );
    return reply.send(result);
  });

  // PRD §27.2 — streamed responses where the network allows. Newline-delimited
  // JSON over a plain chunked response (not strict SSE): simpler to parse on
  // both ends for a same-origin fetch() client, and this isn't consumed by a
  // browser EventSource anywhere. A reverse proxy in front of this in
  // production must disable response buffering or chunks arrive batched.
  app.post<{ Body: SendMessageBody }>("/api/v1/chat/stream", chatOptions, async (request, reply) => {
    const body = request.body;
    // Decide the pack before hijacking: after that, an error can no longer be a normal HTTP status.
    const pack = await acceptMessage(request, reply, body, body?.sessionId, service.sessionPackId);
    if (!pack) return;

    // @fastify/cors adds the allow-origin header via the normal reply pipeline, which
    // reply.hijack() bypasses — so set it explicitly for the raw response, for the
    // requesting site only if it is on the allow list.
    const allowedOrigin = matchOrigin(request.headers.origin, env.corsOrigins);
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
      Vary: "Origin",
    });

    try {
      await runWithPack(pack, () =>
        service.streamMessage(
          gateway,
          {
            sessionId: body.sessionId ?? null,
            userId: verifiedUserId(request),
            message: body.message,
            languageMode: body.languageMode,
            explanationLevel: body.explanationLevel,
            notifyToken: body.notifyToken,
            source: parseSource(body.source),
            history: historyOf(body),
          },
          (event) => {
            reply.raw.write(`${JSON.stringify(event)}
`);
          },
        ),
      );
    } catch (err) {
      reply.raw.write(`${JSON.stringify({ type: "error", message: err instanceof Error ? err.message : "Unknown error" })}
`);
    } finally {
      reply.raw.end();
    }
  });

  app.get<{ Params: { sessionId: string } }>("/api/v1/chat/:sessionId", async (request, reply) => {
    // F-002: a server that keeps no chats has nothing to show; emptied (expired) messages are left out.
    if (env.chatRetention.mode === "none") return reply.send({ sessionId: request.params.sessionId, messages: [] });
    const { rows } = await pool.query(
      `SELECT id, role, content, created_at FROM chat_messages
       WHERE session_id = $1 AND content_deleted_at IS NULL AND content <> ''
       ORDER BY created_at ASC`,
      [request.params.sessionId],
    );
    return reply.send({ sessionId: request.params.sessionId, messages: rows });
  });

  app.post<{
    Params: { messageId: string };
    Body: { rating: "helpful" | "not_helpful"; reason?: string; comment?: string; questionText?: unknown; answerText?: unknown };
  }>("/api/v1/messages/:messageId/feedback", async (request, reply) => {
    const { rating, reason, comment, questionText, answerText } = request.body ?? ({} as never);
    if (rating !== "helpful" && rating !== "not_helpful") {
      return reply.status(400).send({ error: "rating must be 'helpful' or 'not_helpful'" });
    }
    // F-002: a report may carry the question and answer the learner chose to share with it (needed when
    // the server keeps no chats). Sent only when the learner ticks the box; cleared 30 days after resolution.
    const shared = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 4000) : null);
    await pool.query(
      `INSERT INTO message_feedback (message_id, rating, reason, comment, question_text, answer_text) VALUES ($1, $2, $3, $4, $5, $6)`,
      [request.params.messageId, rating, reason ?? null, comment ?? null, shared(questionText), shared(answerText)],
    );
    return reply.status(201).send({ ok: true });
  });
}
