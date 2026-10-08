import assert from "node:assert/strict";
import Fastify from "fastify";
import { env } from "../config/env.js";
import { authPlugin } from "./plugin.js";
import { registerAuthRoutes, REGISTER_REFUSED } from "../routes/auth.js";
import { registerInvitationRoutes } from "../routes/invitations.js";
import { generateCode, hashCode, normaliseCode, parseInviteInput, parseRegistration, type RegistrationMode } from "./invitations.js";
import type { InvitationStore, InvitationSummary } from "./invitationStore.js";

/**
 * pnpm --filter @afribit/api test:invitations -- accounts by invitation only (F-012) without a database: the
 * setting, the codes, input checks, sign-up in each mode, and who may manage invitations. The SQL (one use
 * per code, in a transaction) runs against real PostgreSQL in test:db.
 */

let passed = 0;
async function ok(name: string, fn: () => void | Promise<void>): Promise<void> {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
}

// ── rules ─────────────────────────────────────────────────────────────────────────────────────────
await ok("REGISTRATION: invite by default; closed and open accepted; anything else stops the server", () => {
  assert.equal(parseRegistration(undefined), "invite");
  assert.equal(parseRegistration(""), "invite");
  assert.equal(parseRegistration(" Closed "), "closed");
  assert.equal(parseRegistration("open"), "open");
  assert.throws(() => parseRegistration("anyone"));
});
await ok("codes: readable (no 0/O/1/I/L), different every time, typed in any case or spacing", () => {
  const codes = new Set(Array.from({ length: 200 }, generateCode));
  assert.equal(codes.size, 200);
  for (const c of codes) assert.match(c, /^AFB-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  const c = [...codes][0]!;
  assert.equal(normaliseCode(` ${c.toLowerCase().replace(/-/g, " ")} `), normaliseCode(c));
  assert.equal(hashCode(c.toLowerCase()), hashCode(c));
  assert.match(hashCode(c), /^[0-9a-f]{64}$/);
  assert.ok(!hashCode(c).includes(normaliseCode(c)));
});
await ok("invitation input: contributor or reviewer only (never admin); 1–90 days; note trimmed", () => {
  assert.equal(parseInviteInput({ role: "admin" }).ok, false);
  assert.equal(parseInviteInput({}).ok, false);
  assert.equal(parseInviteInput({ role: "reviewer", days: 0 }).ok, false);
  assert.equal(parseInviteInput({ role: "reviewer", days: 91 }).ok, false);
  assert.equal(parseInviteInput({ role: "reviewer", days: 2.5 }).ok, false);
  assert.deepEqual(parseInviteInput({ role: "reviewer", note: "  Amina  " }), { ok: true, role: "reviewer", note: "Amina", days: 7 });
  assert.deepEqual(parseInviteInput({ role: "contributor", days: 30, note: "   " }), { ok: true, role: "contributor", note: null, days: 30 });
});

// ── routes, with a fake store ─────────────────────────────────────────────────────────────────────
// Like the real one: keeps only hashes, and a code works once.
const invites = new Map<string, { id: string; role: "contributor" | "reviewer"; used: boolean; revoked: boolean }>();
const emails = new Set(["taken@example.org"]);
const roles: Record<string, string> = { a1: "admin", r1: "reviewer", c1: "contributor", demoted: "contributor" };
const audit: string[] = [];
let raceNext = false;
let openCreated = 0;
let n = 0;
const store: InvitationStore = {
  async currentRole(id) {
    return roles[id] ?? null;
  },
  async emailTaken(email) {
    return emails.has(email);
  },
  async registerOpen(input) {
    openCreated++;
    emails.add(input.email);
    return { id: `u${++n}`, role: "contributor" };
  },
  async create(input) {
    const code = generateCode();
    const id = `11111111-1111-4111-8111-${String(++n).padStart(12, "0")}`;
    invites.set(hashCode(code), { id, role: input.role, used: false, revoked: false });
    audit.push(`create ${input.createdBy}`);
    return { id, code, expiresAt: new Date(Date.now() + input.days * 86_400_000).toISOString() };
  },
  async list() {
    return [...invites.values()].map(
      (i): InvitationSummary => ({ id: i.id, role: i.role, note: null, createdAt: "", expiresAt: "", state: i.used ? "used" : i.revoked ? "revoked" : "open", usedBy: null, usedAt: null }),
    );
  },
  async revoke(id, actor) {
    const i = [...invites.values()].find((x) => x.id === id);
    if (!i || i.used || i.revoked) return false;
    i.revoked = true;
    audit.push(`revoke ${actor}`);
    return true;
  },
  async register(input) {
    if (raceNext) {
      raceNext = false;
      throw Object.assign(new Error("duplicate key"), { code: "23505" });
    }
    const i = invites.get(hashCode(input.code));
    if (!i || i.used || i.revoked) return null;
    i.used = true;
    emails.add(input.email);
    audit.push(`use ${i.role}`);
    return { id: `u${++n}`, role: i.role };
  },
};

const app = Fastify();
await app.register(authPlugin);
registerAuthRoutes(app, store);
registerInvitationRoutes(app, store);
await app.ready();
const as = (id: string, role: "contributor" | "reviewer" | "admin") => ({ authorization: `Bearer ${app.jwt.sign({ id, role })}` });
const savedMode = env.registration;
const setMode = (m: RegistrationMode) => ((env as { registration: RegistrationMode }).registration = m);
let k = 0;
const signUp = (o: Record<string, unknown> = {}) =>
  app.inject({ method: "POST", url: "/api/v1/auth/register", payload: { email: `new${++k}@example.org`, password: "a-long-password-1", displayName: "New", ...o } });
const invite = (payload: unknown, h = as("a1", "admin")) => app.inject({ method: "POST", url: "/api/v1/admin/invitations", headers: h, payload: payload as never });

try {
  await ok("invitations: administrators only, by token AND by the database's current role", async () => {
    const list = (h?: Record<string, string>) => app.inject({ method: "GET", url: "/api/v1/admin/invitations", headers: h ?? {} });
    assert.equal((await list()).statusCode, 401);
    assert.equal((await list(as("c1", "contributor"))).statusCode, 403);
    assert.equal((await list(as("r1", "reviewer"))).statusCode, 403);
    assert.equal((await list(as("demoted", "admin"))).statusCode, 403); // the token says admin; the database no longer does
    assert.equal((await list(as("a1", "admin"))).statusCode, 200);
    assert.equal((await invite({ role: "reviewer" }, as("r1", "reviewer"))).statusCode, 403);
  });
  await ok("creating: the code is in the response once; never an admin invitation; the list holds no codes", async () => {
    assert.equal((await invite({ role: "admin" })).statusCode, 400);
    const res = await invite({ role: "reviewer", note: "Amina", days: 3 });
    assert.equal(res.statusCode, 201);
    assert.match(res.json().code, /^AFB-/);
    assert.equal(res.json().role, "reviewer");
    const listed = await app.inject({ method: "GET", url: "/api/v1/admin/invitations", headers: as("a1", "admin") });
    assert.ok(!listed.body.includes(res.json().code) && !listed.body.includes(normaliseCode(res.json().code)));
    assert.ok(!/code/i.test(Object.keys(listed.json().invitations[0]).join(",")));
  });

  setMode("invite");
  await ok("invite mode: no code, a wrong code, or a taken email all get the same answer", async () => {
    const answers = [await signUp(), await signUp({ invitationCode: "AFB-AAAA-BBBB" }), await signUp({ invitationCode: "   " })];
    const { code } = (await invite({ role: "contributor" })).json();
    answers.push(await signUp({ email: "taken@example.org", invitationCode: code }));
    for (const r of answers) {
      assert.equal(r.statusCode, 409);
      assert.deepEqual(r.json(), { error: REGISTER_REFUSED });
    }
    // The taken email did not use up the code.
    assert.equal((await signUp({ invitationCode: code })).statusCode, 201);
  });
  await ok("invite mode: a reviewer invitation makes a reviewer, once; a second use is refused", async () => {
    const { code } = (await invite({ role: "reviewer" })).json();
    const first = await signUp({ invitationCode: code.toLowerCase().replace(/-/g, " ") });
    assert.equal(first.statusCode, 201);
    assert.equal(first.json().role, "reviewer");
    assert.equal(app.jwt.decode<{ role: string }>(first.json().token)?.role, "reviewer");
    const again = await signUp({ invitationCode: code });
    assert.equal(again.statusCode, 409);
    assert.deepEqual(again.json(), { error: REGISTER_REFUSED });
  });
  await ok("invite mode: a revoked code is refused; only an unused invitation can be revoked", async () => {
    const created = (await invite({ role: "contributor" })).json();
    const revoke = (id: string) => app.inject({ method: "POST", url: `/api/v1/admin/invitations/${id}/revoke`, headers: as("a1", "admin") });
    assert.equal((await revoke("not-an-id")).statusCode, 404);
    assert.equal((await revoke(created.id)).statusCode, 200);
    assert.equal((await revoke(created.id)).statusCode, 409);
    assert.equal((await signUp({ invitationCode: created.code })).statusCode, 409);
  });
  await ok("invite mode: the same email signing up twice at once gets the generic answer, not an error", async () => {
    const { code } = (await invite({ role: "contributor" })).json();
    raceNext = true;
    const r = await signUp({ invitationCode: code });
    assert.equal(r.statusCode, 409);
    assert.deepEqual(r.json(), { error: REGISTER_REFUSED });
  });
  await ok("invite mode: email and password are still checked first", async () => {
    assert.equal((await signUp({ email: "not-an-email" })).statusCode, 400);
    assert.equal((await signUp({ password: "short" })).statusCode, 400);
  });

  setMode("closed");
  await ok("closed: nobody can sign up, even with a good code", async () => {
    const { code } = (await invite({ role: "contributor" })).json();
    const r = await signUp({ invitationCode: code });
    assert.equal(r.statusCode, 403);
  });

  setMode("open");
  await ok("open (development only): a contributor without a code, as before", async () => {
    const before = openCreated;
    const r = await signUp();
    assert.equal(r.statusCode, 201);
    assert.equal(r.json().role, "contributor");
    assert.equal(openCreated, before + 1);
    assert.equal((await signUp({ email: "taken@example.org" })).statusCode, 409);
  });

  await ok("creating, using and revoking are each written to the audit log", () => {
    assert.ok(audit.some((a) => a === "create a1"));
    assert.ok(audit.some((a) => a.startsWith("use ")));
    assert.ok(audit.some((a) => a === "revoke a1"));
  });
} finally {
  setMode(savedMode);
  await app.close();
}
console.log(`invitations: ${passed} checks passed`);
