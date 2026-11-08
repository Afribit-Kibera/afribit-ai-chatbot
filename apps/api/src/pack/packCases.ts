import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_PACK_DIR, getPack } from "./active.js";
import { contrastRatio, DEFAULT_POWERED_BY_LABEL, DEFAULT_POWERED_BY_URL, pickInk, svgProblem } from "./branding.js";
import { loadPack } from "./load.js";
import os from "node:os";
import { buildCompactPrompt, buildServePrompt } from "../prompt/compactPrompt.js";
import { buildPrompt } from "../prompt/promptBuilder.js";
import { applyPostprocess } from "../prompt/postProcess.js";
import { buildAllPrompts } from "./makeSnapshot.js";

/** pnpm --filter @afribit/api test:pack */

const here = path.dirname(fileURLToPath(import.meta.url));
let passed = 0;
const ok = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

// 1. The Kibera pack reproduces the pre-pack prompts byte for byte (so pack-driven prompts changed nothing for live learners).
const snapshot = JSON.parse(fs.readFileSync(path.join(here, "kibera-prompts.snapshot.json"), "utf8")) as Record<string, unknown>;
const current = buildAllPrompts();
ok("snapshot has the expected number of prompts", () => assert.equal(Object.keys(snapshot).length, Object.keys(current).length));
for (const key of Object.keys(snapshot)) {
  ok(`kibera pack reproduces prompt "${key}"`, () => assert.deepEqual(current[key], snapshot[key]));
}

// 2. The bundled pack validates, with no errors.
ok("bundled pack is valid", () => {
  const report = loadPack(DEFAULT_PACK_DIR);
  assert.deepEqual(report.errors, []);
  assert.equal(report.pack?.id, "kibera-bitcoin");
  assert.equal(getPack().modes.length, 4);
});



ok("the Kibera pack carries its 40-question retrieval benchmark", () => {
  const r = loadPack(DEFAULT_PACK_DIR);
  assert.equal(r.pack?.eval?.cases.length, 40);
  assert.ok((r.pack?.eval?.notCovered.length ?? 0) >= 3);
});


// 2b. The wording that used to be hardcoded now lives in the pack, and the Kibera pack says exactly what the code used to.
ok("kibera pack: fixed messages are the ones learners have always seen", () => {
  const k = getPack().prompts;
  assert.match(k.secretWarning, /^I noticed this looks like it might contain a seed phrase, private key, password, or code\. I never need that information, and no legitimate Afribit support agent will ever ask for it either\./);
  assert.match(k.outputWithheld, /^Something in that draft answer didn't meet Afribit AI's safety rules/);
  assert.match(k.serviceUnavailable, /^I'm having trouble reaching the AI service right now/);
  assert.equal(k.notificationTitle, "Afribit AI");
  assert.equal(k.notificationBody, "Nimejibu swali yako. Tap urudi kwa chat.");
});
ok("kibera pack: post-processing equals the old 'Kwa hivyo' fix", () => {
  const old = (t: string) => t.replace(/Kwa hivyo,?/g, "So,").replace(/Kwa hiyo,?/g, "So,").replace(/kwa hivyo,?/g, "so,").replace(/kwa hiyo,?/g, "so,");
  for (const t of ["Kwa hivyo, kwa hiyo, kwa hivyo na Kwa hiyo bila comma. Kwa hivyo!", "Hakuna kitu hapa.", "", "Kwa hivyo,Kwa hivyo,"]) {
    assert.equal(applyPostprocess(t), old(t));
    assert.equal(applyPostprocess(t), old(t), "stateless across repeated calls");
  }
});
ok("kibera pack: search synonyms and known terms are carried by the pack", () => {
  const k = getPack();
  assert.equal(Object.keys(k.synonyms).length, 23);
  assert.deepEqual(k.synonyms["rudisha"], ["reverse", "refund"]);
  for (const w of ["kibera", "mpesa", "bitcoin", "lightning"]) assert.ok(k.knownTerms.includes(w), w);
});


ok("library pack: its own welcome wording reaches the branding, and Kibera's stays the built-in text", () => {
  const lib = loadPack(path.join(DEFAULT_PACK_DIR, "..", "example-community-library")).pack!;
  assert.equal(lib.branding.welcomeTitle, "Ask about the library.");
  assert.equal(lib.branding.composerPlaceholder, "Ask the library guide…");
  const k = getPack().branding;
  assert.equal(k.welcomeTitle, null);
  assert.equal(k.welcomeText, null);
  assert.equal(k.composerPlaceholder, null);
});

// 3. A different community's pack: nothing of Kibera or Bitcoin may leak into its prompts.
const repoPacks = path.resolve(DEFAULT_PACK_DIR, "..");
const example = loadPack(path.join(repoPacks, "example-community-library"));
ok("example pack is valid", () => {
  assert.deepEqual(example.errors, []);
  assert.equal(example.pack?.modes.length, 2);
});
const cards = [{ conceptId: "library.borrowing.limit.001", confidence: 0.9, authoritativeContent: "A member can borrow up to 3 books.", safetyWarnings: [] }] as never;
const exPack = example.pack!;
const exampleInputs = ["plain_en", "formal_en"].flatMap((languageMode) =>
  (["simple", "normal", "deep"] as const).flatMap((explanationLevel) => {
    const input = { languageMode, explanationLevel, retrieval: cards, conversationHistory: [], userMessage: "How many books?" };
    return [buildPrompt(input, exPack), buildCompactPrompt(input, exPack), buildServePrompt({ languageMode, explanationLevel, facts: "points: 3 books", conversationHistory: [], userMessage: "How many books?" }, exPack)];
  }),
);
ok("example pack prompts contain no Kibera or Bitcoin wording", () => {
  const all = JSON.stringify([exampleInputs, exPack.prompts]);
  for (const word of ["bitcoin", "kibera", "sheng", "seed phrase", "m-pesa", "lightning", "nairobi"]) {
    assert.equal(all.toLowerCase().includes(word), false, `leaked "${word}"`);
  }
  assert.match(all, /Community Library Guide/);
});
ok("example pack has an eval set", () => assert.ok((exPack.eval?.cases.length ?? 0) >= 8));
ok("example pack: no Kiswahili clean-up, no Kibera synonyms or terms, its own fixed messages", () => {
  assert.equal(applyPostprocess("Kwa hivyo, hello", exPack), "Kwa hivyo, hello");
  assert.deepEqual(exPack.synonyms, {});
  assert.deepEqual(exPack.knownTerms, []);
  assert.match(exPack.prompts.secretWarning, /Community Library Guide/);
  assert.match(exPack.prompts.outputWithheld, /Community Library Guide/);
  assert.equal(exPack.prompts.notificationTitle, "Community Library Guide");
});
ok("example pack gets no few-shot turns", () => assert.equal(buildPrompt({ languageMode: "plain_en", explanationLevel: "normal", retrieval: cards, conversationHistory: [], userMessage: "x" }, exPack).length, 2));
ok("an unknown mode falls back to the pack default instead of failing", () => {
  const a = buildPrompt({ languageMode: "klingon", explanationLevel: "normal", retrieval: cards, conversationHistory: [], userMessage: "x" }, exPack);
  const b = buildPrompt({ languageMode: exPack.defaultMode, explanationLevel: "normal", retrieval: cards, conversationHistory: [], userMessage: "x" }, exPack);
  assert.deepEqual(a, b);
});
ok("no knowledge: the pack's own not-covered wording is used", () => {
  const m = buildPrompt({ languageMode: "plain_en", explanationLevel: "normal", retrieval: [], conversationHistory: [], userMessage: "x" }, exPack);
  assert.match(String(m[0]?.content), /No approved knowledge matched/);
});

// 4. The validator reports every problem at once, in words a pack author can act on.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pack-"));
const broken = path.join(tmp, "broken");
fs.cpSync(path.join(repoPacks, "example-community-library"), broken, { recursive: true });
const manifestPath = path.join(broken, "pack.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.defaultMode = "nope";
manifest.version = "one";
manifest.modes.push({ id: "plain_en", label: "dup", description: "dup", codeSwitched: false });
fs.writeFileSync(manifestPath, JSON.stringify(manifest));
fs.writeFileSync(path.join(broken, "eval", "retrieval.json"), JSON.stringify({ cases: [{ id: "X1", query: "q", expected: ["no.such.card"] }] }));
const cardsPath = path.join(broken, "knowledge", "cards.json");
const cardData = JSON.parse(fs.readFileSync(cardsPath, "utf8"));
cardData.entries.push({ ...cardData.entries[0], status: "maybe" }, { ...cardData.entries[1], domain: "other" }, { ...cardData.entries[2], topic: "ghost" });
fs.writeFileSync(cardsPath, JSON.stringify(cardData));
fs.mkdirSync(path.join(broken, "prompts"), { recursive: true });
fs.writeFileSync(path.join(broken, "prompts", "identity.full.md"), "You are {{nme}}."+String.fromCharCode(10));
const bad = loadPack(broken);
ok("a broken pack is not valid and every problem is listed", () => {
  assert.equal(bad.ok, false);
  const text = bad.errors.join(String.fromCharCode(10));
  for (const expect of ["defaultMode", "version", 'duplicate mode "plain_en"', "appears twice", "status", "retrievalDomains", 'topic "ghost"', "{{nme}}", "no.such.card"]) {
    assert.ok(text.includes(expect), `expected an error mentioning ${expect}: ${text}`);
  }
});
ok("a missing pack folder is an error, not a crash", () => assert.equal(loadPack(path.join(tmp, "absent")).ok, false));

// 5. White-label branding (pack.json "branding"): resolved with defaults, validated, and never part of a prompt.
const LIB = path.join(repoPacks, "example-community-library");
const withManifest = (name: string, edit: (m: Record<string, unknown>, dir: string) => void): ReturnType<typeof loadPack> => {
  const dir = path.join(tmp, name);
  fs.cpSync(LIB, dir, { recursive: true });
  const file = path.join(dir, "pack.json");
  const m = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
  edit(m, dir);
  fs.writeFileSync(file, JSON.stringify(m));
  return loadPack(dir);
};
const branding = (b: Record<string, unknown>) => (m: Record<string, unknown>) => {
  m.branding = b;
};
const errorsOf = (r: ReturnType<typeof loadPack>) => r.errors.join("\n");

ok("kibera pack: it IS Afribit, so no Powered-by line, no accent and no logo (its look is unchanged)", () => {
  const b = getPack().branding;
  assert.equal(b.shortName, "Afribit AI");
  assert.equal(b.poweredBy.show, false);
  assert.equal(b.accentColor, null);
  assert.equal(b.accentInk, null);
  assert.equal(b.logo, null);
});
ok("example pack: demo branding is resolved (name, tagline, accent with its ink, an SVG logo, Powered-by on with defaults)", () => {
  const b = exPack.branding;
  assert.equal(b.shortName, "Reading Room");
  assert.ok(b.tagline);
  assert.equal(b.accentColor, "#1f6f5c");
  assert.equal(b.accentInk, "#ffffff");
  assert.ok(contrastRatio("#1f6f5c", "#ffffff") >= 4.5);
  assert.equal(b.logo?.contentType, "image/svg+xml");
  assert.ok((b.logo?.bytes.length ?? 0) > 100 && (b.logo?.bytes.length ?? 0) < 200 * 1024);
  assert.deepEqual(b.poweredBy, { show: true, label: DEFAULT_POWERED_BY_LABEL, url: DEFAULT_POWERED_BY_URL });
});
ok("a pack with no branding block gets its own name and the Powered-by line on", () => {
  const r = withManifest("nobrand", (m) => void delete m.branding);
  assert.deepEqual(r.errors, []);
  const b = r.pack!.branding;
  assert.equal(b.shortName, "Community Library Guide");
  assert.equal(b.poweredBy.show, true);
  assert.equal(b.poweredBy.label, "Powered by Afribit AI");
  assert.equal(b.logo, null);
});
ok("branding never enters a prompt: the same pack with and without it builds identical prompts", () => {
  const plain = withManifest("plain", (m) => void delete m.branding).pack!;
  const build = (p: typeof exPack) =>
    ["plain_en", "formal_en"].flatMap((languageMode) =>
      (["simple", "normal", "deep"] as const).flatMap((explanationLevel) => {
        const input = { languageMode, explanationLevel, retrieval: cards, conversationHistory: [], userMessage: "How many books?" };
        return [buildPrompt(input, p), buildCompactPrompt(input, p), buildServePrompt({ languageMode, explanationLevel, facts: "points: 3 books", conversationHistory: [], userMessage: "How many books?" }, p)];
      }),
    );
  assert.deepEqual(build(exPack), build(plain));
  assert.deepEqual(exPack.prompts, plain.prompts);
  const all = JSON.stringify([build(exPack), exPack.prompts]).toLowerCase();
  for (const word of ["reading room", "powered by", "#1f6f5c", "afribit"]) assert.equal(all.includes(word), false, `branding leaked "${word}" into a prompt`);
});
ok("the accent must reach WCAG AA (4.5:1) with white or near-black text; the ink is computed and neither-fits is refused", () => {
  assert.equal(pickInk("#1f6f5c").ink, "#ffffff");
  assert.equal(pickInk("#f7931a").ink, "#111111");
  assert.equal(pickInk("#ffffff").ink, "#111111");
  assert.equal(pickInk("#000000").ink, "#ffffff");
  assert.equal(pickInk("#777777").ink, null);
  assert.ok(Math.abs(contrastRatio("#000000", "#ffffff") - 21) < 0.01);
  const r = withManifest("grey", branding({ shortName: "X", accentColor: "#777777" }));
  assert.match(errorsOf(r), /accentColor #777777 is too close to mid-grey.*white text would be 4\.\d:1 and near-black 4\.\d:1.*4\.5:1/);
  const ok2 = withManifest("orange", branding({ shortName: "X", accentColor: "#F7931A" }));
  assert.deepEqual(ok2.errors, []);
  assert.equal(ok2.pack!.branding.accentColor, "#f7931a");
  assert.equal(ok2.pack!.branding.accentInk, "#111111");
});
ok("branding text, colour, logo path and powered-by settings are validated with clear errors", () => {
  const cases: [string, unknown, RegExp][] = [
    ["no shortName", { tagline: "x" }, /branding\.shortName is required/],
    ["long shortName", { shortName: "x".repeat(25) }, /shortName is 25 characters; the limit is 24/],
    ["long tagline", { shortName: "X", tagline: "t".repeat(121) }, /tagline is 121 characters; the limit is 120/],
    ["bad accent", { shortName: "X", accentColor: "green" }, /accentColor must look like "#1a7f5a"/],
    ["short accent", { shortName: "X", accentColor: "#fff" }, /accentColor must look like/],
    ["logo outside brand/", { shortName: "X", logo: "logo.svg" }, /branding\.logo must be a file inside/],
    ["logo traversal", { shortName: "X", logo: "brand/../pack.json" }, /branding\.logo must be a file inside/],
    ["logo traversal 2", { shortName: "X", logo: "../brand/logo.svg" }, /branding\.logo must be a file inside/],
    ["logo extension", { shortName: "X", logo: "brand/logo.gif" }, /branding\.logo must be a file inside/],
    ["logo missing", { shortName: "X", logo: "brand/none.svg" }, /brand\/none\.svg, which does not exist/],
    ["show not boolean", { shortName: "X", poweredBy: { show: "yes" } }, /poweredBy\.show must be true or false/],
    ["label too long", { shortName: "X", poweredBy: { label: "l".repeat(61) } }, /poweredBy\.label must be a text of 1 to 60/],
    ["http url", { shortName: "X", poweredBy: { url: "http://example.org" } }, /poweredBy\.url must be an https/],
    ["javascript url", { shortName: "X", poweredBy: { url: "javascript:alert(1)" } }, /poweredBy\.url must be an https/],
    ["url with password", { shortName: "X", poweredBy: { url: "https://a:b@example.org" } }, /poweredBy\.url must be an https/],
    ["not an object", "nope", /"branding" must be an object/],
  ];
  for (const [label, b, expect] of cases) {
    const r = withManifest("bad-" + label.replace(/\W+/g, "-"), (m) => void (m.branding = b));
    assert.equal(r.ok, false, label);
    assert.match(errorsOf(r), expect, label);
  }
  const typo = withManifest("typo", branding({ shortName: "X", accent: "#000000" }));
  assert.equal(typo.ok, true);
  assert.ok(typo.warnings.some((w) => w.includes("branding.accent is not a known setting")));
});
ok("logo files: SVG with script, handlers, foreignObject, external references or entities is refused; so are oversize and fake images", () => {
  const svg = (inner: string, attrs = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"${attrs}>${inner}</svg>`;
  const bad: [string, string, RegExp][] = [
    ["script", svg("<script>alert(1)</script>"), /<script>/],
    ["script upper", svg("<SCRIPT src=x></SCRIPT>"), /<script>/],
    ["onload", svg("<rect/>", ' onload="x()"'), /event-handler/],
    ["onclick", svg('<rect onclick="x()"/>'), /event-handler/],
    ["foreignObject", svg("<foreignObject><p>hi</p></foreignObject>"), /foreignObject/],
    ["iframe", svg("<iframe src='x'></iframe>"), /embeds another document/],
    ["external href", svg('<image href="https://evil.example/x.png"/>'), /external address/],
    ["external xlink", svg('<use xlink:href="other.svg#a"/>'), /external address/],
    ["data href", svg('<image href="data:image/png;base64,AAAA"/>'), /external address/],
    ["external url()", svg('<rect fill="url(https://evil.example/p)"/>'), /external address/],
    ["css import", svg("<style>@import 'x.css';</style>"), /@import/],
    ["javascript:", svg('<a href="#a" data-x="javascript:alert(1)"/>'), /javascript/],
    ["entity", `<!DOCTYPE svg [<!ENTITY x "y">]>` + svg("<text>&x;</text>"), /entities/],
    ["not svg", "<html></html>", /does not look like an SVG/],
  ];
  for (const [label, text, expect] of bad) assert.match(String(svgProblem(text)), expect, label);
  assert.equal(svgProblem(svg('<defs><linearGradient id="g"><stop offset="0"/></linearGradient></defs><rect fill="url(#g)"/><use href="#g"/>')), null);
  assert.equal(svgProblem(fs.readFileSync(path.join(LIB, "brand", "logo.svg"), "utf8")), null);
  const viaFile = (name: string, rel: string, content: string | Buffer) =>
    withManifest(name, (m, dir) => {
      fs.writeFileSync(path.join(dir, ...rel.split("/")), content);
      m.branding = { shortName: "X", logo: rel };
    });
  assert.match(errorsOf(viaFile("evil-svg", "brand/logo.svg", svg("<script>1</script>"))), /brand\/logo\.svg: not accepted as a logo: it contains a <script>/);
  assert.match(errorsOf(viaFile("big", "brand/logo.png", Buffer.alloc(201 * 1024))), /201 KB; the limit is 200 KB/);
  assert.match(errorsOf(viaFile("fakepng", "brand/logo.png", Buffer.from("not a png at all, just text"))), /not really a \.png/);
  assert.match(errorsOf(viaFile("fakewebp", "brand/logo.webp", Buffer.from("RIFFxxxxWEBX0000"))), /not really a \.webp/);
  assert.match(errorsOf(viaFile("empty", "brand/logo.svg", "")), /empty/);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
  const good = viaFile("goodpng", "brand/mark.png", png);
  assert.deepEqual(good.errors, []);
  assert.equal(good.pack!.branding.logo?.contentType, "image/png");
});

fs.rmSync(tmp, { recursive: true, force: true });

console.log(`pack: ${passed} checks passed`);
