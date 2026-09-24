import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { retrieveKnowledge } from "../knowledge/retrieval.js";

interface CreateKnowledgeBody {
  id: string;
  topicId?: string;
  title: string;
  canonicalAnswer: string;
  beginnerAnswer: string;
  safetyNotes?: string[];
}

/**
 * Admin knowledge CRUD (PRD §23.2). Gated by requireAdmin (2026-09-24,
 * production-readiness push) -- this was previously the exact
 * unauthenticated scaffold PRD §36 warned had to be closed before running
 * anywhere but localhost. /knowledge/search stays public: it's a
 * read-only lookup over already-published/approved content (see
 * retrieval.ts's own status filter), not a management action.
 */
export function registerKnowledgeRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: { q: string } }>("/api/v1/knowledge/search", async (request, reply) => {
    const q = request.query.q;
    if (!q?.trim()) return reply.status(400).send({ error: "q is required" });
    const results = await retrieveKnowledge(q);
    return reply.send({ results });
  });

  app.post<{ Body: CreateKnowledgeBody }>("/api/v1/admin/knowledge", { preHandler: app.requireAdmin }, async (request, reply) => {
    const b = request.body;
    await pool.query(
      `INSERT INTO knowledge_entries (id, topic_id, title, canonical_answer, beginner_answer, safety_notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')`,
      [b.id, b.topicId ?? null, b.title, b.canonicalAnswer, b.beginnerAnswer, JSON.stringify(b.safetyNotes ?? [])],
    );
    return reply.status(201).send({ ok: true, id: b.id });
  });

  app.put<{ Params: { id: string }; Body: Partial<CreateKnowledgeBody> }>(
    "/api/v1/admin/knowledge/:id",
    { preHandler: app.requireAdmin },
    async (request, reply) => {
      const b = request.body;
      await pool.query(
        `UPDATE knowledge_entries SET
           title = COALESCE($2, title),
           canonical_answer = COALESCE($3, canonical_answer),
           beginner_answer = COALESCE($4, beginner_answer),
           safety_notes = COALESCE($5, safety_notes),
           version = version + 1,
           updated_at = now()
         WHERE id = $1`,
        [
          request.params.id,
          b.title ?? null,
          b.canonicalAnswer ?? null,
          b.beginnerAnswer ?? null,
          b.safetyNotes ? JSON.stringify(b.safetyNotes) : null,
        ],
      );
      return reply.send({ ok: true });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/v1/admin/knowledge/:id/publish",
    { preHandler: app.requireAdmin },
    async (request, reply) => {
      // reviewed_by/actor now come from the verified JWT, not a
      // client-supplied body field -- previously any caller could claim
      // to be any reviewer by name in the request body.
      const reviewerId = request.user.id;
      await pool.query(
        `UPDATE knowledge_entries SET status = 'published', reviewed_by = $2, reviewed_at = now(), updated_at = now() WHERE id = $1`,
        [request.params.id, reviewerId],
      );
      await pool.query(
        `INSERT INTO audit_logs (actor, action, entity_type, entity_id) VALUES ($1, 'publish', 'knowledge_entry', $2)`,
        [reviewerId, request.params.id],
      );
      return reply.send({ ok: true });
    },
  );
}
