import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pool } from "./pool.js";
import { privacyStore, PrivacyError } from "../privacy/store.js";
import { pilotStore } from "../pilot/store.js";
import { teachStore, TeachError } from "../teach/store.js";
import { invitationStore } from "../auth/invitationStore.js";
import { hashCode, normaliseCode } from "../auth/invitations.js";
import { gapStore, GapError } from "../gaps/store.js";
import { summarise } from "../gaps/rules.js";
import { runAccessCases } from "../chat/accessCases.js";
import { runCommunityCases } from "../community/communityCases.js";
import { runMemoryCases } from "../memory/memoryCases.js";
import { runProcessingCases } from "../privacy/processingCases.js";
import { runComputeCases } from "../compute/computeCases.js";

/**
 * pnpm --filter @afribit/api test:db -- the SQL of F-002 (privacy), F-003 ("say it your way") and F-012
 * (invitations) against a
 * real PostgreSQL, with no install and no Docker: PGlite is PostgreSQL compiled to WebAssembly. Every
 * migration in db/migrations is applied first, so a migration that does not apply fails here too.
 * PGlite has no pgvector, so vector columns become real[] for this check (nothing here touches embeddings).
 * GitHub Actions is not running for this repository (billing), so this runs in `pnpm test`, which the
 * release script runs before every deploy.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const MIG = path.resolve(here, "..", "..", "..", "..", "db", "migrations");
const db = new PGlite({ extensions: { pgcrypto } });
for (const f of readdirSync(MIG).filter((n) => n.endsWith(".sql")).sort()) {
  const sql = readFileSync(path.join(MIG, f), "utf8")
    .replace(/CREATE EXTENSION IF NOT EXISTS vector;/g, "")
    .replace(/CREATE INDEX idx_knowledge_embeddings_ivfflat[\s\S]*?WITH \(lists = 100\);/g, "")
    .replace(/\bvector\(\d+\)/g, "real[]")
    .replace(/embedding vector NOT NULL/g, "embedding real[] NOT NULL")
    .replace(/vector_dims\(embedding\)/g, "array_length(embedding, 1)");
  await db.exec(sql);
}

// The repo's pg pool, pointed at PGlite, adapting pg's SELECT/DML rowCount semantics.
const run = async (text: string, params: unknown[] = []) => {
  const r = await db.query(text, params);
  // PGlite reports affectedRows=0 for SELECT; pg reports the number of returned rows.
  return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
};
Object.assign(pool, { query: run, connect: async () => ({ query: run, release() {} }) });

let passed = 0;
const ok = async (name: string, fn: () => Promise<void>) => {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const one = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows[0] as any;
await ok("all migrations apply to an empty database", async () => {
  assert.ok((await one(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name = 'teach_suggestions'`)).n === 1);
});

// ── seed ──
const ADMIN = "00000000-0000-4000-8000-0000000000a1", CONTRIB = "00000000-0000-4000-8000-0000000000c1";
await db.query(`INSERT INTO users (id, email, role, created_via) VALUES ($1,'a@x','admin','registered'), ($2,'c@x','contributor','registered')`, [ADMIN, CONTRIB]);
const S_OLD = "10000000-0000-4000-8000-000000000001", S_REPORTED = "10000000-0000-4000-8000-000000000002", S_NEW = "10000000-0000-4000-8000-000000000003", S_USER = "10000000-0000-4000-8000-000000000004";
for (const [id, user] of [[S_OLD, null], [S_REPORTED, null], [S_NEW, null], [S_USER, CONTRIB]] as const)
  await db.query(`INSERT INTO chat_sessions (id, user_id, language_mode, explanation_level) VALUES ($1, $2, 'sheng', 'normal')`, [id, user]);
const msg = async (session: string, role: string, content: string, daysAgo: number) =>
  (await one(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES ($1,$2,$3, now() - make_interval(days => $4::int)) RETURNING id`, [session, role, content, daysAgo])).id as string;
await msg(S_OLD, "user", "old question", 40);
await msg(S_OLD, "assistant", "old answer", 40);
await msg(S_REPORTED, "user", "reported question", 40);
const reportedAnswer = await msg(S_REPORTED, "assistant", "reported answer", 40);
await msg(S_NEW, "user", "new question", 2);
await msg(S_USER, "user", "contributor's question", 1);
await db.query(`INSERT INTO message_feedback (message_id, rating, reason) VALUES ($1, 'not_helpful', 'wrong_information')`, [reportedAnswer]);
// A report resolved 31 days ago with text attached, and one resolved yesterday.
const oldAns = await msg(S_NEW, "assistant", "x", 1);
await db.query(`INSERT INTO message_feedback (message_id, rating, comment, question_text, answer_text, reviewed_at, resolution) VALUES ($1,'not_helpful','c','q','a', now() - interval '31 days','answer_ok'), ($1,'not_helpful','c2','q2','a2', now() - interval '1 day','answer_ok')`, [oldAns]);
await db.query(`INSERT INTO language_entries (utterance, style, contributor_key, corpus_layer) VALUES ('Niaje msee', 'sheng', $1, 'L2_community_collected'), ('Sasa', 'sheng', $1, 'L2_community_collected')`, [CONTRIB]);

await ok("sweep(30): empties text older than 30 days, keeps newer, keeps a conversation with an open report", async () => {
  const r = await privacyStore.sweep(30);
  assert.equal(r.messagesEmptied, 2);
  assert.equal(r.reportsCleared, 1); // the report resolved 31 days ago
  const old = (await db.query(`SELECT content, content_deleted_at FROM chat_messages WHERE session_id = $1`, [S_OLD])).rows as any[];
  assert.ok(old.every((m) => m.content === "" && m.content_deleted_at));
  assert.equal((await one(`SELECT count(*)::int AS n FROM chat_messages WHERE session_id = $1 AND content <> ''`, [S_REPORTED])).n, 2);
  assert.equal((await one(`SELECT content FROM chat_messages WHERE session_id = $1 AND role = 'user'`, [S_NEW])).content, "new question");
});
await ok("sweep: report text is cleared 30 days after resolution, not before", async () => {
  const r = await privacyStore.sweep(null);
  assert.equal(r.reportsCleared, 0); // already cleared by the first sweep; a second is a no-op
  const rows = (await db.query(`SELECT comment, question_text, answer_text FROM message_feedback WHERE resolution = 'answer_ok' ORDER BY reviewed_at`)).rows as any[];
  assert.deepEqual(rows[0], { comment: null, question_text: null, answer_text: null });
  assert.deepEqual(rows[1], { comment: "c2", question_text: "q2", answer_text: "a2" });
  assert.equal((await privacyStore.sweep(30)).messagesEmptied, 0); // idempotent
});
await ok("sweep: writes an audit entry with counts only", async () => {
  const a = await one(`SELECT details FROM audit_logs WHERE action = 'expire_text' ORDER BY created_at LIMIT 1`);
  assert.deepEqual(Object.keys(a.details).sort(), ["messagesEmptied", "reportsCleared"]);
});
await ok("the GET-conversation query leaves out emptied messages", async () => {
  const rows = (await db.query(`SELECT id, role, content, created_at FROM chat_messages WHERE session_id = $1 AND content_deleted_at IS NULL AND content <> '' ORDER BY created_at ASC`, [S_OLD])).rows;
  assert.equal(rows.length, 0);
});
await ok("pilot queue: shows the text a learner shared with a report when the chat text is gone", async () => {
  await db.query(`UPDATE chat_messages SET content = '' WHERE session_id = $1`, [S_REPORTED]);
  await db.query(`UPDATE message_feedback SET question_text = 'shared q', answer_text = 'shared a' WHERE message_id = $1`, [reportedAnswer]);
  const q = await pilotStore.queue({ state: "open", limit: 10, packId: "kibera-bitcoin", defaultPackId: "kibera-bitcoin" });
  const item = q.items.find((i: any) => i.messageId === reportedAnswer);
  assert.ok(item, "reported item in the queue");
  assert.equal(item.question, "shared q");
  assert.equal(item.answer, "shared a");
});
await ok("deleteSessions: deletes the conversation, its messages and feedback; safety events keep their row", async () => {
  await db.query(`INSERT INTO safety_events (session_id, kind) VALUES ($1, 'seed_phrase_detected')`, [S_REPORTED]);
  await db.query(`UPDATE chat_sessions SET user_id = $2 WHERE id = $1`, [S_REPORTED, ADMIN]);
  assert.equal(await privacyStore.deleteSessions([S_REPORTED, "10000000-0000-4000-8000-0000000000ff"], { userId: ADMIN }), 1);
  assert.equal((await one(`SELECT count(*)::int AS n FROM chat_messages WHERE session_id = $1`, [S_REPORTED])).n, 0);
  assert.equal((await one(`SELECT count(*)::int AS n FROM message_feedback WHERE message_id = $1`, [reportedAnswer])).n, 0);
  assert.equal((await one(`SELECT count(*)::int AS n FROM safety_events WHERE kind = 'seed_phrase_detected' AND session_id IS NULL`)).n, 1);
});
await ok("deleteAccount(keep): conversations and account gone, contributions kept without the name", async () => {
  const r = await privacyStore.deleteAccount(CONTRIB, "keep");
  assert.deepEqual(r, { conversations: 1, contributions: 2 });
  assert.equal((await one(`SELECT count(*)::int AS n FROM users WHERE id = $1`, [CONTRIB])).n, 0);
  assert.equal((await one(`SELECT count(*)::int AS n FROM language_entries WHERE contributor_key IS NULL AND utterance IN ('Niaje msee','Sasa')`)).n, 2);
});
await ok("deleteAccount: the last administrator is refused and nothing changes", async () => {
  await assert.rejects(() => privacyStore.deleteAccount(ADMIN, "delete"), (e: any) => e instanceof PrivacyError && e.status === 409);
  assert.equal((await one(`SELECT count(*)::int AS n FROM users WHERE id = $1`, [ADMIN])).n, 1);
});
await ok("deleteAccount(delete): contributions deleted with the account", async () => {
  const C2 = "00000000-0000-4000-8000-0000000000c2";
  await db.query(`INSERT INTO users (id, email, role, created_via) VALUES ($1,'c2@x','contributor','registered')`, [C2]);
  await db.query(`INSERT INTO language_entries (utterance, style, contributor_key, corpus_layer) VALUES ('Form gani', 'sheng', $1, 'L2_community_collected')`, [C2]);
  assert.deepEqual(await privacyStore.deleteAccount(C2, "delete"), { conversations: 0, contributions: 1 });
  assert.equal((await one(`SELECT count(*)::int AS n FROM language_entries WHERE utterance = 'Form gani'`)).n, 0);
});

// ── F-003: "say it your way" ──
const R1 = "00000000-0000-4000-8000-0000000000b1", R2 = "00000000-0000-4000-8000-0000000000b2";
await db.query(`INSERT INTO users (id, email, role, created_via) VALUES ($1,'r1@x','admin','registered'), ($2,'r2@x','admin','registered')`, [R1, R2]);
const S_T = "10000000-0000-4000-8000-0000000000a5";
await db.query(`INSERT INTO chat_sessions (id, language_mode, explanation_level, pack_id) VALUES ($1, 'sheng', 'normal', 'kibera-bitcoin')`, [S_T]);
const base = { messageId: null, reason: "too_formal" as const, languageMode: "sheng", packId: "kibera-bitcoin", createdBy: null };
let plain: string, safety: string;
await ok("teach create: stored inert, unknown ids become null, safety topics are marked", async () => {
  plain = (await teachStore.create({ ...base, sessionId: S_T, questionText: "Lightning ni nini?", answerText: "Ni njia ya kulipa haraka", suggestion: "Lightning ni ile njia ya kulipa fasta, msee", consent: { answers: true, testing: true, training: false } })).id;
  const s = await teachStore.create({ ...base, sessionId: "10000000-0000-4000-8000-0000000000ee", questionText: null, answerText: null, suggestion: "Usipatie mtu seed phrase yako, hata support", consent: { answers: true, testing: false, training: false } });
  safety = s.id;
  assert.equal(s.safetyTopic, true);
  assert.equal((await one(`SELECT session_id FROM teach_suggestions WHERE id = $1`, [safety])).session_id, null);
  assert.equal((await one(`SELECT count(*)::int AS n FROM language_entries WHERE source = 'teach_mode'`)).n, 0);
});
await ok("teach create: at most 3 a day from one conversation", async () => {
  await teachStore.create({ ...base, sessionId: S_T, questionText: null, answerText: null, suggestion: "pili ya kwanza", consent: { answers: false, testing: false, training: false } });
  await teachStore.create({ ...base, sessionId: S_T, questionText: null, answerText: null, suggestion: "tatu ya kwanza", consent: { answers: false, testing: false, training: false } });
  await assert.rejects(() => teachStore.create({ ...base, sessionId: S_T, questionText: null, answerText: null, suggestion: "nne", consent: { answers: false, testing: false, training: false } }), (e: any) => e instanceof TeachError && e.status === 429);
});
await ok("teach queue: pending items and weekly counts for this pack", async () => {
  const q = await teachStore.queue({ state: "pending", limit: 10, packId: "kibera-bitcoin", defaultPackId: "kibera-bitcoin" });
  assert.equal(q.counts.pending, 4);
  assert.equal(q.counts.raisedWeek, 4);
  assert.ok(q.items.some((i: any) => i.id === safety && i.safetyTopic));
});
await ok("teach approve: a phrase with exactly the consented uses, found by language-example retrieval", async () => {
  const r = await teachStore.decide({ id: plain, actor: R1, decision: "approve", text: "Lightning ni njia ya kulipa fasta", note: null, packId: "kibera-bitcoin", defaultPackId: "kibera-bitcoin" });
  assert.equal(r.status, "approved");
  const e = await one(`SELECT * FROM language_entries WHERE id = $1`, [r.languageEntryId]);
  assert.equal(e.utterance, "Lightning ni njia ya kulipa fasta");
  assert.deepEqual([e.status, e.allowed_for_rag, e.allowed_for_evaluation, e.allowed_for_training, e.synthetic, e.human_authored], ["approved", true, true, false, false, true]);
  // The same query retrieveLanguageExamples() runs:
  const hits = (await db.query(`SELECT utterance FROM language_entries WHERE status = 'approved' AND allowed_for_rag = true AND COALESCE(pack_id, $3) = $4
     AND to_tsvector('simple', utterance || ' ' || coalesce(meaning, '')) @@ to_tsquery('simple', $1) LIMIT $2`, ["lightning", 5, "kibera-bitcoin", "kibera-bitcoin"])).rows as any[];
  assert.ok(hits.some((h) => h.utterance === "Lightning ni njia ya kulipa fasta"));
  await assert.rejects(() => teachStore.decide({ id: plain, actor: R2, decision: "reject", text: null, note: null, packId: "kibera-bitcoin", defaultPackId: "kibera-bitcoin" }), (x: any) => x.status === 409);
});
await ok("teach safety topic: first approval waits; the same reviewer cannot finish it; a second can", async () => {
  const a = await teachStore.decide({ id: safety, actor: R1, decision: "approve", text: null, note: null, packId: "kibera-bitcoin", defaultPackId: "kibera-bitcoin" });
  assert.deepEqual(a, { status: "pending", languageEntryId: null });
  await assert.rejects(() => teachStore.decide({ id: safety, actor: R1, decision: "approve", text: null, note: null, packId: "kibera-bitcoin", defaultPackId: "kibera-bitcoin" }), (x: any) => x.status === 409);
  const b = await teachStore.decide({ id: safety, actor: R2, decision: "approve", text: null, note: null, packId: "kibera-bitcoin", defaultPackId: "kibera-bitcoin" });
  assert.equal(b.status, "approved");
  const e = await one(`SELECT allowed_for_rag, allowed_for_training FROM language_entries WHERE id = $1`, [b.languageEntryId]);
  assert.deepEqual(e, { allowed_for_rag: true, allowed_for_training: false });
  assert.equal((await one(`SELECT count(*)::int AS n FROM audit_logs WHERE action = 'decide_suggestion'`)).n, 3);
});
await ok("deleting the conversation clears the text shared with its suggestions; the suggestion stays", async () => {
  await db.query(`UPDATE chat_sessions SET user_id = $2 WHERE id = $1`, [S_T, R1]);
  await privacyStore.deleteSessions([S_T], { userId: R1 });
  const s = await one(`SELECT session_id, question_text, answer_text, status FROM teach_suggestions WHERE id = $1`, [plain]);
  assert.deepEqual(s, { session_id: null, question_text: null, answer_text: null, status: "approved" });
});

// ── F-012: accounts by invitation only ──
const reg = (code: string, email: string) => invitationStore.register({ code, email, passwordHash: "x", displayName: null });
await ok("invitation: only the hash is stored; using it creates the account with its role, once", async () => {
  const inv = await invitationStore.create({ role: "reviewer", note: "Amina", days: 7, createdBy: ADMIN });
  const row = await one(`SELECT code_hash, role, created_by FROM invitations WHERE id = $1`, [inv.id]);
  assert.equal(row.code_hash, hashCode(inv.code));
  assert.equal((await one(`SELECT count(*)::int AS n FROM invitations WHERE code_hash LIKE '%' || $1 || '%'`, [normaliseCode(inv.code)])).n, 0);
  const user = await reg(inv.code.toLowerCase(), "amina@x");
  assert.equal(user?.role, "reviewer");
  assert.equal((await one(`SELECT role, created_via FROM users WHERE email = 'amina@x'`)).role, "reviewer");
  assert.equal(await reg(inv.code, "someone-else@x"), null);
  assert.equal((await one(`SELECT count(*)::int AS n FROM users WHERE email = 'someone-else@x'`)).n, 0);
  const listed = (await invitationStore.list(10)).find((i) => i.id === inv.id);
  assert.deepEqual([listed?.state, listed?.usedBy, listed?.note], ["used", "amina@x", "Amina"]);
});
await ok("invitation: expired and revoked codes create nothing; only an unused one can be revoked", async () => {
  const expired = await invitationStore.create({ role: "contributor", note: null, days: 1, createdBy: null });
  await db.query(`UPDATE invitations SET expires_at = now() - interval '1 minute' WHERE id = $1`, [expired.id]);
  assert.equal(await reg(expired.code, "late@x"), null);
  assert.equal((await invitationStore.list(10)).find((i) => i.id === expired.id)?.state, "expired");
  const revoked = await invitationStore.create({ role: "contributor", note: null, days: 7, createdBy: ADMIN });
  assert.equal(await invitationStore.revoke(revoked.id, ADMIN), true);
  assert.equal(await invitationStore.revoke(revoked.id, ADMIN), false);
  assert.equal(await reg(revoked.code, "revoked@x"), null);
  const used = (await invitationStore.list(10)).find((i) => i.state === "used")!;
  assert.equal(await invitationStore.revoke(used.id, ADMIN), false);
});
await ok("invitation: an email that already has an account rolls back and leaves the code usable", async () => {
  const inv = await invitationStore.create({ role: "contributor", note: null, days: 7, createdBy: ADMIN });
  await assert.rejects(() => reg(inv.code, "amina@x"), (e: any) => e.code === "23505");
  assert.equal((await one(`SELECT used_at FROM invitations WHERE id = $1`, [inv.id])).used_at, null);
  assert.equal((await reg(inv.code, "fresh@x"))?.role, "contributor");
});
await ok("invitation: deleting the account that used or made one keeps the invitation row", async () => {
  const fresh = await one(`SELECT id FROM users WHERE email = 'fresh@x'`);
  await privacyStore.deleteAccount(fresh.id, "keep");
  assert.equal((await one(`SELECT count(*)::int AS n FROM invitations WHERE used_by IS NULL AND used_at IS NOT NULL`)).n, 1);
});
await ok("invitation: creating, using and revoking are in the audit log, never with the code", async () => {
  const a = (await db.query(`SELECT action, actor, details FROM audit_logs WHERE entity_type = 'invitation'`)).rows as any[];
  for (const action of ["create_invitation", "use_invitation", "revoke_invitation"]) assert.ok(a.some((x) => x.action === action), action);
  assert.ok(a.some((x) => x.action === "create_invitation" && x.actor === "operator"));
  assert.ok(a.every((x) => !JSON.stringify(x.details ?? {}).includes("AFB")));
});
// ── F-004: the gap list ──
await db.query(`INSERT INTO knowledge_entries (id, title, canonical_answer, beginner_answer, status) VALUES ('btc.buy.001', 'Buying Bitcoin', 'x', 'x', 'published'), ('btc.buy.002', 'Buying Bitcoin with M-Pesa', 'x', 'x', 'published')`);
await ok("gaps: the event table has no column for question text or a link to a chat, message or user", async () => {
  const cols = ((await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'gap_events' ORDER BY column_name`)).rows as any[]).map((r) => r.column_name);
  assert.deepEqual(cols, ["confidence", "day", "id", "language_mode", "nearest_card", "pack_id", "topic_id"]);
});
await ok("gaps: labels that differ only in case or spacing share a topic; an unknown nearest card is stored as unknown", async () => {
  const rec = (label: string | null, lang = "sheng", card: string | null = "btc.buy.001") =>
    gapStore.record({ packId: "kibera-bitcoin", label, languageMode: lang, nearestCard: card, confidence: 0.1 });
  for (let i = 0; i < 4; i++) await rec("Buying Bitcoin with M-Pesa");
  await rec("buying bitcoin with m-pesa", "simple_en");
  await rec("Football results", "sheng", "no.such.card");
  await rec(null);
  await gapStore.record({ packId: "other-pack", label: "Buying Bitcoin with M-Pesa", languageMode: "sheng", nearestCard: null, confidence: 0.2 });
  assert.equal((await one(`SELECT count(*)::int AS n FROM gap_topics WHERE pack_id = 'kibera-bitcoin'`)).n, 2);
  assert.equal((await one(`SELECT count(*)::int AS n FROM gap_events WHERE nearest_card IS NULL AND pack_id = 'kibera-bitcoin'`)).n, 1);
  assert.deepEqual(await gapStore.openTopics("kibera-bitcoin", 10), ["Buying Bitcoin with M-Pesa", "Football results"]);
});
await ok("gaps: the list groups by topic for this community only, and shows a topic only at 5 or more", async () => {
  const s = summarise(await gapStore.rows({ packId: "kibera-bitcoin", days: 30 }));
  assert.equal(s.total, 7);
  assert.deepEqual(s.topics.map((t) => [t.label, t.count]), [["Buying Bitcoin with M-Pesa", 5]]);
  assert.deepEqual(s.topics[0]!.nearestCards, [{ id: "btc.buy.001", title: "Buying Bitcoin", count: 5 }]);
  assert.deepEqual(s.hidden, { topics: 2, questions: 2 });
});
await ok("gaps: a decision names a real card, is scoped to the community, and is audited", async () => {
  const id = (await one(`SELECT id FROM gap_topics WHERE pack_id = 'kibera-bitcoin' AND label = 'Buying Bitcoin with M-Pesa'`)).id as string;
  await assert.rejects(() => gapStore.decide({ id, packId: "kibera-bitcoin", actor: ADMIN, status: "card_written", cardId: "no.such.card", note: null }), (e: any) => e instanceof GapError && e.status === 400);
  await assert.rejects(() => gapStore.decide({ id, packId: "other-pack", actor: ADMIN, status: "out_of_scope", cardId: null, note: null }), (e: any) => e instanceof GapError && e.status === 404);
  assert.deepEqual(await gapStore.decide({ id, packId: "kibera-bitcoin", actor: ADMIN, status: "card_written", cardId: "btc.buy.002", note: "steps added" }), { id, status: "card_written" });
  const t = summarise(await gapStore.rows({ packId: "kibera-bitcoin", days: 30 })).topics[0]!;
  assert.deepEqual([t.status, t.cardId, t.cardTitle, t.note], ["card_written", "btc.buy.002", "Buying Bitcoin with M-Pesa", "steps added"]);
  assert.deepEqual(await gapStore.openTopics("kibera-bitcoin", 10), ["Football results"]); // decided topics are not offered to the labeller
  assert.equal((await one(`SELECT count(*)::int AS n FROM audit_logs WHERE action = 'decide_gap' AND entity_id = $1`, [id])).n, 1);
});
await runAccessCases(db, ok);
await runCommunityCases(db, ok);
await runMemoryCases(db, ok);
await runProcessingCases(db, ok);
await runComputeCases(db, ok);
await db.close();
console.log(`db: ${passed} checks passed against PostgreSQL (PGlite)`);
process.exit(0);
