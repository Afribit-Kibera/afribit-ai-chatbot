import type { FastifyInstance } from "fastify";
import type { ExplanationLevel, LanguageMode } from "@afribit/shared";
import { sendMessage, streamMessage } from "../chat/chatService.js";
import { pool } from "../db/pool.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { env } from "../config/env.js";

interface SendMessageBody {
  sessionId?: string;
  userId?: string;
  message: string;
  languageMode?: LanguageMode;
  explanationLevel?: ExplanationLevel;
}

export function registerChatRoutes(app: FastifyInstance, gateway: AfribitAIGateway): void {
  app.post<{ Body: SendMessageBody }>("/api/v1/chat", async (request, reply) => {
    const body = request.body;
    if (!body?.message?.trim()) {
      return reply.status(400).send({ error: "message is required" });
    }
    const result = await sendMessage(gateway, {
      sessionId: body.sessionId ?? null,
      userId: body.userId ?? null,
      message: body.message,
      languageMode: body.languageMode,
      explanationLevel: body.explanationLevel,
    });
    return reply.send(result);
  });

  app.post<{ Params: { sessionId: string }; Body: SendMessageBody }>(
    "/api/v1/chat/:sessionId/message",
    async (request, reply) => {
      const body = request.body;
      if (!body?.message?.trim()) {
        return reply.status(400).send({ error: "message is required" });
      }
      const result = await sendMessage(gateway, {
        sessionId: request.params.sessionId,
        userId: body.userId ?? null,
        message: body.message,
        languageMode: body.languageMode,
        explanationLevel: body.explanationLevel,
      });
      return reply.send(result);
    },
  );

  // PRD §27.2 — streamed responses where the network allows. Newline-delimited
  // JSON over a plain chunked response (not strict SSE): simpler to parse on
  // both ends for a same-origin fetch() client, and this isn't consumed by a
  // browser EventSource anywhere. A reverse proxy in front of this in
  // production must disable response buffering or chunks arrive batched.
  app.post<{ Body: SendMessageBody }>("/api/v1/chat/stream", async (request, reply) => {
    const body = request.body;
    if (!body?.message?.trim()) {
      return reply.status(400).send({ error: "message is required" });
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      // @fastify/cors adds this via the normal reply pipeline, which
      // reply.hijack() bypasses — set it explicitly for the raw response.
      "Access-Control-Allow-Origin": env.corsOrigin,
      Vary: "Origin",
    });

    try {
      await streamMessage(
        gateway,
        {
          sessionId: body.sessionId ?? null,
          userId: body.userId ?? null,
          message: body.message,
          languageMode: body.languageMode,
          explanationLevel: body.explanationLevel,
        },
        (event) => {
          reply.raw.write(`${JSON.stringify(event)}\n`);
        },
      );
    } catch (err) {
      reply.raw.write(`${JSON.stringify({ type: "error", message: err instanceof Error ? err.message : "Unknown error" })}\n`);
    } finally {
      reply.raw.end();
    }
  });

  app.get<{ Params: { sessionId: string } }>("/api/v1/chat/:sessionId", async (request, reply) => {
    const { rows } = await pool.query(
      `SELECT id, role, content, created_at FROM chat_messages
       WHERE session_id = $1 ORDER BY created_at ASC`,
      [request.params.sessionId],
    );
    return reply.send({ sessionId: request.params.sessionId, messages: rows });
  });

  app.post<{ Params: { messageId: string }; Body: { rating: "helpful" | "not_helpful"; reason?: string; comment?: string } }>(
    "/api/v1/messages/:messageId/feedback",
    async (request, reply) => {
      const { rating, reason, comment } = request.body;
      if (rating !== "helpful" && rating !== "not_helpful") {
        return reply.status(400).send({ error: "rating must be 'helpful' or 'not_helpful'" });
      }
      await pool.query(
        `INSERT INTO message_feedback (message_id, rating, reason, comment) VALUES ($1, $2, $3, $4)`,
        [request.params.messageId, rating, reason ?? null, comment ?? null],
      );
      return reply.status(201).send({ ok: true });
    },
  );
}
