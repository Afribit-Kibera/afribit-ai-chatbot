import assert from "node:assert/strict";
import Fastify from "fastify";
import { env } from "../config/env.js";
import { authPlugin } from "../auth/plugin.js";
import { registerGapRoutes } from "../routes/gaps.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { isGap, labelPrompt, parseDecision, parseTopic, roundConfidence, sanitizeTopic, summarise, topicKey, type GapRow } from "./rules.js";
import { noteGap } from "./recorder.js";
import { GapError, type GapStore } from "./store.js";

/**
 * pnpm --filter @afribit/api test:gaps -- the gap list (F-004) without a database: what counts as a gap, the
 * labeller's prompt and the label checks, the "5 or more" rule, the recorder (never in the answer's way),
 * and who may read and decide. The SQL runs against real PostgreSQL in test:db.
 */
let passed = 0;
async function ok(name: string, fn: () => void | Promise<void>): Promise<void> {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
}

// ── rules ─────────────────────────────────────────────────────────────────────────────────────────
await ok("a gap: the best meaning-match under the threshold, or no card at all; nothing is judged without meaning search", () => {
  assert.equal(isGap(0.58, true, 0.65), true); // e.g. "Do I pay KRA tax on bitcoin?" scored 0.56 on 8 Oct
  assert.equal(isGap(null, true, 0.65), true);
  assert.equal(isGap(0.65, true, 0.65), false);
  assert.equal(isGap(0.79, true, 0.65), false); // "Bitcoin ni nini?"
  assert.equal(isGap(null, false, 0.65), false); // meaning search off or failed: cannot tell
  assert.deepEqual([roundConfidence(0.234), roundConfidence(0.25), roundConfidence(null), roundConfidence(1.7)], [0.2, 0.3, null, 1]);
});
await ok("the labeller's prompt lists the open topics and forbids identifying details; it never answers", () => {
  const p = labelPrompt(["Buying Bitcoin with M-Pesa", "Lightning payment failed"]);
  assert.match(p, /- Buying Bitcoin with M-Pesa\n- Lightning payment failed/);
  assert.match(p, /do NOT answer/);
  assert.match(p, /Never include names, phone numbers, amounts/);
  assert.match(labelPrompt([]), /\(none yet\)/);
});
await ok("labels: short and general pass; numbers, phones, emails, links, secrets and long ones are refused", () => {
  assert.equal(sanitizeTopic("  buying bitcoin with m-pesa. "), "Buying bitcoin with m-pesa");
  assert.equal(sanitizeTopic('"Lightning payment failed"'), "Lightning payment failed");
  for (const bad of ["Sending 500 shillings to John", "Call 0712 345 678", "mail me at a@b.co", "see https://x.io", "one two three four five six seven", "x", 42, null, "abandon ability able about above absent absorb abstract absurd abuse access accident"]) {
    assert.equal(sanitizeTopic(bad), null, String(bad));
  }
  assert.equal(parseTopic('Sure! ```json\n{"topic": "Fees on Lightning"}\n```'), "Fees on Lightning");
  assert.equal(parseTopic("no json here"), null);
  assert.equal(topicKey(" Fees  ON lightning "), "fees on lightning");
});

const row = (o: Partial<GapRow>): GapRow => ({
  topicId: "t1", label: "Buying Bitcoin with M-Pesa", status: "open", cardId: null, cardTitle: null, note: null,
  languageMode: "sheng", nearestCard: "btc.buy.001", nearestTitle: "Buying Bitcoin", count: 1, firstDay: "2026-10-01", lastDay: "2026-10-01", ...o,
});
await ok("the list shows a topic only at 5 or more; smaller ones are summed; languages under 5 are not named", () => {
  const s = summarise([
    row({ count: 4, languageMode: "sheng" }),
    row({ count: 2, languageMode: "simple_en", lastDay: "2026-10-07" }),
    row({ topicId: "t2", label: "Lightning payment failed", count: 3 }),
    row({ topicId: "t3", label: "Football results", count: 1 }),
    row({ topicId: null, label: null, status: null, count: 5, nearestCard: null, nearestTitle: null }),
  ]);
  assert.equal(s.total, 15);
  assert.deepEqual(s.hidden, { topics: 2, questions: 4 });
  const mpesa = s.topics.find((t) => t.id === "t1")!;
  assert.equal(mpesa.count, 6);
  assert.deepEqual(mpesa.languages, []); // sheng 4, simple_en 2: neither reaches 5
  assert.equal(mpesa.lastDay, "2026-10-07");
  assert.deepEqual(mpesa.nearestCards, [{ id: "btc.buy.001", title: "Buying Bitcoin", count: 6 }]);
  const unlabelled = s.topics.find((t) => t.id === null)!;
  assert.deepEqual([unlabelled.label, unlabelled.count], ["Unlabelled", 5]);
  assert.ok(!JSON.stringify(s).includes("Football"));
});
await ok("decisions: card written (with a card), out of scope, reopen; the note is checked for secrets", () => {
  assert.deepEqual(parseDecision({ status: "card_written", cardId: " btc.buy.002 ", note: "added M-Pesa steps" }), { ok: true, status: "card_written", cardId: "btc.buy.002", note: "added M-Pesa steps" });
  assert.deepEqual(parseDecision({ status: "out_of_scope", cardId: "x" }), { ok: true, status: "out_of_scope", cardId: null, note: null });
  assert.equal(parseDecision({ status: "done" }).ok, false);
  assert.equal(parseDecision({ status: "open", note: "my PIN is 4821" }).ok, false);
});

// ── the recorder ──────────────────────────────────────────────────────────────────────────────────
const recorded: unknown[] = [];
let failRecord = false;
const fakeStore = (topics: string[] = []): GapStore => ({
  async currentRole(id) {
    return ({ r1: "reviewer", a1: "admin", c1: "contributor", demoted: "contributor" } as Record<string, string>)[id] ?? null;
  },
  async openTopics() {
    return topics;
  },
  async record(input) {
    if (failRecord) throw new Error("db down");
    recorded.push(input);
  },
  async rows() {
    return [row({ count: 5 }), row({ topicId: "t9", label: "Rare topic", count: 2 })];
  },
  async decide(input) {
    if (input.id === "44444444-4444-4444-8444-444444444444") throw new GapError(404, "Topic not found");
    return { id: input.id, status: input.status };
  },
});
const seen: { messages?: { role: string; content: string }[]; modelProfile?: string }[] = [];
let reply = '{"topic": "buying bitcoin with m-pesa"}';
let gatewayFails = false;
const gateway = {
  async chat(req: { messages: { role: string; content: string }[]; modelProfile: string }) {
    seen.push(req);
    if (gatewayFails) throw new Error("model down");
    return { content: reply };
  },
} as unknown as AfribitAIGateway;
const input = { packId: "kibera-bitcoin", message: "Naweza kununua bitcoin na M-Pesa aje?", languageMode: "sheng", meaningScore: 0.52, nearestCard: "btc.buy.001", judged: true };

await ok("recorder: a covered question (meaning-match 0.65 or more), or one that cannot be judged, records nothing and calls no model", async () => {
  recorded.length = 0;
  seen.length = 0;
  assert.equal(await noteGap(gateway, { ...input, meaningScore: 0.8 }, fakeStore()), "none");
  assert.equal(await noteGap(gateway, { ...input, meaningScore: null, judged: false }, fakeStore()), "none");
  assert.equal(recorded.length + seen.length, 0);
});
await ok("recorder: a gap gets a topic (an existing one keeps its spelling); only the topic, day-level facts and a rounded score are stored", async () => {
  recorded.length = 0;
  assert.equal(await noteGap(gateway, input, fakeStore(["Buying Bitcoin with M-Pesa"])), "labelled");
  assert.deepEqual(recorded[0], { packId: "kibera-bitcoin", label: "Buying Bitcoin with M-Pesa", languageMode: "sheng", nearestCard: "btc.buy.001", confidence: 0.5 });
  assert.ok(!JSON.stringify(recorded[0]).includes("Naweza"));
  assert.equal(seen.at(-1)!.messages![1]!.content, input.message); // the labeller reads the question once
  assert.match(seen.at(-1)!.messages![0]!.content, /- Buying Bitcoin with M-Pesa/);
});
await ok("recorder: a bad label, a failing model, or GAP_LABELS=off still counts the gap, unlabelled", async () => {
  recorded.length = 0;
  reply = '{"topic": "Sending 5000 to my brother Otieno"}';
  assert.equal(await noteGap(gateway, input, fakeStore()), "unlabelled");
  gatewayFails = true;
  assert.equal(await noteGap(gateway, input, fakeStore()), "unlabelled");
  gatewayFails = false;
  const saved = env.gapLabels;
  (env as { gapLabels: boolean }).gapLabels = false;
  seen.length = 0;
  assert.equal(await noteGap(gateway, input, fakeStore()), "unlabelled");
  assert.equal(seen.length, 0);
  (env as { gapLabels: boolean }).gapLabels = saved;
  assert.equal(recorded.length, 3);
  assert.ok(recorded.every((r) => (r as { label: unknown }).label === null));
});
await ok("recorder: a database failure is logged, never thrown (the member's answer is untouched)", async () => {
  failRecord = true;
  assert.equal(await noteGap(gateway, input, fakeStore()), "failed");
  failRecord = false;
});

// ── routes ────────────────────────────────────────────────────────────────────────────────────────
const app = Fastify();
await app.register(authPlugin);
registerGapRoutes(app, fakeStore());
await app.ready();
const as = (id: string, role: "contributor" | "reviewer" | "admin") => ({ authorization: `Bearer ${app.jwt.sign({ id, role })}` });
await ok("the list: reviewers and admins only, by token and by the database's role; small topics hidden", async () => {
  const get = (h?: Record<string, string>, q = "") => app.inject({ method: "GET", url: `/api/v1/gaps${q}`, headers: h ?? {} });
  assert.equal((await get()).statusCode, 401);
  assert.equal((await get(as("c1", "contributor"))).statusCode, 403);
  assert.equal((await get(as("demoted", "reviewer"))).statusCode, 403);
  const r = await get(as("r1", "reviewer"), "?days=7");
  assert.equal(r.statusCode, 200);
  const body = r.json();
  assert.deepEqual([body.days, body.minShown, body.topics.length, body.hidden.topics], [7, 5, 1, 1]);
  assert.ok(!r.body.includes("Rare topic"));
  assert.equal((await get(as("a1", "admin"), "?days=365")).json().days, 30);
});
await ok("deciding: validated, passed to the store, unknown topics are 404", async () => {
  const d = (id: string, payload: unknown, h = as("r1", "reviewer")) => app.inject({ method: "POST", url: `/api/v1/gaps/${id}/decide`, headers: h, payload: payload as never });
  const T = "55555555-5555-4555-8555-555555555555";
  assert.equal((await d(T, { status: "maybe" })).statusCode, 400);
  assert.equal((await d("not-an-id", { status: "open" })).statusCode, 404);
  assert.equal((await d(T, { status: "out_of_scope" }, as("c1", "contributor"))).statusCode, 403);
  const r = await d(T, { status: "card_written", cardId: "btc.buy.002" });
  assert.deepEqual(r.json(), { id: T, status: "card_written" });
  assert.equal((await d("44444444-4444-4444-8444-444444444444", { status: "open" })).statusCode, 404);
});

await app.close();
console.log(`gaps: ${passed} checks passed`);
