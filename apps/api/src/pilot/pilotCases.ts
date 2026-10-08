import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import Fastify from "fastify";
import { authPlugin } from "../auth/plugin.js";
import { registerPackRoutes } from "../routes/pack.js";
import { registerPilotRoutes } from "../routes/pilot.js";
import { checkResolve, checkRoleChange, dailyCsv, MIN_CELL, parseWhole, suppressSmall, TtlCache, type Resolution, type Role } from "./rules.js";
import { NO_SOURCE, parseSource, parseSourceFilter } from "./source.js";
import { PilotError, type PilotStore, type QueueResult, type TeamUser } from "./store.js";
import type { DailyRow, PilotStats } from "./stats.js";

/**
 * pnpm --filter @afribit/api test:pilot -- the pilot console's rules and routes (no database needed):
 * channel labels, the small-count rule, who may call what, resolving a report, the last-admin safeguard,
 * and the QR encoder. The queries themselves are checked against a real database in the pilot e2e run
 * described in docs/guides/pilot-console-guide.md.
 */

let passed = 0;
async function ok(name: string, fn: () => void | Promise<void>): Promise<void> {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "..", "..", "public", "pilot");

// ── channel labels ────────────────────────────────────────────────────────────────────────────────
await ok("channel labels: short lowercase slugs are accepted", () => {
  for (const v of ["kibera-hub", "a", "0", "class-2026-10", "x".repeat(32)]) assert.equal(parseSource(v), v);
});
await ok("channel labels: anything else is ignored", () => {
  for (const v of ["", "-hub", "Kibera", "kibera hub", "kibera_hub", "x".repeat(33), "a/b", "<script>", "é", "a\nb", null, undefined, 7, {}]) assert.equal(parseSource(v), null, String(v));
});
await ok("source filter: a slug or _none, nothing else", () => {
  assert.equal(parseSourceFilter("kibera-hub"), "kibera-hub");
  assert.equal(parseSourceFilter(NO_SOURCE), NO_SOURCE);
  assert.equal(parseSourceFilter("none"), "none"); // an ordinary slug
  assert.equal(parseSourceFilter("_other"), null);
  assert.equal(parseSourceFilter("A b"), null);
});

// ── small-count rule ──────────────────────────────────────────────────────────────────────────────
await ok("small counts: anything under 5 is blank, 5 and over is shown", () => {
  assert.equal(MIN_CELL, 5);
  for (const v of [0, 1, 4]) assert.equal(suppressSmall(v), "");
  for (const [v, s] of [[5, "5"], [6, "6"], [120, "120"]] as const) assert.equal(suppressSmall(v), s);
  assert.equal(suppressSmall(Number.NaN), "");
});
const row = (o: Partial<DailyRow>): DailyRow => ({ day: "2026-10-05", source: "kibera-hub", sessions: 0, questions: 0, helpful: 0, notHelpful: 0, fallbacks: 0, safetyEvents: 0, ...o });
await ok("export: header, aggregate columns only, small cells blank", () => {
  const csv = dailyCsv([row({ sessions: 12, questions: 40, helpful: 4, notHelpful: 1, fallbacks: 0, safetyEvents: 5 })]);
  assert.deepEqual(csv.trim().split("\n"), ["date,source,sessions,questions,helpful,not_helpful,fallbacks,safety_events", "2026-10-05,kibera-hub,12,40,,,,5"]);
});
await ok("export: a row with nothing left to show is dropped entirely", () => {
  const csv = dailyCsv([row({ sessions: 3, questions: 4, helpful: 1 }), row({ day: "2026-10-06", sessions: 5 })]);
  assert.deepEqual(csv.trim().split("\n"), ["date,source,sessions,questions,helpful,not_helpful,fallbacks,safety_events", "2026-10-06,kibera-hub,5,,,,,"]);
});
await ok("export: never emits anything but a date, a slug and counts", () => {
  const csv = dailyCsv([row({ source: 'evil,"x"\n=1+1', sessions: 50 })]);
  assert.equal(csv.trim().split("\n").length, 2);
  assert.ok(csv.includes("2026-10-05,other,50"));
});

// ── cache, parameters, resolutions ────────────────────────────────────────────────────────────────
await ok("cache: serves within 30 s, expires after, can be cleared", () => {
  let t = 1000;
  const cache = new TtlCache<number>(30_000, () => t);
  cache.set("k", 1);
  t += 29_999;
  assert.equal(cache.get("k"), 1);
  t += 1;
  assert.equal(cache.get("k"), undefined);
  cache.set("k", 2);
  cache.clear();
  assert.equal(cache.get("k"), undefined);
});
await ok("parameters: whole numbers in range, default when absent, null when invalid", () => {
  assert.equal(parseWhole(undefined, 7), 7);
  assert.equal(parseWhole("30", 7), 30);
  for (const bad of ["0", "-1", "1.5", "abc", "366", "99999", "1e2", " 5"]) assert.equal(parseWhole(bad, 7), null, bad);
  assert.equal(parseWhole("100", 25, 100), 100);
  assert.equal(parseWhole("101", 25, 100), null);
});
await ok("resolve: every listed resolution is accepted, others are not", () => {
  for (const r of ["answer_ok", "card_fixed", "new_card_needed", "wrong_report", "language_fix", "other"]) assert.deepEqual(checkResolve({ resolution: r }), { ok: true, resolution: r as Resolution, note: null });
  for (const bad of [undefined, null, "", "fixed", 3, "ANSWER_OK"]) assert.equal(checkResolve({ resolution: bad }).ok, false, String(bad));
  assert.equal(checkResolve(undefined).ok, false);
});
await ok("resolve: the note is trimmed, optional, text, and at most 1000 characters", () => {
  assert.deepEqual(checkResolve({ resolution: "other", note: "  fixed the card  " }), { ok: true, resolution: "other", note: "fixed the card" });
  assert.deepEqual(checkResolve({ resolution: "other", note: "   " }), { ok: true, resolution: "other", note: null });
  assert.equal(checkResolve({ resolution: "other", note: 5 }).ok, false);
  assert.equal(checkResolve({ resolution: "other", note: "x".repeat(1001) }).ok, false);
  assert.equal(checkResolve({ resolution: "other", note: "x".repeat(1000) }).ok, true);
});

// ── team roles ────────────────────────────────────────────────────────────────────────────────────
await ok("roles: the last admin cannot be demoted, by themselves or by anyone", () => {
  const me = { id: "a", role: "admin" as Role };
  const self = checkRoleChange({ actorId: "a", target: me, newRole: "reviewer", adminCount: 1 });
  assert.ok(!self.ok && self.status === 409 && /last admin/.test(self.error));
  const other = checkRoleChange({ actorId: "b", target: me, newRole: "contributor", adminCount: 1 });
  assert.ok(!other.ok && other.status === 409);
});
await ok("roles: with another admin, demoting is fine; promoting is always fine", () => {
  assert.deepEqual(checkRoleChange({ actorId: "a", target: { id: "a", role: "admin" }, newRole: "reviewer", adminCount: 2 }), { ok: true, unchanged: false });
  assert.deepEqual(checkRoleChange({ actorId: "a", target: { id: "c", role: "contributor" }, newRole: "reviewer", adminCount: 1 }), { ok: true, unchanged: false });
  assert.deepEqual(checkRoleChange({ actorId: "a", target: { id: "c", role: "reviewer" }, newRole: "admin", adminCount: 1 }), { ok: true, unchanged: false });
});
await ok("roles: unknown roles are refused; the same role is a no-op (even for the last admin)", () => {
  for (const bad of ["owner", "", "ADMIN", null, undefined, 1]) {
    const r = checkRoleChange({ actorId: "a", target: { id: "c", role: "contributor" }, newRole: bad, adminCount: 3 });
    assert.ok(!r.ok && r.status === 400, String(bad));
  }
  assert.deepEqual(checkRoleChange({ actorId: "a", target: { id: "a", role: "admin" }, newRole: "admin", adminCount: 1 }), { ok: true, unchanged: true });
});

// ── routes: who may call what ─────────────────────────────────────────────────────────────────────
const ID = { contributor: "00000000-0000-4000-8000-000000000001", reviewer: "00000000-0000-4000-8000-000000000002", admin: "00000000-0000-4000-8000-000000000003", demoted: "00000000-0000-4000-8000-000000000004" };
const FEEDBACK = "11111111-1111-4111-8111-111111111111";
const calls: Record<string, unknown[]> = {};
const log = (name: string, arg: unknown) => (calls[name] ??= []).push(arg);
const dbRole: Record<string, Role> = { [ID.contributor]: "contributor", [ID.reviewer]: "reviewer", [ID.admin]: "admin", [ID.demoted]: "contributor" };
const user: TeamUser = { id: ID.reviewer, email: "r@example.org", displayName: "R", role: "reviewer", createdAt: "2026-10-01T00:00:00.000Z" };
const emptyStats = { generatedAt: "now", scope: {}, totals: { sessions: 0 } } as unknown as PilotStats;
const emptyQueue: QueueResult = { state: "open", counts: { open: 0, resolved: 0 }, items: [], flagged: [] };

const store: PilotStore = {
  async currentRole(id) {
    return dbRole[id] ?? null;
  },
  async stats(opts) {
    log("stats", opts);
    return emptyStats;
  },
  async daily(opts) {
    log("daily", opts);
    return [row({ sessions: 9, questions: 2 }), row({ source: "tiny", sessions: 1 })];
  },
  async queue(opts) {
    log("queue", opts);
    return emptyQueue;
  },
  async resolve(input) {
    log("resolve", input);
    if (input.feedbackId === "22222222-2222-4222-8222-222222222222") throw new PilotError(409, "This report is already resolved");
    return { feedbackId: input.feedbackId } as never;
  },
  async listUsers(opts) {
    log("listUsers", opts);
    return { users: [user], total: 1 };
  },
  async setRole(input) {
    log("setRole", input);
    if (input.role === "contributor") throw new PilotError(409, "This is the last admin; someone else must be made an admin first.");
    return { user, unchanged: false };
  },
};

let clock = 0;
const app = Fastify();
await app.register(authPlugin);
registerPackRoutes(app);
registerPilotRoutes(app, store, () => clock);
await app.ready();

const token = (role: Role, id: string) => app.jwt.sign({ id, role });
const as = {
  anonymous: undefined,
  contributor: token("contributor", ID.contributor),
  reviewer: token("reviewer", ID.reviewer),
  admin: token("admin", ID.admin),
  // A token that still says admin, for someone the database now says is only a contributor.
  demotedAdmin: token("admin", ID.demoted),
};
type Who = keyof typeof as;
async function hit(method: "GET" | "POST" | "PUT", url: string, who: Who, payload?: unknown) {
  const res = await app.inject({ method, url, headers: as[who] ? { authorization: `Bearer ${as[who]}` } : {}, payload: payload as never });
  return res.statusCode;
}

const ROUTES: { name: string; method: "GET" | "POST" | "PUT"; url: string; payload?: unknown; allowed: Who[] }[] = [
  { name: "stats", method: "GET", url: "/api/v1/pilot/stats", allowed: ["reviewer", "admin"] },
  { name: "queue", method: "GET", url: "/api/v1/pilot/queue", allowed: ["reviewer", "admin"] },
  { name: "resolve", method: "POST", url: `/api/v1/pilot/queue/${FEEDBACK}/resolve`, payload: { resolution: "answer_ok" }, allowed: ["reviewer", "admin"] },
  { name: "export", method: "GET", url: "/api/v1/pilot/export.csv", allowed: ["admin"] },
  { name: "team list", method: "GET", url: "/api/v1/admin/users", allowed: ["admin"] },
  { name: "team role", method: "PUT", url: `/api/v1/admin/users/${ID.reviewer}/role`, payload: { role: "reviewer" }, allowed: ["admin"] },
];
for (const r of ROUTES) {
  await ok(`${r.name}: ${r.allowed.join(" and ")} only (${r.method} ${r.url.split("?")[0]})`, async () => {
    for (const who of Object.keys(as) as Who[]) {
      const status = await hit(r.method, r.url, who, r.payload);
      if (r.allowed.includes(who)) assert.equal(status, 200, `${who} should be allowed, got ${status}`);
      else if (who === "anonymous") assert.equal(status, 401, `${who} should be 401, got ${status}`);
      else assert.equal(status, 403, `${who} should be 403, got ${status}`);
    }
  });
}
await ok("roles come from the database, not only the token: a demoted admin is locked out at once", async () => {
  assert.equal(await hit("GET", "/api/v1/pilot/stats", "demotedAdmin"), 403);
  assert.equal(await hit("GET", "/api/v1/admin/users", "demotedAdmin"), 403);
});
await ok("a reviewer cannot reach the export or the team routes", async () => {
  assert.equal(await hit("GET", "/api/v1/pilot/export.csv", "reviewer"), 403);
  assert.equal(await hit("GET", "/api/v1/admin/users", "reviewer"), 403);
  assert.equal(await hit("PUT", `/api/v1/admin/users/${ID.reviewer}/role`, "reviewer", { role: "admin" }), 403);
  assert.equal((calls.setRole ?? []).length, 1, "only the admin sweep above reached the store");
});

const get = (url: string, who: Who = "reviewer") => app.inject({ method: "GET", url, headers: { authorization: `Bearer ${as[who]}` } });
await ok("stats: validates days and source, passes the request's pack, and caches for 30 s", async () => {
  for (const bad of ["days=0", "days=366", "days=x", "source=Bad%20One", "source=_other"]) assert.equal((await get(`/api/v1/pilot/stats?${bad}`)).statusCode, 400, bad);
  const before = (calls.stats ?? []).length;
  const first = await get("/api/v1/pilot/stats?days=14&source=kibera-hub");
  assert.equal(first.statusCode, 200);
  assert.equal(first.headers["cache-control"], "no-store");
  assert.equal((calls.stats ?? []).length, before + 1);
  const opts = calls.stats![before] as { days: number; source: string | null; packId: string; defaultPackId: string };
  assert.equal(opts.days, 14);
  assert.equal(opts.source, "kibera-hub");
  assert.ok(opts.packId && opts.defaultPackId);
  await get("/api/v1/pilot/stats?days=14&source=kibera-hub");
  assert.equal((calls.stats ?? []).length, before + 1, "second call within 30 s is served from the cache");
  await get("/api/v1/pilot/stats?days=14");
  assert.equal((calls.stats ?? []).length, before + 2, "a different filter is a different cache entry");
  clock += 30_000;
  await get("/api/v1/pilot/stats?days=14&source=kibera-hub");
  assert.equal((calls.stats ?? []).length, before + 3, "after 30 s it is read again");
  assert.equal((calls.stats![before + 2] as { source: string | null }).source, "kibera-hub");
});
await ok("stats: an unknown pack is refused like everywhere else", async () => {
  assert.equal((await get("/api/v1/pilot/stats?pack=no-such-pack")).statusCode, 404);
});
await ok("export: CSV attachment, small cells blank, rows with nothing left dropped", async () => {
  const res = await get("/api/v1/pilot/export.csv?days=30", "admin");
  assert.equal(res.statusCode, 200);
  assert.match(String(res.headers["content-type"]), /^text\/csv/);
  assert.match(String(res.headers["content-disposition"]), /^attachment; filename="pilot-daily-[\w.-]+-30d\.csv"$/);
  assert.deepEqual(res.body.trim().split("\n"), ["date,source,sessions,questions,helpful,not_helpful,fallbacks,safety_events", "2026-10-05,kibera-hub,9,,,,,"]);
  assert.equal((await get("/api/v1/pilot/export.csv?days=0", "admin")).statusCode, 400);
});
await ok("queue: state and limit are validated", async () => {
  assert.equal((await get("/api/v1/pilot/queue?state=all")).statusCode, 400);
  assert.equal((await get("/api/v1/pilot/queue?limit=0")).statusCode, 400);
  assert.equal((await get("/api/v1/pilot/queue?limit=101")).statusCode, 400);
  assert.equal((await get("/api/v1/pilot/queue?state=resolved&limit=10")).statusCode, 200);
  const last = calls.queue!.at(-1) as { state: string; limit: number };
  assert.deepEqual([last.state, last.limit], ["resolved", 10]);
});
await ok("resolve: validates the id and the body before touching the store, and records who resolved", async () => {
  const post = (url: string, payload: unknown, who: Who = "reviewer") => app.inject({ method: "POST", url, headers: { authorization: `Bearer ${as[who]}` }, payload: payload as never });
  const before = (calls.resolve ?? []).length;
  assert.equal((await post("/api/v1/pilot/queue/not-a-uuid/resolve", { resolution: "answer_ok" })).statusCode, 404);
  assert.equal((await post(`/api/v1/pilot/queue/${FEEDBACK}/resolve`, { resolution: "done" })).statusCode, 400);
  assert.equal((await post(`/api/v1/pilot/queue/${FEEDBACK}/resolve`, {})).statusCode, 400);
  assert.equal((await post(`/api/v1/pilot/queue/${FEEDBACK}/resolve`, { resolution: "other", note: "x".repeat(1001) })).statusCode, 400);
  assert.equal((calls.resolve ?? []).length, before, "nothing invalid reached the store");
  const good = await post(`/api/v1/pilot/queue/${FEEDBACK}/resolve`, { resolution: "card_fixed", note: " updated the card " });
  assert.equal(good.statusCode, 200);
  const sent = calls.resolve!.at(-1) as { actorId: string; resolution: string; note: string };
  assert.deepEqual([sent.actorId, sent.resolution, sent.note], [ID.reviewer, "card_fixed", "updated the card"]);
  const again = await post("/api/v1/pilot/queue/22222222-2222-4222-8222-222222222222/resolve", { resolution: "answer_ok" });
  assert.equal(again.statusCode, 409);
  assert.match(again.json().error, /already resolved/);
});
await ok("resolve: clears the stats cache so the open/resolved numbers update", async () => {
  const before = (calls.stats ?? []).length;
  await get("/api/v1/pilot/stats?days=3");
  await get("/api/v1/pilot/stats?days=3");
  assert.equal((calls.stats ?? []).length, before + 1);
  await app.inject({ method: "POST", url: `/api/v1/pilot/queue/${FEEDBACK}/resolve`, headers: { authorization: `Bearer ${as.reviewer}` }, payload: { resolution: "answer_ok" } });
  await get("/api/v1/pilot/stats?days=3");
  assert.equal((calls.stats ?? []).length, before + 2);
});
await ok("team: list parameters are validated; role changes pass the actor and surface the safeguard", async () => {
  assert.equal((await get("/api/v1/admin/users?limit=0", "admin")).statusCode, 400);
  assert.equal((await get("/api/v1/admin/users?offset=-1", "admin")).statusCode, 400);
  assert.equal((await get("/api/v1/admin/users?q=amina&limit=10&offset=20", "admin")).statusCode, 200);
  assert.deepEqual(calls.listUsers!.at(-1), { q: "amina", limit: 10, offset: 20 });
  const put = (id: string, payload: unknown) => app.inject({ method: "PUT", url: `/api/v1/admin/users/${id}/role`, headers: { authorization: `Bearer ${as.admin}` }, payload: payload as never });
  assert.equal((await put("nope", { role: "admin" })).statusCode, 404);
  const ok1 = await put(ID.reviewer, { role: "admin" });
  assert.equal(ok1.statusCode, 200);
  assert.deepEqual(calls.setRole!.at(-1), { actorId: ID.admin, targetId: ID.reviewer, role: "admin" });
  const last = await put(ID.admin, { role: "contributor" });
  assert.equal(last.statusCode, 409);
  assert.match(last.json().error, /last admin/);
});

// ── the page ──────────────────────────────────────────────────────────────────────────────────────
await ok("the page and its scripts are served with a strict policy, with no inline script or style", async () => {
  for (const file of ["/pilot", "/pilot/app.js", "/pilot/qr.js", "/pilot/style.css"]) {
    const res = await app.inject({ method: "GET", url: file });
    assert.equal(res.statusCode, 200, file);
    assert.match(String(res.headers["content-security-policy"]), /script-src 'self'; style-src 'self'/);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
  }
  const html = readFileSync(path.join(publicDir, "index.html"), "utf8");
  assert.ok(!/<script(?![^>]*\bsrc=)/i.test(html), "no inline <script>");
  assert.ok(!/\sstyle=|\son[a-z]+=/i.test(html), "no style= or on*= attributes");
  const origins = readFileSync(path.join(publicDir, "app.js"), "utf8").match(/https?:\/\/[^\/"' )]+/g) ?? [];
  assert.deepEqual([...new Set(origins)].sort(), ["http://www.w3.org", "https://ai.afribit.africa"], "app.js names only the SVG namespace and the default app address");
});
await ok("the page code puts server text on screen with textContent only", () => {
  for (const f of ["app.js", "qr.js"]) {
    const js = readFileSync(path.join(publicDir, f), "utf8");
    assert.ok(!/\.innerHTML|\.outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function\(/.test(js), `${f} must not build HTML from strings`);
  }
});
await app.close();

// ── QR encoder ────────────────────────────────────────────────────────────────────────────────────
interface Qr { version: number; size: number; mask: number; modules: boolean[][] }
const qrApi: { encode(text: string): Qr; toSvgPath(qr: Qr, border?: number): { viewBox: string; d: string } } = (() => {
  const box = { module: { exports: {} as unknown } };
  vm.runInNewContext(readFileSync(path.join(publicDir, "qr.js"), "utf8"), box);
  return box.module.exports as never;
})();
const ascii = (q: Qr) => q.modules.map((r) => r.map((c) => (c ? "#" : ".")).join("")).join("\n");

await ok("qr: a fixed string gives the known matrix (version 1; read back by OpenCV's QR decoder)", () => {
  const q = qrApi.encode("hello");
  assert.deepEqual([q.version, q.size, q.mask], [1, 21, 0]);
  assert.equal(
    ascii(q),
    [
      "#######..##...#######", "#.....#.##....#.....#", "#.###.#..#.##.#.###.#", "#.###.#...##..#.###.#", "#.###.#.##..#.#.###.#",
      "#.....#.....#.#.....#", "#######.#.#.#.#######", "..........###........", "#.#.#.#..#.#....#..#.", "..#.##....#...#....##",
      ".#.#..#.###.#...#####", "##..#.........#....#.", ".##.#.##..#.#.#.#....", "........####.#.#..###", "#######...##.###..###",
      "#.....#...####.##....", "#.###.#.#.##.###...##", "#.###.#..#....##..##.", "#.###.#.###.#...#.#.#", "#.....#..#....#.#..#.", "#######.###.#.##...##",
    ].join("\n"),
  );
});
await ok("qr: the learner link gives the known matrix (version 4; read back by OpenCV's QR decoder)", () => {
  const q = qrApi.encode("https://ai.afribit.africa/app?ref=kibera-hub");
  assert.deepEqual([q.version, q.size, q.mask], [4, 33, 2]);
  const digest = createHash("sha256").update(q.modules.map((r) => r.map((c) => (c ? 1 : 0)).join("")).join("\n")).digest("hex");
  assert.equal(digest, "e90efb20d9930e60b5942985221d64accecd83fc64d08436f7829cd558ac72ee");
});
await ok("qr: version grows with length, size is 4v+17, finder patterns and timing are in place", () => {
  let last = 0;
  for (const len of [1, 14, 15, 26, 42, 62, 84, 106, 122, 154, 180, 213]) {
    const q = qrApi.encode("a".repeat(len));
    assert.ok(q.version >= last, "versions never shrink as text grows");
    last = q.version;
    assert.equal(q.size, 4 * q.version + 17);
    for (const [ox, oy] of [[0, 0], [q.size - 7, 0], [0, q.size - 7]] as const) {
      for (let i = 0; i < 7; i++) {
        assert.ok(q.modules[oy]![ox + i] && q.modules[oy + 6]![ox + i] && q.modules[oy + i]![ox] && q.modules[oy + i]![ox + 6], "finder border");
      }
      assert.ok(q.modules[oy + 3]![ox + 3], "finder centre");
    }
    for (let i = 8; i < q.size - 8; i++) assert.equal(q.modules[6]![i], i % 2 === 0, "timing row");
    assert.ok(q.modules[q.size - 8]![8], "the always-dark module");
  }
});
await ok("qr: the longest allowed text (version 10) works and one byte more is refused", () => {
  const big = qrApi.encode("b".repeat(213));
  assert.equal(big.version, 10);
  assert.throws(() => qrApi.encode("b".repeat(214)), /too long/);
});
await ok("qr: UTF-8 text is encoded as bytes, output is deterministic, and the SVG path has one square per dark module", () => {
  const a = qrApi.encode("Karibu — café");
  const b = qrApi.encode("Karibu — café");
  assert.equal(ascii(a), ascii(b));
  const svg = qrApi.toSvgPath(a, 4);
  assert.equal(svg.viewBox, `0 0 ${a.size + 8} ${a.size + 8}`);
  assert.equal((svg.d.match(/M/g) ?? []).length, a.modules.flat().filter(Boolean).length);
});

console.log(`\n${passed} pilot checks passed.`);
