import assert from "node:assert/strict";
import Fastify from "fastify";
import { authPlugin } from "../auth/plugin.js";
import { registerTeachRoutes } from "../routes/teach.js";
import { decide, entryFlags, isSafetyTopic, MAX_SUGGESTION, parseSuggestion, type Decision } from "./rules.js";
import { TeachError, type TeachStore } from "./store.js";

/**
 * pnpm --filter @afribit/api test:teach -- "say it your way" (F-003) without a database: validation,
 * the safety-topic rule, consent mapping, the decision rules (self-approval, two reviewers on safety),
 * and who may call each route. The SQL runs against PostgreSQL in the release check (docs/book).
 */

let passed = 0;
async function ok(name: string, fn: () => void | Promise<void>): Promise<void> {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const body = (o: Record<string, unknown> = {}) => ({ suggestion: "Bitcoin ni pesa ya digital, msee", languageMode: "sheng", ...o });

// ── rules ─────────────────────────────────────────────────────────────────────────────────────────
await ok("suggestion: length, mode and reason are checked; ids that are not ids are dropped", () => {
  assert.equal(parseSuggestion(body({ suggestion: "ok" })).ok, false);
  assert.equal(parseSuggestion(body({ suggestion: "x".repeat(MAX_SUGGESTION + 1) })).ok, false);
  assert.equal(parseSuggestion(body({ languageMode: "" })).ok, false);
  assert.equal(parseSuggestion(body({ reason: "because" })).ok, false);
  assert.equal(parseSuggestion(null).ok, false);
  const r = parseSuggestion(body({ reason: "too_formal", sessionId: "not-an-id", messageId: "11111111-1111-4111-8111-111111111111" }));
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.sessionId, null);
    assert.equal(r.value.messageId, "11111111-1111-4111-8111-111111111111");
    assert.equal(r.value.reason, "too_formal");
  }
});
await ok("consent: missing means no; only an explicit true counts", () => {
  const r = parseSuggestion(body({ consent: { answers: "yes", testing: 1, training: true } }));
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value.consent, { answers: false, testing: false, training: true });
  const none = parseSuggestion(body());
  assert.ok(none.ok && !none.value.consent.answers && !none.value.consent.training);
});
await ok("an approved suggestion is used only as the member allowed (consent AND approval)", () => {
  assert.deepEqual(entryFlags({ answers: true, testing: false, training: false }), { allowed_for_rag: true, allowed_for_evaluation: false, allowed_for_training: false });
  assert.deepEqual(entryFlags({ answers: false, testing: true, training: true }), { allowed_for_rag: false, allowed_for_evaluation: true, allowed_for_training: true });
});
await ok("safety topics are recognised in English, Kiswahili and Sheng", () => {
  for (const t of ["Usipatie mtu seed phrase yako", "never share your PIN", "hiyo ni scam, msee", "jamaa wa support anataka password", "usitume pesa kwa mtu hujui", "tuma pesa", "double your sats"]) assert.equal(isSafetyTopic(t), true, t);
  for (const t of ["Bitcoin ni pesa ya digital", "Lightning ni fast sana", "wallet ni app ya keys"]) assert.equal(isSafetyTopic(t), false, t);
  assert.equal(isSafetyTopic(null, "the answer mentioned a recovery phrase"), true);
});
await ok("decisions: approve, reject, card fix; never twice; never your own", () => {
  const base = { status: "pending", safetyTopic: false, createdBy: null, firstApprovalBy: null, actor: "r1" };
  assert.equal(decide({ ...base, decision: "approve" }).kind, "approved");
  assert.equal(decide({ ...base, decision: "reject" }).kind, "rejected");
  assert.equal(decide({ ...base, decision: "card_fix" }).kind, "card_fix");
  assert.equal(decide({ ...base, status: "approved", decision: "approve" }).kind, "refused");
  assert.equal(decide({ ...base, createdBy: "r1", decision: "approve" }).kind, "refused");
});
await ok("decisions: a safety topic needs two different reviewers to approve", () => {
  const base = { status: "pending", safetyTopic: true, createdBy: null, actor: "r1", decision: "approve" as Decision };
  assert.equal(decide({ ...base, firstApprovalBy: null }).kind, "first_approval");
  assert.equal(decide({ ...base, firstApprovalBy: "r1" }).kind, "refused");
  assert.equal(decide({ ...base, firstApprovalBy: "r2" }).kind, "approved");
  assert.equal(decide({ ...base, firstApprovalBy: null, decision: "reject" }).kind, "rejected"); // one reviewer can always say no
});

// ── routes, with a fake store ─────────────────────────────────────────────────────────────────────
const created: unknown[] = [];
const decided: unknown[] = [];
const roles: Record<string, string> = { r1: "reviewer", a1: "admin", c1: "contributor", demoted: "contributor" };
const store: TeachStore = {
  async currentRole(id) {
    return roles[id] ?? null;
  },
  async create(input) {
    created.push(input);
    if (input.sessionId === "22222222-2222-4222-8222-222222222222") throw new TeachError(429, "too many");
    return { id: "33333333-3333-4333-8333-333333333333", safetyTopic: false };
  },
  async queue() {
    return { items: [], counts: { pending: 0, raisedWeek: 0, approvedWeek: 0, rejectedWeek: 0, cardFixWeek: 0 } };
  },
  async decide(opts) {
    decided.push(opts);
    if (opts.id === "44444444-4444-4444-8444-444444444444") throw new TeachError(409, "already decided");
    return { status: "approved", languageEntryId: "55555555-5555-4555-8555-555555555555" };
  },
};
const app = Fastify();
await app.register(authPlugin);
registerTeachRoutes(app, store);
await app.ready();
const as = (id: string, role: "contributor" | "reviewer" | "admin") => ({ authorization: `Bearer ${app.jwt.sign({ id, role })}` });
const SUG = "66666666-6666-4666-8666-666666666666";

await ok("anyone may suggest, without an account; the consent travels with it", async () => {
  created.length = 0;
  const res = await app.inject({ method: "POST", url: "/api/v1/teach", payload: body({ consent: { answers: true } }) });
  assert.equal(res.statusCode, 201);
  assert.equal((created[0] as { createdBy: unknown }).createdBy, null);
  assert.deepEqual((created[0] as { consent: unknown }).consent, { answers: true, testing: false, training: false });
});
await ok("a signed-in suggester is recorded, so they cannot approve their own", async () => {
  created.length = 0;
  await app.inject({ method: "POST", url: "/api/v1/teach", headers: as("c1", "contributor"), payload: body() });
  assert.equal((created[0] as { createdBy: unknown }).createdBy, "c1");
});
await ok("a suggestion holding a seed phrase is refused and never stored", async () => {
  created.length = 0;
  const seed = "abandon ability able about above absent absorb abstract absurd abuse access accident";
  const res = await app.inject({ method: "POST", url: "/api/v1/teach", payload: body({ suggestion: seed }) });
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().secret, true);
  assert.equal((await app.inject({ method: "POST", url: "/api/v1/teach", payload: body({ answerText: seed }) })).statusCode, 400);
  assert.equal(created.length, 0);
});
await ok("an unknown language mode is refused; too many from one conversation is a 429", async () => {
  assert.equal((await app.inject({ method: "POST", url: "/api/v1/teach", payload: body({ languageMode: "klingon" }) })).statusCode, 400);
  assert.equal((await app.inject({ method: "POST", url: "/api/v1/teach", payload: body({ sessionId: "22222222-2222-4222-8222-222222222222" }) })).statusCode, 429);
});
await ok("the queue and decisions: reviewers and admins only, by token and by the database's role", async () => {
  const q = (h?: Record<string, string>) => app.inject({ method: "GET", url: "/api/v1/teach/queue", headers: h ?? {} });
  assert.equal((await q()).statusCode, 401);
  assert.equal((await q(as("c1", "contributor"))).statusCode, 403);
  assert.equal((await q(as("demoted", "reviewer"))).statusCode, 403); // the token says reviewer; the database no longer does
  assert.equal((await q(as("r1", "reviewer"))).statusCode, 200);
  assert.equal((await q(as("a1", "admin"))).statusCode, 200);
});
await ok("deciding: validated, attributed to the reviewer, store refusals passed through", async () => {
  decided.length = 0;
  const d = (id: string, payload: unknown) => app.inject({ method: "POST", url: `/api/v1/teach/${id}/decide`, headers: as("r1", "reviewer"), payload: payload as never });
  assert.equal((await d(SUG, { decision: "maybe" })).statusCode, 400);
  assert.equal((await d("not-an-id", { decision: "approve" })).statusCode, 404);
  const res = await d(SUG, { decision: "approve", text: "  Bitcoin ni pesa ya digital  ", note: "nice" });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(decided[0], { id: SUG, actor: "r1", decision: "approve", text: "Bitcoin ni pesa ya digital", note: "nice", packId: (decided[0] as { packId: string }).packId, defaultPackId: (decided[0] as { defaultPackId: string }).defaultPackId });
  assert.equal((await d("44444444-4444-4444-8444-444444444444", { decision: "approve" })).statusCode, 409);
});

await app.close();
console.log(`teach: ${passed} checks passed`);
