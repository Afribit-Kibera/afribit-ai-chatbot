import assert from "node:assert/strict";
import type { AfribitChatRequest, AfribitChatResponse, InferenceProvider } from "@afribit/shared";
import { AfribitAIGateway, type UsageEvent } from "../gateway/gateway.js";

/** pnpm --filter @afribit/api test:meter -- the gateway records every model call and never lets metering break one. */

let passed = 0;
const ok = (name: string, cond: boolean) => {
  assert.ok(cond, name);
  passed++;
  console.log(`  ok  ${name}`);
};

const request = (profile: string): AfribitChatRequest => ({
  requestId: "11111111-1111-1111-1111-111111111111", messages: [{ role: "user", content: "hi" }], languageMode: "plain_en",
  explanationLevel: "simple", modelProfile: profile, maxOutputTokens: 50, temperature: 0, privacyProfile: "strict",
});
const response = (provider: string): AfribitChatResponse => ({
  requestId: "x", content: "hello", provider, model: "m-1", usage: { promptTokens: 10, completionTokens: 4, totalTokens: 14 },
  latencyMs: 25, finishReason: "stop", estimatedCostUsd: 0.001,
});
const provider = (name: string, behaviour: "ok" | "fail"): InferenceProvider => ({
  name,
  async chat() { if (behaviour === "fail") throw new Error("boom"); return response(name); },
  async *chatStream() { if (behaviour === "fail") throw new Error("stream boom"); yield "he"; yield "llo"; return response(name); },
  async health() { return { healthy: true, checkedAt: "" }; },
  capabilities() { return { streaming: true, maxContextTokens: 1000, supportsJsonMode: false, zdrSupported: false }; },
});

// default_chat has no fallback in some configs; use a profile known to exist.
const profile = "default_chat";
const events: UsageEvent[] = [];

const good = new AfribitAIGateway(new Map([["openrouter", provider("openrouter", "ok")], ["local", provider("local", "ok")]]));
good.setMeter(async (e) => { events.push(e); });
await good.chat(request(profile));
ok("a successful call is recorded with tokens, model and cost", events.length === 1 && events[0]?.status === "ok" && events[0].promptTokens === 10 && events[0].model === "m-1" && events[0].estimatedCostUsd === 0.001);

events.length = 0;
const gen = good.chatStream(request(profile));
let step = await gen.next();
while (!step.done) step = await gen.next();
ok("a streamed call is recorded once, when it finishes", events.length === 1 && events[0]?.completionTokens === 4);

events.length = 0;
const bad = new AfribitAIGateway(new Map([["openrouter", provider("openrouter", "fail")], ["local", provider("local", "fail")]]));
bad.setMeter(async (e) => { events.push(e); });
let threw = false;
try { await bad.chat(request(profile)); } catch { threw = true; }
ok("failures are recorded and still throw", threw && events.length >= 1 && events.every((e) => e.status === "error" && e.errorMessage === "boom"));

events.length = 0;
let current = "pack-a";
good.setScope(() => current);
await good.chat(request(profile));
current = "pack-b";
await good.chat(request(profile));
ok("each recorded call carries the pack in scope when it ran", events.length === 2 && events[0]?.packId === "pack-a" && events[1]?.packId === "pack-b");
good.setScope(null);
events.length = 0;
await good.chat(request(profile));
ok("without a scope the pack is null", events[0]?.packId === null);

const broken = new AfribitAIGateway(new Map([["openrouter", provider("openrouter", "ok")], ["local", provider("local", "ok")]]));
broken.setMeter(async () => { throw new Error("db down"); });
const r = await broken.chat(request(profile));
ok("a failing meter never breaks the answer", r.content === "hello");

const unmetered = new AfribitAIGateway(new Map([["openrouter", provider("openrouter", "ok")], ["local", provider("local", "ok")]]));
ok("no meter installed: calls work as before", (await unmetered.chat(request(profile))).content === "hello");

console.log(`meter: ${passed} checks passed`);
