import assert from "node:assert/strict";
import Fastify from "fastify";
import cors from "@fastify/cors";
import type { PGlite } from "@electric-sql/pglite";
import { authPlugin } from "../auth/plugin.js";
import { env } from "../config/env.js";
import { getPack, getRegistry, runWithPack, setRegistry } from "../pack/active.js";
import { buildRegistry } from "../pack/registry.js";
import { registerChatRoutes, type ChatService } from "../routes/chat.js";
import { registerPackRoutes } from "../routes/pack.js";
import { registerPrivacyRoutes } from "../routes/privacy.js";
import { registerPreferenceRoutes } from "../routes/preferences.js";
import { registerTeachRoutes } from "../routes/teach.js";
import { teachStore } from "../teach/store.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { sendMessage, sessionPackId, streamMessage, type SendMessageOutput } from "./chatService.js";
import { hashGuestToken, sessionAccess, SessionAccessError } from "./access.js";

/** Called by test:db after all migrations; no external model, network, or production database. */
export async function runAccessCases(db: PGlite, ok: (name: string, fn: () => Promise<void>) => Promise<void>) {
  const previous = getRegistry();
  const base = getPack();
  const other = { ...base, id: "access-other", domain: { ...base.domain, id: "access-other", retrievalDomains: ["access-other"] }, knowledge: { topics: [], entries: [] } };
  const registry = buildRegistry([base, other], base.id);
  assert.ok(registry.registry, registry.errors.join("\n"));
  setRegistry(registry.registry!);
  const A = "21000000-0000-4000-8000-000000000001", B = "21000000-0000-4000-8000-000000000002";
  const ids = Array.from({ length: 9 }, (_, i) => `22000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);
  const [SA, SB, SG, SG2, EXPIRED, LEGACY, NULLPACK, OTHERPACK, SA2] = ids as [string, string, string, string, string, string, string, string, string];
  const G = "a".repeat(64), G2 = "b".repeat(64);
  const input = (sessionId: string | null, userId: string | null, sessionToken?: string) => ({ sessionId, userId, sessionToken, message: "Bitcoin ni nini?" });
  const gateway = {} as AfribitAIGateway;
  const app = Fastify();
  let modelCalls = 0;
  const service: ChatService = {
    sessionPackId,
    async sendMessage(_g, i) { modelCalls++; return { sessionId: i.sessionId!, content: "allowed" } as SendMessageOutput; },
    async streamMessage(_g, i, emit) { modelCalls++; emit({ type: "meta", sessionId: i.sessionId!, safetyFlag: null }); emit({ type: "done", messageId: "test", usedFallback: false }); },
  };
  try {
    await db.query(`INSERT INTO users (id, email, role, created_via) VALUES ($1, 'access-a@x', 'admin', 'registered'), ($2, 'access-b@x', 'contributor', 'registered')`, [A, B]);
    for (const [id, owner, pack, secret, expired] of [
      [SA, A, base.id, null, false], [SB, B, base.id, null, false],
      [SG, null, base.id, G, false], [SG2, null, base.id, G2, false],
      [EXPIRED, null, base.id, G, true], [LEGACY, null, base.id, null, false],
      [NULLPACK, A, null, null, false], [OTHERPACK, A, other.id, null, false], [SA2, A, base.id, null, false],
    ] as const) {
      await db.query(`INSERT INTO chat_sessions (id, user_id, pack_id, language_mode, explanation_level, guest_access_hash, guest_access_expires_at)
        VALUES ($1,$2,$3,'sheng','normal',$4, CASE WHEN $4::text IS NULL THEN NULL WHEN $5 THEN now() - interval '1 day' ELSE now() + interval '1 day' END)`,
        [id, owner, pack, hashGuestToken(secret), expired]);
      await db.query(`INSERT INTO chat_messages (session_id, role, content) VALUES ($1,'assistant',$2)`, [id, `private-${id}`]);
    }
    const message = async (id: string) => (await db.query<{ id: string }>(`SELECT id FROM chat_messages WHERE session_id=$1 ORDER BY created_at LIMIT 1`, [id])).rows[0]!.id;
    const MA = await message(SA), MB = await message(SB), MG = await message(SG);
    await app.register(cors, { origin: ["https://community.example"] });
    await app.register(authPlugin);
    registerPackRoutes(app);
    registerChatRoutes(app, gateway, service);
    registerPrivacyRoutes(app);
    registerTeachRoutes(app);
    registerPreferenceRoutes(app);
    await app.ready();
    const auth = (id: string) => ({ authorization: `Bearer ${app.jwt.sign({ id, role: id === A ? "admin" : "contributor" })}` });
    const guest = (token = G) => ({ "x-chat-token": token });
    const denied = (fn: () => Promise<unknown>) => assert.rejects(fn, (e: unknown) => e instanceof SessionAccessError && e.statusCode === 404);

    await ok("access browser transport: CORS accepts the guest capability header for an allowed origin", async () => {
      const res = await app.inject({ method: "OPTIONS", url: "/api/v1/chat/stream", headers: {
        origin: "https://community.example", "access-control-request-method": "POST", "access-control-request-headers": "content-type,x-chat-token",
      } });
      assert.equal(res.statusCode, 204);
      assert.equal(res.headers["access-control-allow-origin"], "https://community.example");
      assert.ok(String(res.headers["access-control-allow-headers"]).includes("x-chat-token"));
    });
    await ok("access: owners only, including administrators; guest tokens cannot open account sessions", async () => {
      assert.equal((await sessionAccess.requireSession(SA, { userId: A })).id, SA);
      await denied(() => sessionAccess.requireSession(SB, { userId: A }));
      await denied(() => sessionAccess.requireSession(SA, { userId: B, guestToken: G }));
      await denied(() => sessionAccess.requireSession(SA, { userId: null }));
    });
    await ok("access: separate guest tokens, expiry, legacy rows and malformed IDs fail closed", async () => {
      assert.equal((await sessionAccess.requireSession(SG, { userId: null, guestToken: G })).id, SG);
      for (const id of [SG2, EXPIRED, LEGACY, "missing", "22000000-0000-4000-8000-999999999999"])
        await denied(() => sessionAccess.requireSession(id, { userId: A, guestToken: G }));
      await denied(() => sessionAccess.requireSession(SG, { userId: null }));
      await denied(() => sessionAccess.requireSession(SG, { userId: null, guestToken: "bad" }));
    });
    await ok("access: NULL packs mean default, and explicit pack boundaries are enforced", async () => {
      assert.equal((await sessionAccess.requireSession(NULLPACK, { userId: A }, base.id)).id, NULLPACK);
      await denied(() => sessionAccess.requireSession(NULLPACK, { userId: A }, other.id));
      await denied(() => sessionAccess.requireSession(OTHERPACK, { userId: A }, base.id));
      assert.equal((await sessionAccess.requireSession(OTHERPACK, { userId: A }, other.id)).id, OTHERPACK);
    });
    await ok("access routes: known foreign IDs cannot read, append, stream, give feedback or link suggestions", async () => {
      modelCalls = 0;
      const attempts = [
        { method: "GET" as const, url: `/api/v1/chat/${SB}` },
        { method: "POST" as const, url: "/api/v1/chat", payload: { sessionId: SB, message: "x", userId: B } },
        { method: "POST" as const, url: `/api/v1/chat/${SB}/message`, payload: { message: "x" } },
        { method: "POST" as const, url: "/api/v1/chat/stream", payload: { sessionId: SB, message: "x" } },
        { method: "POST" as const, url: `/api/v1/messages/${MB}/feedback`, payload: { rating: "not_helpful" } },
        { method: "POST" as const, url: "/api/v1/teach", payload: { sessionId: SB, messageId: MB, suggestion: "not my conversation", languageMode: "sheng", consent: { answers: true } } },
      ];
      for (const attempt of attempts) {
        const res = await app.inject({ ...attempt, headers: auth(A) });
        assert.equal(res.statusCode, 404, `${attempt.url}: ${res.body}`);
        assert.ok(!res.body.includes(`private-${SB}`));
      }
      assert.equal(modelCalls, 0);
      assert.equal((await db.query(`SELECT * FROM message_feedback WHERE message_id=$1`, [MB])).rows.length, 0);
      assert.equal((await db.query(`SELECT * FROM teach_suggestions WHERE session_id=$1`, [SB])).rows.length, 0);
    });
    await ok("access routes: valid owner/guest requests work, ID-only and wrong tokens do not", async () => {
      for (const [id, headers] of [[SA, auth(A)], [SG, guest()]] as const) {
        const res = await app.inject({ method: "GET", url: `/api/v1/chat/${id}`, headers });
        assert.equal(res.statusCode, 200);
        assert.equal(res.headers["cache-control"], "no-store");
        assert.ok(res.body.includes(`private-${id}`));
        assert.equal((await app.inject({ method: "POST", url: "/api/v1/chat", headers, payload: { sessionId: id, message: "x" } })).statusCode, 200);
        assert.equal((await app.inject({ method: "POST", url: "/api/v1/chat/stream", headers, payload: { sessionId: id, message: "x" } })).statusCode, 200);
      }
      for (const headers of [{}, guest(G2), { authorization: "Bearer invalid", "x-afribit-user-id": A }])
        assert.equal((await app.inject({ method: "GET", url: `/api/v1/chat/${SG}`, headers })).statusCode, 404);
      assert.equal((await app.inject({ method: "POST", url: `/api/v1/messages/${MG}/feedback`, headers: guest(), payload: { rating: "helpful" } })).statusCode, 201);
    });
    await ok("access routes: implicit continuation retains its pack, explicit wrong packs cannot override it", async () => {
      assert.equal((await app.inject({ method: "POST", url: "/api/v1/chat", headers: auth(A), payload: { sessionId: OTHERPACK, message: "x" } })).statusCode, 200);
      for (const url of ["/api/v1/chat", "/api/v1/chat/stream"])
        assert.equal((await app.inject({ method: "POST", url, headers: { ...auth(A), "x-pack": base.id }, payload: { sessionId: OTHERPACK, message: "x" } })).statusCode, 404);
      assert.equal((await app.inject({ method: "GET", url: `/api/v1/chat/${NULLPACK}`, headers: { ...auth(A), "x-pack": other.id } })).statusCode, 404);
    });
    await ok("access service: direct calls recheck ownership before writes or model calls", async () => {
      await denied(() => sendMessage(gateway, input(SB, A)));
      const events: unknown[] = [];
      await denied(() => streamMessage(gateway, input(SB, A), (e) => events.push(e)));
      assert.deepEqual(events, []);
      await runWithPack(other, () => denied(() => sendMessage(gateway, input(SA, A))));
      await denied(() => sendMessage(gateway, input(LEGACY, A)));
    });
    await ok("access: no-retention reads still enforce ownership before returning empty history", async () => {
      const saved = env.chatRetention;
      (env as { chatRetention: typeof saved }).chatRetention = { mode: "none" };
      try {
        assert.equal((await app.inject({ method: "GET", url: `/api/v1/chat/${SB}`, headers: auth(A) })).statusCode, 404);
        assert.deepEqual((await app.inject({ method: "GET", url: `/api/v1/chat/${SA}`, headers: auth(A) })).json().messages, []);
      } finally { (env as { chatRetention: typeof saved }).chatRetention = saved; }
    });
    await ok("access: linked suggestions must reference the same authorized session and message", async () => {
      const payload = { sessionId: SA2, messageId: MA, suggestion: "A clear approved phrasing", languageMode: "sheng", consent: { answers: true } };
      assert.equal((await app.inject({ method: "POST", url: "/api/v1/teach", headers: auth(A), payload })).statusCode, 404);
      assert.equal((await app.inject({ method: "POST", url: "/api/v1/teach", headers: guest(), payload: { ...payload, sessionId: SG, messageId: MG } })).statusCode, 201);
    });
    await ok("access: real chat creation returns a guest token, stores only its hash, and deletion revokes it", async () => {
      const secret = "abandon ability able about above absent absorb abstract absurd abuse access accident";
      const result = await sendMessage(gateway, { sessionId: null, userId: null, message: secret });
      assert.match(result.sessionToken!, /^[0-9a-f]{64}$/);
      const row = (await db.query<{ guest_access_hash: string }>(`SELECT guest_access_hash FROM chat_sessions WHERE id=$1`, [result.sessionId])).rows[0]!;
      assert.equal(row.guest_access_hash, hashGuestToken(result.sessionToken));
      assert.notEqual(row.guest_access_hash, result.sessionToken);
      assert.equal((await sessionAccess.requireSession(result.sessionId, { userId: null, guestToken: result.sessionToken })).id, result.sessionId);
      const cap = { "x-chat-token": result.sessionToken! };
      assert.equal((await app.inject({ method: "DELETE", url: `/api/v1/chat/${result.sessionId}` })).statusCode, 204);
      await sessionAccess.requireSession(result.sessionId, { userId: null, guestToken: result.sessionToken });
      await app.inject({ method: "DELETE", url: `/api/v1/chat/${result.sessionId}`, headers: cap });
      await denied(() => sessionAccess.requireSession(result.sessionId, { userId: null, guestToken: result.sessionToken }));
      const account = await sendMessage(gateway, { sessionId: null, userId: A, message: secret });
      assert.equal(account.sessionToken, undefined);
      await denied(() => sessionAccess.requireSession(account.sessionId, { userId: null, guestToken: result.sessionToken }));
    });
    await ok("access deletion: mixed bulk only removes owned/capability-authorized rows and shared text", async () => {
      const suggestion = async (id: string) => (await teachStore.create({ packId: base.id, sessionId: id, messageId: null, questionText: "shared question", answerText: "shared answer", suggestion: "some shared wording", languageMode: "sheng", reason: null, createdBy: null, consent: { answers: true, testing: false, training: false } })).id;
      const ownSuggestion = await suggestion(SA2), foreignSuggestion = await suggestion(SB);
      const res = await app.inject({ method: "POST", url: "/api/v1/chat/delete", headers: auth(A), payload: { sessionIds: [SA2, SB, SG2, EXPIRED, LEGACY, OTHERPACK], sessionTokens: { [SG2]: G2, [EXPIRED]: G } } });
      assert.equal(res.statusCode, 204);
      const present = (await db.query<{ id: string }>(`SELECT id FROM chat_sessions WHERE id = ANY($1::uuid[])`, [[SA2, SB, SG2, EXPIRED, LEGACY, OTHERPACK]])).rows.map((r) => r.id);
      assert.deepEqual(present.sort(), [SB, EXPIRED, LEGACY, OTHERPACK].sort());
      for (const [id, expected] of [[ownSuggestion, null], [foreignSuggestion, "shared question"]] as const)
        assert.equal((await db.query<{ question_text: string | null }>(`SELECT question_text FROM teach_suggestions WHERE id=$1`, [id])).rows[0]!.question_text, expected);
    });
    await ok("access preferences: external IDs cannot read/write another account or create accounts", async () => {
      const count = (await db.query(`SELECT id FROM users`)).rows.length;
      for (const method of ["GET", "PATCH"] as const)
        assert.equal((await app.inject({ method, url: "/api/v1/me/preferences", headers: { "x-afribit-user-id": B }, ...(method === "PATCH" ? { payload: { languageMode: "sheng" } } : {}) })).statusCode, 401);
      assert.equal((await app.inject({ method: "PATCH", url: "/api/v1/me/preferences", headers: { ...auth(A), "x-afribit-user-id": B }, payload: { learningConsent: true, userId: B } })).statusCode, 200);
      assert.equal((await app.inject({ method: "GET", url: "/api/v1/me/preferences", headers: auth(A) })).json().learning_consent, true);
      assert.equal((await app.inject({ method: "GET", url: "/api/v1/me/preferences", headers: auth(B) })).json().learning_consent, false);
      assert.equal((await db.query(`SELECT id FROM users`)).rows.length, count);
    });
  } finally { await app.close(); setRegistry(previous); }
}
