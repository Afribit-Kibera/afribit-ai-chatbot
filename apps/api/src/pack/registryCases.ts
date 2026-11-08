import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Fastify from "fastify";
import { buildPrompt } from "../prompt/promptBuilder.js";
import { registerPackRoutes } from "../routes/pack.js";
import { DEFAULT_PACK_DIR, getPack, getRegistry, runWithPack, setRegistry } from "./active.js";
import { isKnownMode, modeErrorMessage } from "./modes.js";
import { loadPack } from "./load.js";
import { buildRegistry, listPackDirs, loadRegistry, optionsFromEnv } from "./registry.js";
import { selectPack } from "./request.js";
import type { CommunityPack } from "./types.js";

/**
 * pnpm --filter @afribit/api test:registry -- several packs in one process: loading them together,
 * refusing clashes, choosing one per request, and (the point) never mixing them up while requests
 * interleave. No database, no model.
 */

let passed = 0;
const ok = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};
const okAsync = async (name: string, fn: () => Promise<void>) => {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
};
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const packsDir = path.resolve(DEFAULT_PACK_DIR, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "registry-"));

// A throwaway third pack: the example library, renamed and moved to its own domain, optionally stricter.
function clonePack(name: string, opts: { id?: string; domain?: string; grounding?: "enforce"; secretDetection?: boolean } = {}): string {
  const dest = path.join(tmp, name);
  fs.cpSync(path.join(packsDir, "example-community-library"), dest, { recursive: true });
  const id = opts.id ?? name;
  const d = opts.domain ?? name.replace(/[^a-z]/g, "");
  const manifestFile = path.join(dest, "pack.json");
  const m = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  m.id = id;
  m.name = `Pack ${name}`;
  m.domain = { id: d, label: `${d} help`, retrievalDomains: [d] };
  m.safety = { secretDetection: opts.secretDetection ?? true, ...(opts.grounding ? { grounding: opts.grounding } : {}) };
  fs.writeFileSync(manifestFile, JSON.stringify(m));
  const ren = (s: string) => s.replace(/^library\./, `${d}.`);
  const cardsFile = path.join(dest, "knowledge", "cards.json");
  const cards = JSON.parse(fs.readFileSync(cardsFile, "utf8"));
  for (const t of cards.topics) Object.assign(t, { id: ren(t.id), domain: d });
  for (const e of cards.entries) Object.assign(e, { id: ren(e.id), topic: e.topic ? ren(e.topic) : e.topic, domain: d });
  fs.writeFileSync(cardsFile, JSON.stringify(cards));
  const evalFile = path.join(dest, "eval", "retrieval.json");
  const ev = JSON.parse(fs.readFileSync(evalFile, "utf8"));
  for (const c of ev.cases) c.expected = c.expected.map(ren);
  fs.writeFileSync(evalFile, JSON.stringify(ev));
  return dest;
}
const load = (dir: string): CommunityPack => {
  const r = loadPack(dir);
  assert.deepEqual(r.errors, [], `${dir} should load`);
  return r.pack as CommunityPack;
};

// ---- 1. both bundled packs load together ---------------------------------------------------------
const both = loadRegistry({ packsDir });
ok("the bundled packs load together", () => {
  assert.deepEqual(both.errors, []);
  assert.deepEqual(both.registry?.packs.map((p) => p.id), ["example-library", "kibera-bitcoin"]);
});
const kibera = both.registry!.get("kibera-bitcoin")!;
const library = both.registry!.get("example-library")!;
ok("the default pack is kibera-bitcoin when it is served", () => assert.equal(both.registry?.default.id, "kibera-bitcoin"));
ok("listPackDirs finds each folder with a pack.json", () => assert.equal(listPackDirs(packsDir).length, 2));
ok("the two bundled packs share no retrieval domain, card id or topic id", () => {
  const dom = (p: CommunityPack) => p.domain.retrievalDomains;
  assert.equal(dom(kibera).some((d) => dom(library).includes(d)), false);
  const ids = new Set(kibera.knowledge.entries.map((c) => c.id));
  assert.equal(library.knowledge.entries.some((c) => ids.has(c.id)), false);
});

// ---- 2. clashes are refused, loudly -------------------------------------------------------------
ok("a pack with the same id as another is rejected, naming both folders", () => {
  const dup = load(clonePack("dup-one", { id: "kibera-bitcoin" }));
  const r = buildRegistry([kibera, dup]);
  assert.equal(r.ok, false);
  assert.match(r.errors.join("\n"), /two packs have the id "kibera-bitcoin"/);
});
ok("two packs that search the same retrieval domain are rejected", () => {
  const shared = load(clonePack("shared-domain", { domain: "bitcoin" }));
  const r = buildRegistry([kibera, shared]);
  assert.equal(r.ok, false);
  assert.match(r.errors.join("\n"), /both search the retrieval domain "bitcoin"/);
});
ok("two packs with the same card id are rejected (the cards table is keyed by id)", () => {
  const dir = clonePack("same-cards", { domain: "other" });
  const cardsFile = path.join(dir, "knowledge", "cards.json");
  const c = JSON.parse(fs.readFileSync(cardsFile, "utf8"));
  c.entries[0].id = library.knowledge.entries[0]!.id;
  fs.writeFileSync(cardsFile, JSON.stringify(c));
  const evalFile = path.join(dir, "eval", "retrieval.json");
  fs.rmSync(evalFile);
  const r = buildRegistry([library, load(dir)]);
  assert.equal(r.ok, false);
  assert.match(r.errors.join("\n"), /card id ".+" is in both/);
});
ok("COMMUNITY_PACKS naming a pack that is not there is an error listing what is", () => {
  const r = loadRegistry({ packsDir, only: ["kibera-bitcoin", "ghost"] });
  assert.equal(r.ok, false);
  assert.match(r.errors.join("\n"), /"ghost".*found: example-library, kibera-bitcoin/);
});
ok("COMMUNITY_PACKS limits what is served", () => {
  const r = loadRegistry({ packsDir, only: ["example-library"] });
  assert.deepEqual(r.registry?.packs.map((p) => p.id), ["example-library"]);
  assert.equal(r.registry?.default.id, "example-library");
});
ok("DEFAULT_PACK must be a served pack; a valid one is used", () => {
  assert.equal(loadRegistry({ packsDir, defaultId: "nope" }).ok, false);
  assert.equal(loadRegistry({ packsDir, defaultId: "example-library" }).registry?.default.id, "example-library");
});
ok("one invalid pack stops the whole registry and its problems are listed with the folder name", () => {
  const dir = path.join(tmp, "several");
  fs.mkdirSync(dir);
  fs.cpSync(path.join(packsDir, "kibera-bitcoin"), path.join(dir, "good"), { recursive: true });
  const bad = path.join(dir, "bad");
  fs.cpSync(path.join(packsDir, "example-community-library"), bad, { recursive: true });
  const f = path.join(bad, "pack.json");
  const m = JSON.parse(fs.readFileSync(f, "utf8"));
  m.defaultMode = "nope";
  m.version = "x";
  fs.writeFileSync(f, JSON.stringify(m));
  const r = loadRegistry({ packsDir: dir });
  assert.equal(r.ok, false);
  assert.match(r.errors.join("\n"), /bad: pack\.json: "defaultMode"/);
  assert.match(r.errors.join("\n"), /bad: pack\.json: "version"/);
});
ok("a folder with no packs, and an unset directory, are errors", () => {
  assert.equal(loadRegistry({ packsDir: path.join(tmp, "nothing-here") }).ok, false);
  assert.equal(loadRegistry({}).ok, false);
});
ok("environment: one pack by default, COMMUNITY_PACKS_DIR for several and it wins over COMMUNITY_PACK_DIR", () => {
  const single = optionsFromEnv({}, DEFAULT_PACK_DIR);
  assert.equal(single.packDir, DEFAULT_PACK_DIR);
  assert.equal(single.packsDir, undefined);
  const multi = optionsFromEnv({ COMMUNITY_PACKS_DIR: packsDir, COMMUNITY_PACKS: " a, b ,", DEFAULT_PACK: "a" }, DEFAULT_PACK_DIR);
  assert.deepEqual([multi.packsDir, multi.only, multi.defaultId], [packsDir, ["a", "b"], "a"]);
  const precedence = optionsFromEnv({ COMMUNITY_PACKS_DIR: packsDir, COMMUNITY_PACK_DIR: DEFAULT_PACK_DIR }, DEFAULT_PACK_DIR);
  assert.deepEqual([precedence.packsDir, precedence.packDir, precedence.errors], [packsDir, undefined, []]);
  // an empty COMMUNITY_PACKS_DIR (as a compose file passes when unset) means "not set"
  assert.equal(optionsFromEnv({ COMMUNITY_PACKS_DIR: "", COMMUNITY_PACK_DIR: DEFAULT_PACK_DIR }, DEFAULT_PACK_DIR).packDir, DEFAULT_PACK_DIR);
  // a single-pack server ignores DEFAULT_PACK: it behaves exactly as before
  assert.equal(optionsFromEnv({ DEFAULT_PACK: "x" }, DEFAULT_PACK_DIR).defaultId, undefined);
});
ok("a single pack under COMMUNITY_PACK_DIR behaves as before: it is the default", () => {
  const r = loadRegistry({ packDir: path.join(packsDir, "example-community-library") });
  assert.equal(r.registry?.packs.length, 1);
  assert.equal(r.registry?.default.id, "example-library");
});

// ---- 3. which pack a request is for (no Fastify, no database) --------------------------------------
const reg = both.registry!;
ok("no header or query: the default pack, not explicit", () => {
  const s = selectPack(reg, {}, {});
  assert.ok(s.ok && s.pack.id === "kibera-bitcoin" && !s.explicit);
});
ok("the x-pack header picks a pack", () => {
  const s = selectPack(reg, { "x-pack": "example-library" }, {});
  assert.ok(s.ok && s.pack.id === "example-library" && s.explicit);
});
ok("the pack query parameter picks a pack; undefined query is fine", () => {
  const s = selectPack(reg, {}, { pack: "example-library" });
  assert.ok(s.ok && s.pack.id === "example-library" && s.explicit);
  assert.ok(selectPack(reg, {}, undefined).ok);
});
ok("header and query naming the same pack agree; different packs are a 400", () => {
  assert.ok(selectPack(reg, { "x-pack": "example-library" }, { pack: "example-library" }).ok);
  const s = selectPack(reg, { "x-pack": "example-library" }, { pack: "kibera-bitcoin" });
  assert.ok(!s.ok && s.status === 400);
});
ok("an unknown pack is a 404 that lists the valid ids", () => {
  const s = selectPack(reg, { "x-pack": "nope" }, {});
  assert.ok(!s.ok && s.status === 404);
  assert.match(!s.ok ? s.error : "", /Unknown pack "nope".*example-library, kibera-bitcoin/);
  assert.deepEqual(!s.ok ? s.packs : [], ["example-library", "kibera-bitcoin"]);
});
ok("blank values count as not named; arrays use the first value; hostile ids are not echoed raw", () => {
  assert.ok(selectPack(reg, { "x-pack": "  " }, { pack: "" }).ok);
  const a = selectPack(reg, { "x-pack": ["example-library", "x"] }, {});
  assert.ok(a.ok && a.pack.id === "example-library");
  const h = selectPack(reg, { "x-pack": "<script>alert(1)</script>" }, {});
  assert.ok(!h.ok && !h.error.includes("<"));
  const long = selectPack(reg, { "x-pack": "a".repeat(500) }, {});
  assert.ok(!long.ok && long.error.length < 200);
});

// ---- 4. isolation: each request sees only its own pack ---------------------------------------------
setRegistry(reg);
ok("outside any request the default pack answers", () => assert.equal(getPack().id, "kibera-bitcoin"));
ok("modes, error messages, disclaimers and starter questions follow the bound pack", () => {
  runWithPack(library, () => {
    assert.equal(isKnownMode("plain_en"), true);
    assert.equal(isKnownMode("sheng"), false);
    assert.match(modeErrorMessage("languageMode"), /plain_en, formal_en/);
    assert.equal(getPack().starterQuestions, null);
    assert.deepEqual(getPack().disclaimers, library.disclaimers);
  });
  runWithPack(kibera, () => {
    assert.equal(isKnownMode("sheng"), true);
    assert.equal(isKnownMode("plain_en"), false);
    assert.doesNotMatch(modeErrorMessage("languageMode"), /plain_en/);
    assert.ok(getPack().starterQuestions);
  });
});
ok("prompts built in a scope use that pack's wording and nothing of the other's", () => {
  const input = { languageMode: "plain_en", explanationLevel: "normal" as const, retrieval: [], conversationHistory: [], userMessage: "hello" };
  const inLibrary = runWithPack(library, () => JSON.stringify(buildPrompt(input)));
  assert.equal(inLibrary, JSON.stringify(buildPrompt(input, library)));
  for (const word of ["bitcoin", "kibera", "sheng", "seed phrase", "m-pesa", "lightning", "nairobi"]) assert.equal(inLibrary.toLowerCase().includes(word), false, `leaked ${word}`);
  const inKibera = runWithPack(kibera, () => JSON.stringify(buildPrompt({ ...input, languageMode: "sheng" })));
  assert.equal(inKibera.includes("Community Library Guide"), false);
});
ok("the retrieval domains a scope exposes never overlap", () => {
  const a = runWithPack(kibera, () => getPack().domain.retrievalDomains);
  const b = runWithPack(library, () => getPack().domain.retrievalDomains);
  assert.deepEqual(a, ["bitcoin"]);
  assert.deepEqual(b, ["library"]);
});
ok("grounding and secret-detection settings are per pack", () => {
  const strict = load(clonePack("strict-pack", { grounding: "enforce", secretDetection: false }));
  assert.equal(runWithPack(strict, () => getPack().safety.grounding), "enforce");
  assert.equal(runWithPack(strict, () => getPack().safety.secretDetection), false);
  assert.equal(runWithPack(kibera, () => getPack().safety.grounding), "log");
  assert.equal(runWithPack(kibera, () => getPack().safety.secretDetection), true);
});

// ---- 5. many interleaved requests never see each other's pack -----------------------------------------
const third = load(clonePack("third-pack", { grounding: "enforce" }));
const triple = buildRegistry([kibera, library, third]).registry!;
setRegistry(triple);
const promptInput = (mode: string) => ({ languageMode: mode, explanationLevel: "normal" as const, retrieval: [], conversationHistory: [], userMessage: "hello" });
const modeFor = (p: CommunityPack) => p.modes[p.modes.length - 1]!.id;
const expected = new Map(triple.packs.map((p) => [p.id, JSON.stringify(buildPrompt(promptInput(modeFor(p)), p))]));

await okAsync("300 interleaved async tasks bound to three packs never cross-contaminate", async () => {
  let checks = 0;
  const task = async (i: number): Promise<void> => {
    const pack = triple.packs[i % triple.packs.length]!;
    await runWithPack(pack, async () => {
      for (let step = 0; step < 6; step++) {
        // every kind of wait a real request goes through
        if (step % 4 === 0) await sleep((i * 7 + step) % 5);
        else if (step % 4 === 1) await new Promise<void>((r) => setImmediate(r));
        else if (step % 4 === 2) await new Promise<void>((r) => process.nextTick(r));
        else await Promise.all([sleep(1), Promise.resolve()]);
        assert.equal(getPack().id, pack.id, `task ${i} step ${step} saw ${getPack().id}`);
        assert.equal(JSON.stringify(buildPrompt(promptInput(modeFor(pack)))), expected.get(pack.id));
        assert.equal(isKnownMode(modeFor(pack)), true);
        checks++;
        // a nested scope (a conversation that belongs to another pack) must not leak out when it ends
        if (step === 2) {
          const other = triple.packs[(i + 1) % triple.packs.length]!;
          await runWithPack(other, async () => {
            await sleep(1);
            assert.equal(getPack().id, other.id);
          });
          assert.equal(getPack().id, pack.id, `task ${i} lost its pack after a nested scope`);
        }
      }
    });
  };
  await Promise.all(Array.from({ length: 300 }, (_, i) => task(i)));
  assert.equal(checks, 1800);
  assert.equal(getPack().id, "kibera-bitcoin");
});

// ---- 6. through Fastify, including a hijacked streaming reply ------------------------------------------
const app = Fastify();
registerPackRoutes(app);
app.get("/whoami", async () => {
  await sleep(2);
  const first = getPack().id;
  await new Promise<void>((r) => setImmediate(r));
  return { first, second: getPack().id };
});
app.get("/stream", async (_request, reply) => {
  reply.hijack();
  reply.raw.writeHead(200, { "content-type": "application/x-ndjson" });
  // The shape of routes/chat.ts: after the hijack the handler keeps awaiting model chunks and writing.
  for (let i = 0; i < 4; i++) {
    await sleep(2);
    reply.raw.write(`${JSON.stringify({ i, pack: getPack().id })}\n`);
  }
  reply.raw.end();
});
await app.ready();

await okAsync("the request hook binds the pack from x-pack, ?pack= or the default, across awaits", async () => {
  const get = async (opts: { url: string; headers?: Record<string, string> }) => app.inject({ method: "GET", ...opts });
  assert.deepEqual((await get({ url: "/whoami" })).json(), { first: "kibera-bitcoin", second: "kibera-bitcoin" });
  assert.deepEqual((await get({ url: "/whoami", headers: { "x-pack": "example-library" } })).json(), { first: "example-library", second: "example-library" });
  assert.deepEqual((await get({ url: "/whoami?pack=third-pack" })).json(), { first: "third-pack", second: "third-pack" });
  const res = await Promise.all(Array.from({ length: 60 }, (_, i) => get({ url: "/whoami", headers: { "x-pack": triple.packs[i % 3]!.id } })));
  res.forEach((r, i) => assert.deepEqual(r.json(), { first: triple.packs[i % 3]!.id, second: triple.packs[i % 3]!.id }));
});
await okAsync("an unknown pack is a JSON 404 listing valid ids; disagreeing header and query is a 400", async () => {
  const r = await app.inject({ method: "GET", url: "/whoami", headers: { "x-pack": "nope" } });
  assert.equal(r.statusCode, 404);
  assert.match(r.json().error, /Unknown pack "nope".*example-library/);
  assert.deepEqual(r.json().packs, ["example-library", "kibera-bitcoin", "third-pack"]);
  assert.equal((await app.inject({ method: "GET", url: "/whoami?pack=nope" })).statusCode, 404);
  assert.equal((await app.inject({ method: "GET", url: "/whoami?pack=third-pack", headers: { "x-pack": "example-library" } })).statusCode, 400);
});
await okAsync("a hijacked streaming reply keeps its pack for every chunk, concurrently", async () => {
  const runs = await Promise.all(
    Array.from({ length: 30 }, (_, i) => app.inject({ method: "GET", url: "/stream", headers: { "x-pack": triple.packs[i % 3]!.id } })),
  );
  runs.forEach((r, i) => {
    const lines = r.body.trim().split("\n").map((l) => JSON.parse(l) as { i: number; pack: string });
    assert.equal(lines.length, 4);
    for (const l of lines) assert.equal(l.pack, triple.packs[i % 3]!.id);
  });
});
await okAsync("GET /api/v1/packs lists id, name, community, domain and the default, without prompts", async () => {
  const r = await app.inject({ method: "GET", url: "/api/v1/packs" });
  const body = r.json();
  assert.equal(body.default, "kibera-bitcoin");
  assert.deepEqual(body.packs.map((p: { id: string }) => p.id), ["example-library", "kibera-bitcoin", "third-pack"]);
  const k = body.packs.find((p: { id: string }) => p.id === "kibera-bitcoin");
  assert.deepEqual(Object.keys(k).sort(), ["community", "default", "domain", "id", "name"]);
  assert.equal(k.default, true);
  assert.equal(body.packs.filter((p: { default: boolean }) => p.default).length, 1);
  assert.equal(/identity|safety|prompt/i.test(r.body), false);
});
await okAsync("GET /api/v1/pack describes the request's pack and varies on x-pack", async () => {
  const a = (await app.inject({ method: "GET", url: "/api/v1/pack" })).json();
  const b = await app.inject({ method: "GET", url: "/api/v1/pack", headers: { "x-pack": "example-library" } });
  assert.equal(a.id, "kibera-bitcoin");
  assert.equal(b.json().id, "example-library");
  assert.deepEqual(b.json().modes.map((m: { id: string }) => m.id), ["plain_en", "formal_en"]);
  assert.match(String(b.headers.vary), /x-pack/i);
});
await okAsync("GET /api/v1/pack carries branding per pack: Kibera is unchanged (no logo, no Powered-by), the library pack brings its own", async () => {
  const k = (await app.inject({ method: "GET", url: "/api/v1/pack" })).json().branding;
  assert.deepEqual(k, { shortName: "Afribit AI", tagline: null, accentColor: null, accentInk: null, welcomeTitle: null, welcomeText: null, composerPlaceholder: null, poweredBy: { show: false, label: "Powered by Afribit AI", url: "https://github.com/afribit/afribit-ai" } });
  const res = await app.inject({ method: "GET", url: "/api/v1/pack", headers: { "x-pack": "example-library" } });
  const b = res.json().branding;
  assert.equal(b.shortName, "Reading Room");
  assert.equal(b.accentColor, "#1f6f5c");
  assert.equal(b.accentInk, "#ffffff");
  assert.match(b.logoUrl, /^\/api\/v1\/pack\/brand\/logo\?pack=example-library&v=[0-9a-f]{16}$/);
  assert.deepEqual(b.poweredBy, { show: true, label: "Powered by Afribit AI", url: "https://github.com/afribit/afribit-ai" });
  assert.equal(/logo\.svg|[A-Za-z]:\\|packs[\\/]/.test(res.body), false, "no file path leaves the server");
});
await okAsync("GET /api/v1/pack/brand/logo serves the chosen pack's logo with safe headers, and 304 when unchanged", async () => {
  const meta = (await app.inject({ method: "GET", url: "/api/v1/pack", headers: { "x-pack": "example-library" } })).json().branding;
  for (const req of [{ url: meta.logoUrl as string }, { url: "/api/v1/pack/brand/logo", headers: { "x-pack": "example-library" } }]) {
    const r = await app.inject({ method: "GET", ...req });
    assert.equal(r.statusCode, 200);
    assert.equal(r.headers["content-type"], "image/svg+xml");
    assert.equal(r.headers["x-content-type-options"], "nosniff");
    assert.equal(r.headers["content-security-policy"], "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    assert.match(String(r.headers["cache-control"]), /public, max-age=\d+/);
    assert.match(String(r.headers.vary), /x-pack/i);
    assert.ok(r.rawPayload.equals(library.branding.logo!.bytes), "serves exactly the validated bytes");
    assert.ok(r.body.startsWith("<svg"));
    const again = await app.inject({ method: "GET", ...req, headers: { ...(req.headers ?? {}), "if-none-match": String(r.headers.etag) } });
    assert.equal(again.statusCode, 304);
  }
});
await okAsync("the logo route picks the pack like every other route: no logo is a JSON 404, an unknown pack a 404, interleaved requests do not mix", async () => {
  const none = await app.inject({ method: "GET", url: "/api/v1/pack/brand/logo" });
  assert.equal(none.statusCode, 404);
  assert.match(none.json().error, /no logo/);
  assert.equal((await app.inject({ method: "GET", url: "/api/v1/pack/brand/logo?pack=nope" })).statusCode, 404);
  assert.equal((await app.inject({ method: "GET", url: "/api/v1/pack/brand/logo?pack=third-pack", headers: { "x-pack": "example-library" } })).statusCode, 400);
  const mixed = await Promise.all(Array.from({ length: 40 }, (_, i) => app.inject({ method: "GET", url: "/api/v1/pack/brand/logo", headers: { "x-pack": i % 2 ? "kibera-bitcoin" : "example-library" } })));
  mixed.forEach((r, i) => assert.equal(r.statusCode, i % 2 ? 404 : 200));
});
await app.close();

setRegistry(null);
assert.equal(getRegistry().default.id, "kibera-bitcoin", "with nothing configured the bundled Kibera pack is served alone");
assert.equal(getRegistry().packs.length, 1);
passed++;
console.log("  ok  with nothing configured the server serves the bundled Kibera pack alone");

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`registry: ${passed} checks passed`);
