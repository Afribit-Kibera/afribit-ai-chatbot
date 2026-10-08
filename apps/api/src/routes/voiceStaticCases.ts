import assert from "node:assert/strict";
import path from "node:path";
import Fastify from "fastify";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { DEFAULT_PACK_DIR, setActivePack } from "../pack/active.js";
import { loadPack } from "../pack/load.js";
import { registerVoiceRoutes } from "./voice.js";

// The static frontend must keep the strict CSP and never turn the asset route into arbitrary file access.
// No database queries or model requests are made by these checks.
const original = process.env.COMMUNITY_PACK_OVERRIDES_DIR;
const report = loadPack(DEFAULT_PACK_DIR);
assert.ok(report.ok && report.pack);
setActivePack(report.pack);
process.env.COMMUNITY_PACK_OVERRIDES_DIR = path.resolve(".voice-static-fixture");
const app = Fastify();
app.decorate("requireReviewer", async () => { throw new Error("Static assets must not query an account."); });
app.decorate("requireAdmin", async () => { throw new Error("Static assets must not query an account."); });
registerVoiceRoutes(app, {} as AfribitAIGateway);
try {
  const page = await app.inject("/voice");
  assert.equal(page.statusCode, 200);
  const alternate = await app.inject("/voice/");
  assert.equal(alternate.statusCode, 200);
  assert.equal(alternate.body, page.body);
  assert.ok(!page.body.includes("{{PACK_NAME}}"));
  assert.match(page.headers["content-security-policy"] as string, /font-src 'self'/);
  assert.ok(!(page.headers["content-security-policy"] as string).includes("unsafe-inline"));
  const js = page.body.match(/src="(\/voice\/assets\/[^"<>]+\.js)"/)?.[1];
  const css = page.body.match(/href="(\/voice\/assets\/[^"<>]+\.css)"/)?.[1];
  const icon = page.body.match(/rel="icon"[^>]*href="(\/voice\/assets\/[^"<>]+\.png)"/)?.[1];
  assert.ok(js && css, "Run build:voice before testing the compiled frontend.");
  assert.ok(icon, "The tab icon must use the bundled Afribit mark.");
  const mark = await app.inject(icon);
  assert.equal(mark.statusCode, 200); assert.equal(mark.headers["content-type"], "image/png");
  const script = await app.inject(js);
  assert.equal(script.statusCode, 200); assert.match(script.headers["content-type"] as string, /javascript/);
  assert.match(script.headers["cache-control"] as string, /immutable/);
  const stylesheet = await app.inject(css);
  assert.equal(stylesheet.statusCode, 200); assert.match(stylesheet.headers["content-type"] as string, /text\/css/);
  const font = stylesheet.body.match(/(?:\.\/)?([a-z0-9_-]+\.woff2)/i)?.[1];
  assert.ok(font, "The brand fonts must be bundled and self-hosted.");
  const face = await app.inject(`/voice/assets/${font}`);
  assert.equal(face.statusCode, 200); assert.equal(face.headers["content-type"], "font/woff2");
  assert.ok(face.rawPayload.length > 1000);
  for (const url of ["/voice/assets/missing.js", "/voice/assets/%2e%2e%2fstyle.css", "/voice/assets/%2e%2e%5cstyle.css", "/voice/assets/package.json"])
    assert.equal((await app.inject(url)).statusCode, 404);
  console.log("Voice Lab HTML, JS, CSS, fonts, CSP, cache policy and path rejection passed.");
} finally { await app.close(); }
delete process.env.COMMUNITY_PACK_OVERRIDES_DIR;
const disabled = Fastify(); registerVoiceRoutes(disabled, {} as AfribitAIGateway);
try {
  assert.equal((await disabled.inject("/voice")).statusCode, 404);
  assert.equal((await disabled.inject("/voice/")).statusCode, 404);
  console.log("Voice Lab assets stay unavailable when the feature is off.");
}
finally {
  await disabled.close(); setActivePack(null);
  if (original === undefined) delete process.env.COMMUNITY_PACK_OVERRIDES_DIR;
  else process.env.COMMUNITY_PACK_OVERRIDES_DIR = original;
}
