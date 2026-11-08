import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { RetrievalResult } from "@afribit/shared";
import { buildPrompt } from "../prompt/promptBuilder.js";
import { DEFAULT_PACK_DIR, getPack, getRegistry, runWithPack, setRegistry } from "./active.js";
import { PROMPT_FILES } from "./defaults.js";
import { loadPack } from "./load.js";
import { findOverride, isSafeRel, listHistory, MAX_OVERRIDE_BYTES, overridePath, readHistory } from "./overrides.js";
import { buildRegistry, loadRegistry } from "./registry.js";
import {
  ADMIN_ONLY_SLOTS,
  baselineText,
  canEdit,
  checkText,
  collectOverrides,
  describeFiles,
  draftPack,
  findVoiceFile,
  historyOf,
  listVoiceFiles,
  loadWithChanges,
  reloadServedPacks,
  restoreVersion,
  revertOverride,
  saveOverride,
  VoiceError,
  type VoiceActor,
  type VoiceContext,
} from "./voice.js";
import { previewAnswer, type PreviewDeps } from "./voicePreview.js";

/**
 * pnpm --filter @afribit/api test:voice -- the Voice Lab's rules: what can be edited and by whom, how a text is
 * checked, that a change which breaks the pack is refused and the old wording keeps serving, atomic writes,
 * history and restore, reloading without disturbing requests in flight, and that with no overrides nothing changes.
 * No database, no model: the model is a fake.
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
const rejects = async (fn: () => unknown, status: number, match?: RegExp) => {
  try {
    await fn();
  } catch (err) {
    assert.ok(err instanceof VoiceError, `expected a VoiceError, got ${String(err)}`);
    assert.equal(err.httpStatus, status, err.message);
    if (match) assert.match(err.message + " " + err.errors.join(" "), match);
    return;
  }
  assert.fail(`expected a VoiceError ${status}`);
};
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// A private copy of the Kibera pack, so nothing here can touch the real one.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "voice-cases-"));
const packDir = path.join(tmp, "packs", "kibera-bitcoin");
fs.cpSync(DEFAULT_PACK_DIR, packDir, { recursive: true });
const overridesDir = path.join(tmp, "overrides");
fs.mkdirSync(overridesDir);

const first = loadPack(packDir);
assert.ok(first.ok && first.pack, first.errors.join("; "));
const basePack = first.pack;
setRegistry(buildRegistry([basePack]).registry ?? null);

const admin: VoiceActor = { id: "11111111-2222-3333-4444-555555555555", role: "admin" };
const reviewer: VoiceActor = { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", role: "reviewer" };
const learner: VoiceActor = { id: "99999999-2222-3333-4444-555555555555", role: "contributor" };
const audits: { action: string; path: string; details: Record<string, unknown> }[] = [];
const ctx = (): VoiceContext => ({ pack: getRegistry().get("kibera-bitcoin")!, overridesDir, audit: async (e) => void audits.push(e) });
const served = () => getRegistry().get("kibera-bitcoin")!;
const SHENG = "language/sheng.full.md";

// ---- what can be edited -------------------------------------------------------------------------
ok("the editable list comes from the pack: every prompt slot, both files of every mode, four JSON files", () => {
  const files = listVoiceFiles(basePack).map((f) => f.path);
  for (const file of Object.values(PROMPT_FILES)) assert.ok(files.includes(`prompts/${file}`), file);
  for (const m of basePack.modes) assert.ok(files.includes(`language/${m.id}.full.md`) && files.includes(`language/${m.id}.compact.md`), m.id);
  for (const f of ["prompts/few-shots.json", "language/postprocess.json", "retrieval/synonyms.json", "starter-questions.json"]) assert.ok(files.includes(f), f);
  assert.equal(files.length, Object.keys(PROMPT_FILES).length + basePack.modes.length * 2 + 4);
  assert.equal(new Set(files).size, files.length);
});

ok("nothing outside the whitelist is reachable: manifest, knowledge, eval, traversal, absolute and odd paths", () => {
  for (const bad of ["pack.json", "knowledge/cards.json", "eval/retrieval.json", "../pack.json", "language/../pack.json", "/etc/passwd", "C:\\Windows\\win.ini", "language\\sheng.full.md", "./language/sheng.full.md", "language/sheng.full.md ", "LANGUAGE/sheng.full.md", "language/sheng.full.md\0", "language//sheng.full.md", "", "prompts/", "language/nope.full.md", "language/sheng.full.md/../../pack.json"]) {
    assert.equal(findVoiceFile(basePack, bad), undefined, JSON.stringify(bad));
  }
  for (const bad of [null, undefined, 5, {}, ["pack.json"]]) assert.equal(findVoiceFile(basePack, bad), undefined);
  assert.ok(findVoiceFile(basePack, SHENG));
});

ok("path helpers refuse traversal and bad pack ids", () => {
  for (const bad of ["../x", "a/../b", "/abs", "a\\b", "", ".", "..", "a/./b", "a/b/c/d", "x".repeat(200)]) assert.equal(isSafeRel(bad), false, bad);
  assert.equal(isSafeRel(SHENG), true);
  assert.throws(() => overridePath(overridesDir, "../evil", SHENG));
  assert.throws(() => overridePath(overridesDir, "kibera-bitcoin", "../pack.json"));
  assert.ok(overridePath(overridesDir, "kibera-bitcoin", SHENG).startsWith(overridesDir));
});

ok("every file has a description (a file without one is flagged, not hidden)", () => {
  const undescribed = listVoiceFiles(basePack).filter((f) => !f.described).map((f) => f.path);
  assert.deepEqual(undescribed, [], "add these to apps/api/config/voice-files.json");
});

// ---- who may edit what --------------------------------------------------------------------------
ok("the five safety-critical prompts are admin only; everything else a reviewer may edit", () => {
  const adminOnly = ADMIN_ONLY_SLOTS.map((s) => `prompts/${PROMPT_FILES[s]}`).sort();
  assert.deepEqual(adminOnly, ["prompts/chef.md", "prompts/safety.compact.md", "prompts/safety.full.md", "prompts/serve-safety.md", "prompts/ticket.md"]);
  for (const f of listVoiceFiles(basePack)) {
    assert.equal(f.adminOnly, adminOnly.includes(f.path), f.path);
    assert.equal(canEdit(f, admin), true);
    assert.equal(canEdit(f, reviewer), !f.adminOnly, f.path);
    assert.equal(canEdit(f, learner), false);
    if (f.adminOnly) assert.equal(f.group, "safety");
  }
  const view = describeFiles(basePack, overridesDir, reviewer);
  assert.equal(view.find((f) => f.path === "prompts/safety.full.md")?.canEdit, false);
  assert.equal(view.find((f) => f.path === SHENG)?.canEdit, true);
});

await okAsync("a reviewer is refused every admin-only file (save, revert, restore); nothing is written", async () => {
  for (const rel of ADMIN_ONLY_SLOTS.map((s) => `prompts/${PROMPT_FILES[s]}`)) {
    await rejects(() => saveOverride(ctx(), reviewer, rel, "Changed."), 403);
    await rejects(() => revertOverride(ctx(), reviewer, rel), 403);
    await rejects(() => restoreVersion(ctx(), reviewer, rel, "x"), 403);
    await rejects(() => saveOverride(ctx(), learner, rel, "Changed."), 403);
  }
  await rejects(() => saveOverride(ctx(), learner, SHENG, "Changed."), 403);
  assert.equal(fs.existsSync(path.join(overridesDir, "kibera-bitcoin")), false);
  assert.equal(audits.length, 0);
});

await okAsync("a path outside the whitelist is a 400 and writes nothing", async () => {
  for (const bad of ["pack.json", "../pack.json", "/etc/passwd", "knowledge/cards.json"]) {
    await rejects(() => saveOverride(ctx(), admin, bad, "{}"), 400);
    await rejects(() => revertOverride(ctx(), admin, bad), 400);
  }
  assert.equal(fs.existsSync(path.join(overridesDir, "kibera-bitcoin")), false);
});

// ---- checking a text ----------------------------------------------------------------------------
const file = (rel: string) => findVoiceFile(basePack, rel)!;
ok("size: over 20 KB is refused (413), exactly at the limit is fine", () => {
  assert.throws(() => checkText(file(SHENG), "x".repeat(MAX_OVERRIDE_BYTES + 1)), (e) => e instanceof VoiceError && e.httpStatus === 413);
  assert.throws(() => checkText(file(SHENG), "é".repeat(MAX_OVERRIDE_BYTES)), (e) => e instanceof VoiceError && e.httpStatus === 413, "bytes, not characters");
  assert.equal(checkText(file(SHENG), "x".repeat(MAX_OVERRIDE_BYTES)).length, MAX_OVERRIDE_BYTES);
});

ok("text rules: string, no control characters, not empty unless the default is empty, normalised line endings", () => {
  assert.throws(() => checkText(file(SHENG), 5), (e) => e instanceof VoiceError && e.httpStatus === 400);
  assert.throws(() => checkText(file(SHENG), "a\u0000b"), (e) => e instanceof VoiceError && /control/.test(e.message));
  assert.throws(() => checkText(file(SHENG), "   \n"), (e) => e instanceof VoiceError && /empty/.test(e.message));
  assert.equal(checkText(file("prompts/communication.md"), "  \n"), "", "an optional guide may be blank");
  assert.throws(() => checkText(file("prompts/identity.full.md"), ""), /empty/);
  assert.equal(checkText(file(SHENG), "\uFEFFline one\r\nline two\r\n\r\n"), "line one\nline two");
  assert.equal(checkText(file(SHENG), "Sheng: umetoka {unclosed brace"), "Sheng: umetoka {unclosed brace");
});

ok("placeholders: only {{name}} {{community}} {{domain}} {{contact}} in prompts; none elsewhere; spaces are caught", () => {
  const p = file("prompts/identity.full.md");
  assert.equal(checkText(p, "I am {{name}} for {{community}}, {{domain}}, {{contact}}."), "I am {{name}} for {{community}}, {{domain}}, {{contact}}.");
  for (const bad of ["{{ name }}", "{{nme}}", "{{name}", "{{", "{{name}}}} {{x}}"]) assert.throws(() => checkText(p, `Hi ${bad}`), (e) => e instanceof VoiceError && /placeholder|braces/.test(e.message), bad);
  assert.throws(() => checkText(file(SHENG), "Say {{name}} here"), (e) => e instanceof VoiceError && /not filled/.test(e.message));
});

ok("JSON files must parse", () => {
  assert.throws(() => checkText(file("prompts/few-shots.json"), "[{"), (e) => e instanceof VoiceError && /not valid JSON/.test(e.message));
  assert.throws(() => checkText(file("retrieval/synonyms.json"), "{synonyms: 1}"), (e) => e instanceof VoiceError && /not valid JSON/.test(e.message));
  assert.equal(checkText(file("prompts/few-shots.json"), "[]"), "[]");
});

ok("clean-up rules: bad shape, flags, long patterns and patterns that could freeze the server are refused", () => {
  const pp = file("language/postprocess.json");
  const rule = (find: string, flags = "g") => JSON.stringify({ rules: [{ find, flags, replace: "" }] });
  assert.doesNotThrow(() => checkText(pp, rule("Kwa hivyo,?\\s*", "gi")));
  assert.throws(() => checkText(pp, "[]"), /must be/);
  assert.throws(() => checkText(pp, rule("a", "gx")), /flags/);
  assert.throws(() => checkText(pp, rule("a".repeat(201))), /longer/);
  assert.throws(() => checkText(pp, JSON.stringify({ rules: Array.from({ length: 101 }, () => ({ find: "a", replace: "" })) })), /at most/);
  const t0 = Date.now();
  assert.throws(() => checkText(pp, rule("(a+)+$")), /too slow/);
  assert.throws(() => checkText(pp, rule("(\\s*\\w+\\s*)*!")), /too slow/);
  assert.ok(Date.now() - t0 < 2000, "the probe must stop a runaway pattern quickly");
});

// ---- overrides absent = identical to today ------------------------------------------------------
ok("no overrides: loading with an empty or missing overrides folder is identical to loading without the feature", () => {
  const plain = loadPack(DEFAULT_PACK_DIR);
  const empty = fs.mkdtempSync(path.join(tmp, "empty-"));
  for (const opts of [{ overridesDir: empty }, { overridesDir: path.join(tmp, "does-not-exist") }, {}]) {
    const r = loadPack(DEFAULT_PACK_DIR, opts);
    assert.deepEqual(r.overridden, []);
    assert.deepEqual(r.warnings, plain.warnings);
    assert.deepEqual(r.pack, plain.pack);
  }
});

ok("manifest, knowledge and eval cannot be overridden even if a file is placed there", () => {
  const dir = path.join(tmp, "sneaky");
  for (const rel of ["pack.json", "knowledge/cards.json", "eval/retrieval.json"]) {
    fs.mkdirSync(path.dirname(path.join(dir, "kibera-bitcoin", rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, "kibera-bitcoin", rel), "{ not even json");
  }
  const r = loadPack(DEFAULT_PACK_DIR, { overridesDir: dir });
  assert.ok(r.ok, r.errors.join("; "));
  assert.deepEqual(r.overridden, []);
  assert.deepEqual(r.pack, loadPack(DEFAULT_PACK_DIR).pack);
});

await okAsync("branding and the logo are not on the whitelist: not listed, not savable, and files planted in the overrides folder are never read", async () => {
  const LIB = path.join(DEFAULT_PACK_DIR, "..", "example-community-library");
  const lib = loadPack(LIB);
  assert.ok(lib.ok && lib.pack?.branding.logo, lib.errors.join("; "));
  const listed = listVoiceFiles(lib.pack).map((f) => f.path);
  assert.equal(listed.some((f) => /brand|logo|pack\.json/.test(f)), false);
  for (const bad of ["brand/logo.svg", "brand/logo.png", "brand/logo.webp", "brand/README.md", "branding", "pack.json"]) {
    assert.equal(findVoiceFile(lib.pack, bad), undefined, bad);
    await rejects(() => saveOverride({ pack: lib.pack!, overridesDir, audit: async () => {} }, admin, bad, "<svg xmlns='http://www.w3.org/2000/svg'><script>1</script></svg>"), 400);
    await rejects(() => revertOverride({ pack: lib.pack!, overridesDir }, admin, bad), 400);
    assert.throws(() => draftPack(lib.pack!, overridesDir, admin, { [bad]: "x" }), (e) => e instanceof VoiceError && e.httpStatus === 400, bad);
  }
  const dir = path.join(tmp, "sneaky-brand");
  fs.mkdirSync(path.join(dir, "example-library", "brand"), { recursive: true });
  fs.writeFileSync(path.join(dir, "example-library", "brand", "logo.svg"), "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
  fs.writeFileSync(path.join(dir, "example-library", "pack.json"), JSON.stringify({ branding: { shortName: "Hijacked", poweredBy: { show: false } } }));
  const r = loadPack(LIB, { overridesDir: dir });
  assert.ok(r.ok, r.errors.join("; "));
  assert.deepEqual(r.overridden, []);
  assert.equal(r.pack!.branding.shortName, "Reading Room");
  assert.equal(r.pack!.branding.poweredBy.show, true);
  assert.ok(r.pack!.branding.logo!.bytes.equals(lib.pack!.branding.logo!.bytes));
  assert.deepEqual(r.pack!.branding, lib.pack!.branding);
  assert.equal(fs.existsSync(path.join(overridesDir, "example-library")), false);
});

ok("a symlink in the overrides folder is ignored with a warning, never followed", () => {
  const dir = path.join(tmp, "links");
  fs.mkdirSync(path.join(dir, "kibera-bitcoin", "language"), { recursive: true });
  const secret = path.join(tmp, "outside.md");
  fs.writeFileSync(secret, "SECRET OUTSIDE TEXT");
  try {
    fs.symlinkSync(secret, path.join(dir, "kibera-bitcoin", SHENG));
  } catch {
    console.log("  --  symlink test skipped (this account may not create symlinks)");
    return;
  }
  assert.deepEqual(findOverride(dir, "kibera-bitcoin", SHENG), { skipped: "it is a symbolic link" });
  const r = loadPack(DEFAULT_PACK_DIR, { overridesDir: dir });
  assert.ok(r.ok);
  assert.deepEqual(r.overridden, []);
  assert.ok(r.warnings.some((w) => w.includes("symbolic link")));
  assert.ok(!r.pack!.modes.find((m) => m.id === "sheng")!.policyFull.includes("SECRET OUTSIDE"));
});

ok("a folder or an oversized file where an override should be is ignored, not read", () => {
  const dir = path.join(tmp, "odd");
  fs.mkdirSync(path.join(dir, "kibera-bitcoin", "language", "sheng.full.md"), { recursive: true });
  fs.mkdirSync(path.join(dir, "kibera-bitcoin", "prompts"), { recursive: true });
  fs.writeFileSync(path.join(dir, "kibera-bitcoin", "prompts", "identity.full.md"), "x".repeat(MAX_OVERRIDE_BYTES + 100));
  assert.deepEqual(findOverride(dir, "kibera-bitcoin", SHENG), { skipped: "it is not a regular file" });
  assert.match(findOverride(dir, "kibera-bitcoin", "prompts/identity.full.md")?.skipped ?? "", /larger/);
  const r = loadPack(DEFAULT_PACK_DIR, { overridesDir: dir });
  assert.ok(r.ok);
  assert.deepEqual(r.overridden, []);
  assert.equal(r.warnings.filter((w) => w.startsWith("override ")).length, 2);
});

// ---- saving: validate the whole pack, atomic write, history, reload -----------------------------
let before = served();
await okAsync("a reviewer's edit is validated, audited, written atomically, kept in history and served at once", async () => {
  before = served();
  const r = await saveOverride(ctx(), reviewer, SHENG, "Sheng test voice: first version.\n\n\n");
  assert.equal(r.changed, true);
  const file1 = path.join(overridesDir, "kibera-bitcoin", "language", "sheng.full.md");
  assert.equal(fs.readFileSync(file1, "utf8"), "Sheng test voice: first version.\n");
  assert.deepEqual(fs.readdirSync(path.dirname(file1)).filter((f) => f.endsWith(".tmp")), [], "no temporary file is left behind");
  assert.notEqual(served(), before, "a new pack object was swapped in");
  assert.equal(served().modes.find((m) => m.id === "sheng")!.policyFull, "Sheng test voice: first version.");
  assert.equal(served().modes.find((m) => m.id === "swahili")!.policyFull, before.modes.find((m) => m.id === "swahili")!.policyFull, "other files untouched");
  assert.deepEqual(audits.map((a) => [a.action, a.path, a.details.pack]), [["voice:edit", SHENG, "kibera-bitcoin"]]);
  const hist = listHistory(overridesDir, "kibera-bitcoin", SHENG);
  assert.equal(hist.length, 1);
  assert.equal(hist[0]!.userId, reviewer.id.replace(/-/g, ""));
  assert.match(hist[0]!.id, /^\d{8}T\d{9}Z-aaaaaaaabbbbccccddddeeeeeeeeeeee-language__sheng\.full\.md$/);
  assert.equal(readHistory(overridesDir, "kibera-bitcoin", SHENG, hist[0]!.id), "Sheng test voice: first version.");
  const view = describeFiles(served(), overridesDir, reviewer).find((f) => f.path === SHENG)!;
  assert.equal(view.overridden, true);
  assert.equal(view.effective, "Sheng test voice: first version.");
  assert.equal(view.baseline, baselineText(basePack, file(SHENG)));
  assert.notEqual(view.baseline, view.effective);
});

await okAsync("saving the same text again changes nothing and adds no history", async () => {
  const r = await saveOverride(ctx(), reviewer, SHENG, "Sheng test voice: first version.");
  assert.equal(r.changed, false);
  assert.equal(listHistory(overridesDir, "kibera-bitcoin", SHENG).length, 1);
  const baseText = baselineText(basePack, file("language/swahili.full.md"));
  const same = await saveOverride(ctx(), reviewer, "language/swahili.full.md", baseText);
  assert.equal(same.changed, false, "identical to the baseline needs no override");
  assert.equal(fs.existsSync(path.join(overridesDir, "kibera-bitcoin", "language", "swahili.full.md")), false);
});

await okAsync("an admin edits a safety file; the served pack uses it; a reviewer still cannot revert it", async () => {
  await saveOverride(ctx(), admin, "prompts/safety.full.md", "Use only the knowledge given. {{name}} never asks for secrets.");
  assert.equal(served().prompts.safetyFull, "Use only the knowledge given. Afribit AI never asks for secrets.", "placeholder filled from the manifest");
  await rejects(() => revertOverride(ctx(), reviewer, "prompts/safety.full.md"), 403);
  assert.equal(served().prompts.safetyFull.startsWith("Use only the knowledge given."), true);
});

await okAsync("a change that breaks the pack is refused with every reason, nothing is written, and the old pack keeps serving", async () => {
  const current = served();
  const histBefore = listHistory(overridesDir, "kibera-bitcoin", "starter-questions.json").length;
  const auditsBefore = audits.length;
  const bad = JSON.stringify({ reviewed: true, byMode: { klingon: ["Nini?"] } });
  await rejects(() => saveOverride(ctx(), reviewer, "starter-questions.json", bad), 422, /unknown mode "klingon"/);
  await rejects(() => saveOverride(ctx(), reviewer, "prompts/few-shots.json", JSON.stringify([{ role: "user", content: "hi" }])), 422, /pairs/);
  await rejects(() => saveOverride(ctx(), reviewer, "prompts/few-shots.json", JSON.stringify([{ role: "boss", content: "hi" }])), 422, /role/);
  await rejects(() => saveOverride(ctx(), reviewer, "language/postprocess.json", JSON.stringify({ rules: [{ find: "(", replace: "" }] })), 422, /valid pattern/);
  await rejects(() => saveOverride(ctx(), reviewer, "retrieval/synonyms.json", JSON.stringify({ synonyms: { a: "b" } })), 422, /list of words/);
  assert.equal(served(), current, "the very same pack object is still being served");
  assert.equal(fs.existsSync(path.join(overridesDir, "kibera-bitcoin", "starter-questions.json")), false);
  assert.equal(fs.existsSync(path.join(overridesDir, "kibera-bitcoin", "prompts", "few-shots.json")), false);
  assert.equal(listHistory(overridesDir, "kibera-bitcoin", "starter-questions.json").length, histBefore);
  assert.equal(audits.length, auditsBefore, "a refused change leaves no audit row");
});

await okAsync("an unknown placeholder is refused before the pack is even loaded", async () => {
  await rejects(() => saveOverride(ctx(), admin, "prompts/secret-warning.md", "Hello {{nme}}"), 400, /placeholder/);
  assert.equal(served().prompts.secretWarning, basePack.prompts.secretWarning);
});

await okAsync("if the audit row cannot be written, the change is not made (fail closed)", async () => {
  const current = served();
  const failing: VoiceContext = { ...ctx(), audit: async () => { throw new Error("database down"); } };
  await assert.rejects(() => saveOverride(failing, reviewer, "language/swahili.full.md", "Swahili new."), /database down/);
  assert.equal(served(), current);
  assert.equal(fs.existsSync(path.join(overridesDir, "kibera-bitcoin", "language", "swahili.full.md")), false);
});

await okAsync("history lists newest first; restore re-applies an old version through the same checks", async () => {
  await sleep(2);
  await saveOverride(ctx(), admin, SHENG, "Sheng test voice: second version.");
  assert.equal(served().modes.find((m) => m.id === "sheng")!.policyFull, "Sheng test voice: second version.");
  const hist = historyOf(ctx(), SHENG);
  assert.equal(hist.length, 2);
  assert.ok(hist[0]!.id > hist[1]!.id);
  assert.equal(hist[0]!.userId, admin.id.replace(/-/g, ""));
  const oldest = hist[1]!;
  const r = await restoreVersion(ctx(), reviewer, SHENG, oldest.id);
  assert.equal(r.changed, true);
  assert.equal(served().modes.find((m) => m.id === "sheng")!.policyFull, "Sheng test voice: first version.");
  assert.equal(historyOf(ctx(), SHENG).length, 3, "a restore is itself a saved version");
  assert.equal(audits.at(-1)!.details.restoredFrom, oldest.id);
  await rejects(() => restoreVersion(ctx(), reviewer, SHENG, "nope"), 404);
  await rejects(() => restoreVersion(ctx(), reviewer, SHENG, "../../../etc/passwd"), 404);
  // a version of one file cannot be restored into another
  await rejects(() => restoreVersion(ctx(), reviewer, "language/swahili.full.md", oldest.id), 404);
  assert.equal(readHistory(overridesDir, "kibera-bitcoin", "language/swahili.full.md", oldest.id), null);
});

await okAsync("a restore of an old version that is no longer valid is refused like any save", async () => {
  // Hand-place a history copy of a wrong text, as if the rules had changed since it was saved.
  const hdir = path.join(overridesDir, ".history", "kibera-bitcoin");
  const name = "20200101T000000000Z-cccc-starter-questions.json";
  fs.writeFileSync(path.join(hdir, name), JSON.stringify({ byMode: { klingon: [] } }) + "\n");
  await rejects(() => restoreVersion(ctx(), reviewer, "starter-questions.json", name), 422, /klingon/);
});

await okAsync("requests already running keep the pack they started with; new requests get the new one", async () => {
  const mine = served();
  await runWithPack(mine, async () => {
    await saveOverride(ctx(), reviewer, "language/swahili.full.md", "Swahili edited mid-request.");
    await sleep(5);
    assert.equal(getPack(), mine, "the request still sees the pack it began with");
    assert.notEqual(getPack().modes.find((m) => m.id === "swahili")!.policyFull, "Swahili edited mid-request.");
  });
  assert.equal(getPack().modes.find((m) => m.id === "swahili")!.policyFull, "Swahili edited mid-request.");
});

await okAsync("revert restores the baseline, keeps the removed text in history, and is audited", async () => {
  const r = await revertOverride(ctx(), reviewer, "language/swahili.full.md");
  assert.equal(r.changed, true);
  assert.equal(fs.existsSync(path.join(overridesDir, "kibera-bitcoin", "language", "swahili.full.md")), false);
  assert.equal(served().modes.find((m) => m.id === "swahili")!.policyFull, basePack.modes.find((m) => m.id === "swahili")!.policyFull);
  const hist = historyOf(ctx(), "language/swahili.full.md");
  assert.equal(hist[0]!.removed, true);
  assert.equal(readHistory(overridesDir, "kibera-bitcoin", "language/swahili.full.md", hist[0]!.id), "Swahili edited mid-request.");
  assert.equal(audits.at(-1)!.action, "voice:revert");
  assert.equal((await revertOverride(ctx(), reviewer, "language/swahili.full.md")).changed, false, "nothing to revert the second time");
  // ... and the removed text can be brought back
  const back = await restoreVersion(ctx(), reviewer, "language/swahili.full.md", hist[0]!.id);
  assert.equal(back.changed, true);
  await revertOverride(ctx(), reviewer, "language/swahili.full.md");
});

await okAsync("reload keeps the old pack when what is on disk no longer validates, and reports why", async () => {
  const current = served();
  const broken = path.join(overridesDir, "kibera-bitcoin", "retrieval", "synonyms.json");
  fs.mkdirSync(path.dirname(broken), { recursive: true });
  fs.writeFileSync(broken, "{ hand edited and broken");
  const report = reloadServedPacks(overridesDir, ["kibera-bitcoin"]);
  assert.equal(report.ok, false);
  assert.match((report.errors["kibera-bitcoin"] ?? []).join(" "), /synonyms\.json is not valid JSON/);
  assert.equal(served(), current, "the old pack keeps serving");
  assert.equal(reloadServedPacks(overridesDir, ["nope"]).ok, false);
  // a server that STARTS with that file must still start, on the reviewed wording, and say so
  const start = loadRegistry({ packDir, overridesDir });
  assert.ok(start.ok, start.errors.join("; "));
  assert.ok(start.warnings.some((w) => /IGNORED/.test(w)), "the warning says the overrides were ignored");
  assert.equal(start.registry!.default.synonyms !== undefined, true);
  assert.equal(start.registry!.default.modes.find((m) => m.id === "sheng")!.policyFull, basePack.modes.find((m) => m.id === "sheng")!.policyFull);
  fs.unlinkSync(broken);
  assert.equal(reloadServedPacks(overridesDir, ["kibera-bitcoin"]).ok, true);
});

ok("collectOverrides lists exactly the live edits (what the export CLI writes)", () => {
  const found = collectOverrides(served(), overridesDir);
  assert.deepEqual(Object.keys(found).sort(), [SHENG, "prompts/safety.full.md"].sort());
  assert.equal(found[SHENG], "Sheng test voice: first version.");
});

ok("loadWithChanges never touches the real overrides folder or the pack", () => {
  const listing = () => fs.readdirSync(path.join(overridesDir, "kibera-bitcoin"), { recursive: true }).map(String).sort();
  const was = listing();
  const r = loadWithChanges(served(), overridesDir, { "language/swahili.full.md": "Draft only." });
  assert.ok(r.ok);
  assert.equal(r.pack!.modes.find((m) => m.id === "swahili")!.policyFull, "Draft only.");
  assert.equal(r.pack!.modes.find((m) => m.id === "sheng")!.policyFull, "Sheng test voice: first version.", "saved edits are carried into the draft");
  assert.deepEqual(listing(), was);
  const gone = loadWithChanges(served(), overridesDir, { [SHENG]: null });
  assert.equal(gone.pack!.modes.find((m) => m.id === "sheng")!.policyFull, basePack.modes.find((m) => m.id === "sheng")!.policyFull);
});

// ---- try it: drafts overlaid in memory, nothing saved ------------------------------------------
const cards = [{ conceptId: "bitcoin.wallet.001", confidence: 0.9, authoritativeContent: "A wallet manages keys.", safetyWarnings: [], approvedExamples: [], languageGuidance: null, sourceVersion: 1, freshnessDate: "", relatedConcepts: [] }] as unknown as RetrievalResult[];
const deps: PreviewDeps = { retrieve: async () => cards, examples: async () => [], profile: () => "fake_profile" };
const calls: { system: string; messages: number }[] = [];
let reply = "Sawa kabisa.";
const gateway = {
  chat: async (req: { messages: { role: string; content: string }[] }) => {
    calls.push({ system: req.messages[0]!.content, messages: req.messages.length });
    return { content: reply, provider: "fake", model: "fake-1", latencyMs: 1, usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, finishReason: "stop" as const, estimatedCostUsd: null, requestId: "r" };
  },
};
const input = { message: "Wallet ni nini?", mode: "sheng", level: "normal" as const, promptMode: "full" as const };

await okAsync("preview: a draft changes the prompt the model is told; the saved pack does not; nothing is written", async () => {
  const filesBefore = fs.readdirSync(path.join(overridesDir, "kibera-bitcoin"), { recursive: true }).map(String).sort();
  const draft = draftPack(served(), overridesDir, reviewer, { [SHENG]: "DRAFT MARKER voice." });
  calls.length = 0;
  const mine = await previewAnswer(gateway as never, draft, input, deps);
  const saved = await previewAnswer(gateway as never, served(), input, deps);
  assert.ok(mine.systemPrompt.includes("DRAFT MARKER voice."));
  assert.ok(!saved.systemPrompt.includes("DRAFT MARKER"));
  assert.ok(saved.systemPrompt.includes("Sheng test voice: first version."));
  assert.equal(mine.answer, "Sawa kabisa.");
  assert.deepEqual(mine.cardIds, ["bitcoin.wallet.001"]);
  assert.equal(mine.promptMode, "full");
  assert.equal(mine.modelProfile, "fake_profile");
  assert.equal(mine.promptTokensApprox, Math.ceil([mine.systemPrompt, ...mine.turns.map((t) => t.content)].join("").length / 4));
  assert.equal(calls[0]!.system, mine.systemPrompt, "the shown prompt is exactly what the model got");
  assert.equal(mine.turns.at(-1)!.content, input.message);
  assert.ok(mine.turns.length > 1, "sheng gets its example conversations");
  assert.deepEqual(fs.readdirSync(path.join(overridesDir, "kibera-bitcoin"), { recursive: true }).map(String).sort(), filesBefore, "preview wrote nothing");
  assert.equal(getPack().modes.find((m) => m.id === "sheng")!.policyFull, "Sheng test voice: first version.", "and changed nothing being served");
});

await okAsync("preview: the real prompt builders are used (matches buildPrompt exactly; compact is a different, shorter prompt)", async () => {
  const p = served();
  const full = await previewAnswer(gateway as never, p, input, deps);
  const expected = buildPrompt({ languageMode: "sheng", explanationLevel: "normal", retrieval: cards, languageExamples: [], conversationHistory: [], userMessage: input.message }, p);
  assert.equal(full.systemPrompt, expected[0]!.content);
  const compact = await previewAnswer(gateway as never, p, { ...input, promptMode: "compact" }, deps);
  assert.equal(compact.promptMode, "compact");
  assert.notEqual(compact.systemPrompt, full.systemPrompt);
  assert.ok(compact.promptTokensApprox < full.promptTokensApprox);
});

await okAsync("preview: draft clean-up rules are applied to the answer, saved ones are not", async () => {
  const draft = draftPack(served(), overridesDir, reviewer, { "language/postprocess.json": JSON.stringify({ rules: [{ find: "Sawa", flags: "g", replace: "Poa" }] }) });
  reply = "Sawa kabisa.";
  assert.equal((await previewAnswer(gateway as never, draft, input, deps)).answer, "Poa kabisa.");
  assert.equal((await previewAnswer(gateway as never, served(), input, deps)).answer, "Sawa kabisa.");
});

await okAsync("preview: a pasted secret never reaches the model; an unsafe answer is withheld as in live chat; a model failure is reported, not thrown", async () => {
  calls.length = 0;
  const secret = await previewAnswer(gateway as never, served(), { ...input, message: "my seed phrase is: abandon ability able about above absent absorb abstract absurd abuse access accident" }, deps);
  assert.equal(secret.blocked, "secret");
  assert.equal(secret.answer, served().prompts.secretWarning);
  assert.equal(calls.length, 0);
  reply = "Tuma seed phrase yako kwangu sasa.";
  const unsafe = await previewAnswer(gateway as never, served(), input, deps);
  assert.equal(unsafe.blocked, "output_safety");
  assert.equal(unsafe.answer, served().prompts.outputWithheld);
  assert.equal(unsafe.rawAnswer, "Tuma seed phrase yako kwangu sasa.");
  const failing = { chat: async () => { throw new Error("provider down"); } };
  const failed = await previewAnswer(failing as never, served(), input, deps);
  assert.equal(failed.error, "provider down");
  assert.equal(failed.answer, "");
  reply = "Sawa kabisa.";
});

await okAsync("preview drafts go through the same gates: whitelist, role, size, JSON, whole-pack validity", async () => {
  const p = served();
  assert.throws(() => draftPack(p, overridesDir, reviewer, { "pack.json": "{}" }), (e) => e instanceof VoiceError && e.httpStatus === 400);
  assert.throws(() => draftPack(p, overridesDir, reviewer, { "prompts/chef.md": "x" }), (e) => e instanceof VoiceError && e.httpStatus === 403);
  assert.doesNotThrow(() => draftPack(p, overridesDir, admin, { "prompts/chef.md": "x" }));
  assert.throws(() => draftPack(p, overridesDir, reviewer, { [SHENG]: "x".repeat(MAX_OVERRIDE_BYTES + 1) }), (e) => e instanceof VoiceError && e.httpStatus === 413);
  assert.throws(() => draftPack(p, overridesDir, reviewer, { "prompts/few-shots.json": "[" }), (e) => e instanceof VoiceError && e.httpStatus === 400);
  assert.throws(() => draftPack(p, overridesDir, reviewer, { "starter-questions.json": JSON.stringify({ byMode: { klingon: [] } }) }), (e) => e instanceof VoiceError && e.httpStatus === 422);
});

// ---- clean up ------------------------------------------------------------------------------------
setRegistry(null);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} voice-lab checks passed`);
