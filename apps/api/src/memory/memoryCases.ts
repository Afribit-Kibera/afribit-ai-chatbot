import assert from "node:assert/strict";
import type { PGlite } from "@electric-sql/pglite";
import Fastify from "fastify";
import type { AfribitChatRequest, AfribitChatResponse } from "@afribit/shared";
import { authPlugin } from "../auth/plugin.js";
import { env } from "../config/env.js";
import { getPack, runWithPack } from "../pack/active.js";
import { registerMemoryRoutes } from "../routes/memory.js";
import { memoryStore } from "./store.js";
import { promotionStore } from "./promotion.js";
import { MemoryError } from "./db.js";
import { privacyStore } from "../privacy/store.js";
import { pilotStore } from "../pilot/store.js";
import { retrieveLexical } from "../knowledge/retrieval.js";
import { createCard, getCard, listCards, ReviewError } from "../review/service.js";
import { indexEntry } from "../knowledge/indexing.js";
import { sendMessage, streamMessage } from "../chat/chatService.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";

export async function runMemoryCases(db: PGlite, ok: (name: string, fn: () => Promise<void>) => Promise<void>) {
  const base = getPack(), pack = base.id, other = { ...base, id: "memory-other" };
  const A = "41000000-0000-4000-8000-000000000001", B = "41000000-0000-4000-8000-000000000002", R1 = "41000000-0000-4000-8000-000000000003", R2 = "41000000-0000-4000-8000-000000000004";
  await db.query(`INSERT INTO users (id,email,role,created_via) VALUES ($1,'memory-a@x','reviewer','registered'),($2,'memory-b@x','learner','registered'),($3,'memory-r1@x','reviewer','registered'),($4,'memory-r2@x','reviewer','registered')`, [A, B, R1, R2]);
  const one = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows[0] as any;
  const fails = (status: number) => (e: unknown) => e instanceof MemoryError && e.statusCode === status;
  const app = Fastify(); await app.register(authPlugin); registerMemoryRoutes(app); await app.ready();
  const headers = (id = A) => ({ authorization: `Bearer ${app.jwt.sign({ id, role: "reviewer" })}` });
  let note = await (async () => { await memoryStore.enable(A, pack, true); return memoryStore.create(A, pack, "Synthetic member prefers garden examples"); })();
  let submission = "", knowledge = "";
  try {
    await ok("memory: explicit enablement, false remote default, strict owner/pack isolation and safe validation", async () => {
      assert.deepEqual(await memoryStore.list(B, pack), { enabled: false, items: [] });
      await assert.rejects(() => memoryStore.create(B, pack, "Private"), fails(409));
      assert.equal(note.allow_remote, false);
      for (const [user, scope] of [[B, pack], [A, other.id]]) {
        await assert.rejects(() => memoryStore.update(user!, scope!, note.id, 1, "Stolen", true), fails(404));
        await assert.rejects(() => memoryStore.remove(user!, scope!, note.id), fails(404));
        assert.deepEqual(await memoryStore.forPrompt(user!, scope!, true), []);
      }
      await assert.rejects(() => memoryStore.create(A, pack, "a".repeat(501)), fails(400));
      await assert.rejects(() => memoryStore.create(A, pack, "my password is secret123"), fails(400));
      assert.equal((await app.inject({ url: "/api/v1/me/memory" })).statusCode, 401);
      assert.equal((await app.inject({ method: "PATCH", url: "/api/v1/me/memory", headers: headers(), payload: { enabled: "true" } })).statusCode, 400);
      const res = await app.inject({ url: "/api/v1/me/memory", headers: headers() }); assert.equal(res.headers["cache-control"], "no-store");
      assert.equal((await app.inject({ method: "DELETE", url: "/api/v1/me/memory/items/bad", headers: headers() })).statusCode, 404);
    });
    await ok("memory: edits use versions, remote consent is independent, disabling preserves but stops context", async () => {
      note = await memoryStore.update(A, pack, note.id, 1, "Synthetic member prefers garden examples", true);
      await assert.rejects(() => memoryStore.update(A, pack, note.id, 1, "Old edit", false), fails(409));
      assert.equal((await memoryStore.forPrompt(A, pack, false)).length, 1);
      await memoryStore.enable(A, pack, false); assert.deepEqual(await memoryStore.forPrompt(A, pack, true), []);
      assert.equal((await memoryStore.list(A, pack)).items.length, 1); await memoryStore.enable(A, pack, true);
      note = await memoryStore.update(A, pack, note.id, note.version, note.content, false);
      assert.deepEqual(await memoryStore.forPrompt(A, pack, false), []);
    });
    await ok("memory: note limit is enforced and deleting all disables memory", async () => {
      await memoryStore.enable(B, pack, true);
      for (let i = 0; i < 20; i++) await memoryStore.create(B, pack, `Synthetic note ${i}`);
      await assert.rejects(() => memoryStore.create(B, pack, "Too many"), fails(409));
      await memoryStore.remove(B, pack); assert.deepEqual(await memoryStore.list(B, pack), { enabled: false, items: [] });
    });
    await ok("promotion: exact snapshot consent, owner/version checks and reviewer-only queue", async () => {
      await assert.rejects(() => promotionStore.submit(A, pack, note.id, note.version, false), fails(400));
      await assert.rejects(() => promotionStore.submit(B, pack, note.id, note.version, true), fails(404));
      await assert.rejects(() => promotionStore.submit(A, pack, note.id, 1, true), fails(409));
      submission = (await promotionStore.submit(A, pack, note.id, note.version, true)).id;
      await assert.rejects(() => promotionStore.submit(A, pack, note.id, note.version, true), fails(409));
      await memoryStore.update(A, pack, note.id, note.version, "Unshared revision must stay private", false);
      assert.equal((await promotionStore.queue(R1, pack)).find((s) => s.id === submission)?.content, note.content);
      assert.equal(JSON.stringify(await promotionStore.queue(R1, pack)).includes("Unshared revision"), false);
      await assert.rejects(() => promotionStore.queue(B, pack), fails(403));
      assert.deepEqual(await promotionStore.own(B, pack), []); assert.deepEqual(await promotionStore.queue(R1, other.id), []);
      assert.equal((await retrieveLexical("garden", 10)).some((r) => r.canonical_answer === note.content), false);
    });
    await ok("promotion: self/duplicate approval is blocked; demoted first reviewer no longer counts", async () => {
      await assert.rejects(() => promotionStore.decide(A, pack, submission, "approve"), fails(403));
      assert.equal((await promotionStore.decide(R1, pack, submission, "approve")).status, "pending");
      await assert.rejects(() => promotionStore.decide(R1, pack, submission, "approve"), fails(409));
      await db.query(`UPDATE users SET role='learner' WHERE id=$1`, [R1]);
      assert.equal((await promotionStore.decide(R2, pack, submission, "approve")).status, "pending");
      await assert.rejects(() => promotionStore.decide(R1, pack, submission, "approve"), fails(403));
      await db.query(`UPDATE users SET role='reviewer' WHERE id=$1`, [R1]);
      assert.equal((await promotionStore.decide(R1, pack, submission, "approve")).status, "approved");
      knowledge = (await one(`SELECT knowledge_id FROM community_knowledge_submissions WHERE id=$1`, [submission])).knowledge_id;
      assert.equal((await retrieveLexical("garden", 10)).some((r) => r.id === knowledge), true);
      assert.equal((await runWithPack(other, () => retrieveLexical("garden", 10))).some((r) => r.id === knowledge), false);
      await assert.rejects(() => getCard(knowledge), (e: unknown) => e instanceof ReviewError && e.httpStatus === 404);
      assert.equal((await listCards({})).some((r) => r.id === knowledge), false);
      await assert.rejects(()=>indexEntry(knowledge),/No knowledge entry/);
      await db.query(`INSERT INTO knowledge_topics (id,title,domain) VALUES ('memory-review-topic','Synthetic topic',$1)`,[base.domain.retrievalDomains[0]]);
      const ordinary=await createCard(R1,{topicId:'memory-review-topic',title:'Ordinary draft',canonicalAnswer:'Synthetic ordinary answer',beginnerAnswer:'Synthetic ordinary answer'});
      assert.equal((await getCard(ordinary.id)).card.topic_id,'memory-review-topic');
      await assert.rejects(() => promotionStore.decide(R2, pack, submission, "approve"), fails(409));
    });
    await ok("promotion: private deletion keeps approved copy; explicit withdrawal clears live card, chunks and versions", async () => {
      await memoryStore.remove(A, pack, note.id);
      assert.equal((await one(`SELECT status FROM community_knowledge_submissions WHERE id=$1`, [submission])).status, "approved");
      await db.query(`INSERT INTO knowledge_versions (knowledge_id,version,snapshot) VALUES ($1,1,'{}')`, [knowledge]);
      const chunk = (await one(`SELECT id FROM knowledge_chunks WHERE knowledge_id=$1`, [knowledge])).id;
      await db.query(`INSERT INTO knowledge_embeddings_v2 (chunk_id,embedding_model,dims,embedding) VALUES ($1,'synthetic',2,ARRAY[0.1,0.2]::real[])`, [chunk]);
      await assert.rejects(() => promotionStore.withdraw(B, pack, submission), fails(404));
      await promotionStore.withdraw(A, pack, submission);
      assert.equal((await one(`SELECT content FROM community_knowledge_submissions WHERE id=$1`, [submission])).content, "");
      assert.deepEqual(await one(`SELECT status,canonical_answer FROM knowledge_entries WHERE id=$1`, [knowledge]), { status: "deprecated", canonical_answer: "" });
      assert.equal((await one(`SELECT count(*)::int AS n FROM knowledge_chunks WHERE knowledge_id=$1`, [knowledge])).n, 0);
      assert.equal((await one(`SELECT count(*)::int AS n FROM knowledge_versions WHERE knowledge_id=$1`, [knowledge])).n, 0);
      assert.equal((await one(`SELECT count(*)::int AS n FROM knowledge_embeddings_v2 WHERE chunk_id=$1`, [chunk])).n, 0);
      assert.equal((await retrieveLexical("garden", 10)).some((r) => r.id === knowledge), false);
    });
    await ok("promotion: deleting a private note clears pending and rejected submitted copies", async () => {
      const n = await memoryStore.create(A, pack, "Synthetic pending snapshot"); const s = await promotionStore.submit(A, pack, n.id, 1, true);
      await memoryStore.remove(A, pack, n.id); assert.equal((await one(`SELECT content FROM community_knowledge_submissions WHERE id=$1`, [s.id])).content, "");
    });
    await ok("promotion: private community membership is checked again for each reviewer and withdrawal survives revocation", async () => {
      const scope = "memory-private";
      await db.query(`INSERT INTO community_access_policies (pack_id,members_only) VALUES ($1,true)`, [scope]);
      await db.query(`INSERT INTO community_memberships (pack_id,user_id) VALUES ($1,$2),($1,$3),($1,$4)`, [scope, A, R1, R2]);
      await memoryStore.enable(A, scope, true); const n = await memoryStore.create(A, scope, "Synthetic private community snapshot");
      const s = await promotionStore.submit(A, scope, n.id, 1, true);
      await promotionStore.decide(R1, scope, s.id, "approve");
      await db.query(`UPDATE community_memberships SET revoked_at=now() WHERE pack_id=$1 AND user_id=$2`, [scope, R1]);
      await assert.rejects(() => promotionStore.queue(R1, scope), fails(403));
      assert.equal((await promotionStore.decide(R2, scope, s.id, "approve")).status, "pending");
      await db.query(`UPDATE community_memberships SET revoked_at=now() WHERE pack_id=$1 AND user_id=$2`, [scope, A]);
      await promotionStore.withdraw(A, scope, s.id);
      await memoryStore.remove(A, scope);
      assert.equal((await one(`SELECT content FROM community_knowledge_submissions WHERE id=$1`, [s.id])).content, "");
    });
    await ok("memory: actual full/compact/stream/restaurant prompts isolate notes and apply remote permission only at final stage", async () => {
      const previous = { ...env };
      const calls: AfribitChatRequest[] = [];
      const response = (r: AfribitChatRequest): AfribitChatResponse => ({ requestId: r.requestId, content: r.modelProfile.startsWith("waiter_") ? JSON.stringify({ question_en: "What is Bitcoin?", keywords_en: ["Bitcoin"], intent: "explain", register: "english" }) : r.modelProfile === "chef_cloud" ? JSON.stringify({ points: ["Bitcoin uses an open network."], example: null, warnings: [], not_covered: false, check_topic: "What is Bitcoin?" }) : "Bitcoin uses an open network.", provider: env.inferenceMode === "cloud" ? "openrouter" : "local", model: "synthetic", usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, latencyMs: 1, finishReason: "stop", estimatedCostUsd: 0 });
      const gateway = { async chat(r: AfribitChatRequest) { calls.push(r); return response(r); }, async *chatStream(r: AfribitChatRequest) { calls.push(r); const out = response(r); yield out.content; return out; } } as unknown as AfribitAIGateway;
      const input = (user: string, sessionId: string | null = null) => ({ userId: user, sessionId, message: "What is Bitcoin?", languageMode: "simple_en", explanationLevel: "simple" as const });
      try {
        Object.assign(env, { inferenceMode: "node", localLlmBaseUrl: "http://127.0.0.1:11434", embeddingProvider: "openrouter", cloudEmbeddingsAllowed: false, waiterQueryRewrite: false, chatPipeline: "single", promptMode: "full", gapLabelling: false });
        const local = await memoryStore.create(A, pack, "PRIVATE-CONTEXT-GARDEN");
        const remote = await memoryStore.create(A, pack, "REMOTE-CONTEXT-EXPLICIT", true);
        for (const promptMode of ["full", "compact"]) {
          Object.assign(env, { promptMode }); calls.length = 0; await sendMessage(gateway, input(A));
          assert.ok(JSON.stringify(calls.at(-1)!.messages).includes(local.content)); assert.equal(calls.at(-1)!.contextPrivacy, "personal-local-only");
        }
        calls.length = 0; await sendMessage(gateway, input(B)); assert.equal(JSON.stringify(calls).includes(local.content), false);
        calls.length = 0; await streamMessage(gateway, input(A), () => { }); assert.ok(JSON.stringify(calls.at(-1)!.messages).includes(local.content));
        calls.length = 0; const first = await sendMessage(gateway, input(A));
        await memoryStore.enable(A, pack, false); calls.length = 0; await sendMessage(gateway, input(A, first.sessionId));
        assert.equal(calls.at(-1)!.contextPrivacy, "personal-local-only"); assert.equal(JSON.stringify(calls.at(-1)!.messages).includes(local.content), false);
        await memoryStore.enable(A, pack, true);
        Object.assign(env, { inferenceMode: "cloud", chatPipeline: "restaurant" }); calls.length = 0; await sendMessage(gateway, input(A));
        assert.equal(JSON.stringify(calls).includes(local.content), false); assert.ok(JSON.stringify(calls.at(-1)!.messages).includes(remote.content));
        assert.ok(calls.some((r) => r.modelProfile === "chef_cloud"));
        assert.ok(calls.filter((r) => r.modelProfile.startsWith("waiter_") || r.modelProfile === "chef_cloud").every((r) => !JSON.stringify(r.messages).includes(remote.content)));
        Object.assign(env, { inferenceMode: "node", localLlmBaseUrl: "https://remote.example.invalid" });
        assert.deepEqual((await memoryStore.forPrompt(A, pack, false)).map((r) => r.id), [remote.id]);
      } finally { Object.assign(env, previous); }
    });
    await ok("memory: account review flags and thumbs-down do not disclose stored chat without explicit attachment", async () => {
      const s = (await one(`INSERT INTO chat_sessions (user_id,pack_id,language_mode,explanation_level) VALUES ($1,$2,'simple_en','simple') RETURNING id`, [A, pack])).id;
      await db.query(`INSERT INTO chat_messages (session_id,role,content) VALUES ($1,'user','PRIVATE-QUESTION-CANARY')`, [s]);
      const m = (await one(`INSERT INTO chat_messages (session_id,role,content,safety_flag) VALUES ($1,'assistant','PRIVATE-ANSWER-CANARY','ungrounded') RETURNING id`, [s])).id;
      await db.query(`INSERT INTO safety_events (session_id,kind,details,created_at)
        SELECT $1,'ungrounded_answer','{"words":["PRIVATE-WORD-CANARY"]}'::jsonb,created_at-interval '1 microsecond' FROM chat_messages WHERE id=$2`, [s,m]);
      const f = (await one(`INSERT INTO message_feedback (message_id,rating) VALUES ($1,'not_helpful') RETURNING id`, [m])).id;
      const opts = { state: "open" as const, limit: 100, packId: pack, defaultPackId: pack };
      const queue = await pilotStore.queue(opts); assert.equal(JSON.stringify(queue).includes("PRIVATE-"), false);
      assert.equal(queue.items.find((r) => r.feedbackId === f)?.answer, "");
      assert.deepEqual(queue.flagged.find((r)=>r.messageId===m)?.words,[]);
      await db.query(`UPDATE message_feedback SET question_text='Explicitly shared question',answer_text='Explicitly shared answer' WHERE id=$1`, [f]);
      assert.equal((await pilotStore.queue(opts)).items.find((r) => r.feedbackId === f)?.answer, "Explicitly shared answer");
    });
    await ok("memory: account deletion always erases private memory; approved contributions honor keep/delete", async () => {
      for (const choice of ["keep", "delete"] as const) {
        const user = (await one(`INSERT INTO users (email,role,created_via) VALUES ($1,'learner','registered') RETURNING id`, [`memory-${choice}@x`])).id;
        await memoryStore.enable(user, pack, true); const n = await memoryStore.create(user, pack, "Synthetic approved contribution");
        const s = await promotionStore.submit(user, pack, n.id, 1, true); await promotionStore.decide(R1, pack, s.id, "approve"); await promotionStore.decide(R2, pack, s.id, "approve");
        const pendingNote = await memoryStore.create(user, pack, "Synthetic pending contribution"); const pending = await promotionStore.submit(user, pack, pendingNote.id, 1, true);
        await privacyStore.deleteAccount(user, choice);
        assert.deepEqual(await memoryStore.list(user, pack), { enabled: false, items: [] });
        assert.equal((await one(`SELECT content FROM community_knowledge_submissions WHERE id=$1`, [pending.id])).content, "");
        const row = await one(`SELECT user_id,status,content FROM community_knowledge_submissions WHERE id=$1`, [s.id]);
        assert.equal(row.user_id, null); assert.equal(row.status, choice === "keep" ? "approved" : "withdrawn"); assert.equal(row.content, choice === "keep" ? n.content : "");
      }
      assert.equal(JSON.stringify((await db.query(`SELECT details FROM audit_logs WHERE entity_type='memory'`)).rows).includes("CONTEXT"), false);
    });
  } finally { await app.close(); }
}
