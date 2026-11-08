import http from "node:http";
import type { AddressInfo } from "node:net";
import type { InferenceProvider } from "@afribit/shared";

/**
 * Regression suite for the community-node provider. No database, no model, no
 * network beyond localhost: it stands up mock Ollama and OpenAI-style servers
 * and drives the real LocalProvider against them.
 *
 * Env is read at import time, so everything below is configured before the
 * dynamic imports.
 *
 * Run with: pnpm --filter @afribit/api test:local-provider
 */

type Handler = (req: http.IncomingMessage, body: any, res: http.ServerResponse) => void;
let handler: Handler = () => {};
const seen: { url?: string; body?: any; auth?: string }[] = [];

const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf-8");
    const body = raw ? JSON.parse(raw) : undefined;
    seen.push({ url: req.url, body, auth: req.headers.authorization });
    handler(req, body, res);
  });
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const port = (server.address() as AddressInfo).port;

process.env.LOCAL_LLM_BASE_URL = `http://127.0.0.1:${port}/`; // trailing slash must be tolerated
process.env.LOCAL_LLM_API = "ollama";
process.env.LOCAL_LLM_NUM_CTX = "8192";
process.env.INFERENCE_MODE = "node";

const { LocalProvider } = await import("./localProvider.js");
const { env } = await import("../config/env.js");
const { getModelProfile } = await import("../config/modelProfiles.js");

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name} ${detail}`);
  }
};

const request = {
  requestId: "t1",
  messages: [
    { role: "system" as const, content: "sys" },
    { role: "user" as const, content: "hi" },
  ],
  languageMode: "sheng" as const,
  explanationLevel: "normal" as const,
  modelProfile: "node_chat",
  maxOutputTokens: 321,
  temperature: 0.3,
  privacyProfile: "strict" as const,
};

const provider = new LocalProvider();

console.log("Configuration:");
check("base URL trailing slash stripped", env.localLlmBaseUrl === `http://127.0.0.1:${port}`);
check("node mode disables cloud embeddings", env.cloudEmbeddingsAllowed === false);
check("node_chat has a generous timeout and no cloud fallback", getModelProfile("node_chat").timeoutMs === 300000 && getModelProfile("node_chat").fallbackProfile === null);
check("hybrid profile falls back to the hosted model", getModelProfile("node_chat_cloud_fallback").fallbackProfile === "default_chat");
check("the main hosted profile allows 30 s (a 5,700-token Sheng prompt takes 7-12 s; 15 s handed answers to a weaker backup)", getModelProfile("default_chat").timeoutMs === 30000);
check("the hosted backup keeps the default timeout", getModelProfile("fallback_chat").timeoutMs === undefined);

console.log("\nOllama native API:");
handler = (_req, _body, res) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ model: "gemma3:12b", message: { content: "Habari" }, done: true, done_reason: "stop", prompt_eval_count: 5400, eval_count: 40 }));
};
let r = await provider.chat(request);
check("returns content, model and provider", r.content === "Habari" && r.model === "gemma3:12b" && r.provider === "local");
check("maps token usage", r.usage.promptTokens === 5400 && r.usage.completionTokens === 40 && r.usage.totalTokens === 5440);
check("local inference costs nothing", r.estimatedCostUsd === 0);
let sent = seen.at(-1)!;
check("posts to /api/chat", sent.url === "/api/chat");
check("sets the context window (Ollama truncates silently otherwise)", sent.body.options.num_ctx === 8192);
check("passes max tokens and temperature", sent.body.options.num_predict === 321 && sent.body.options.temperature === 0.3);
check("disables thinking by default", sent.body.think === false);
check("uses the profile's model", sent.body.model === "gemma3:12b");
check("omits num_gpu unless configured (Ollama decides)", sent.body.options.num_gpu === undefined);
(env as unknown as Record<string, unknown>).localLlmNumGpu = 10;
await provider.chat(request);
check("LOCAL_LLM_NUM_GPU caps GPU layers", seen.at(-1)!.body.options.num_gpu === 10);
(env as unknown as Record<string, unknown>).localLlmNumGpu = 0;
await provider.chat(request);
check("LOCAL_LLM_NUM_GPU=0 means CPU-only (zero is honoured)", seen.at(-1)!.body.options.num_gpu === 0);
(env as unknown as Record<string, unknown>).localLlmNumGpu = undefined;

handler = (_req, _body, res) => res.end(JSON.stringify({ message: { content: "x" }, done: true, done_reason: "length" }));
r = await provider.chat(request);
check("maps done_reason length", r.finishReason === "length");

handler = (_req, _body, res) => {
  res.statusCode = 500;
  res.end("boom");
};
await provider.chat(request).then(
  () => check("HTTP error throws", false),
  (e) => check("HTTP error throws with status", /500/.test(String(e))),
);
handler = (_req, _body, res) => res.end(JSON.stringify({ error: "model not found" }));
await provider.chat(request).then(
  () => check("Ollama error body throws", false),
  (e) => check("Ollama error body throws", /model not found/.test(String(e))),
);
handler = (_req, _body, res) => res.end(JSON.stringify({ message: { content: "" }, done: true }));
await provider.chat(request).then(
  () => check("empty content throws (so the gateway can fall back)", false),
  () => check("empty content throws (so the gateway can fall back)", true),
);

console.log("\nOllama streaming:");
handler = (_req, _body, res) => {
  res.setHeader("content-type", "application/x-ndjson");
  res.write(JSON.stringify({ message: { content: "Ha" }, done: false }) + "\n");
  res.write(JSON.stringify({ message: { content: "bari" }, done: false }) + "\n");
  res.end(JSON.stringify({ message: { content: "" }, done: true, done_reason: "stop", prompt_eval_count: 10, eval_count: 2 }) + "\n");
};
let deltas: string[] = [];
let gen = provider.chatStream(request);
let step = await gen.next();
while (!step.done) {
  deltas.push(step.value);
  step = await gen.next();
}
check("yields deltas in order", deltas.join("|") === "Ha|bari");
check("final response has full content and usage", step.value.content === "Habari" && step.value.usage.totalTokens === 12);
check("stream request set stream:true", seen.at(-1)!.body.stream === true);

console.log("\nOpenAI-compatible API (vLLM, llama.cpp, Open WebUI):");
// The provider reads `env` at call time, so flip the flavour on the live object.
const mutable = env as unknown as Record<string, unknown>;
mutable.localLlmApi = "openai";
mutable.localLlmApiKey = "node-secret";
mutable.localLlmModel = "my-custom-model";
const openai = provider;
handler = (_req, _body, res) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ model: "my-custom-model", choices: [{ message: { content: "Sawa" }, finish_reason: "stop" }], usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 } }));
};
r = await openai.chat(request);
sent = seen.at(-1)!;
check("posts to /v1/chat/completions", sent.url === "/v1/chat/completions");
check("sends bearer key when configured", sent.auth === "Bearer node-secret");
check("LOCAL_LLM_MODEL overrides the profile model", sent.body.model === "my-custom-model");
check("returns content and usage", r.content === "Sawa" && r.usage.totalTokens === 10);

handler = (_req, _body, res) => {
  res.setHeader("content-type", "text/event-stream");
  res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "Sa" } }] })}\n\n`);
  res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "wa" }, finish_reason: "stop" }] })}\n\n`);
  res.end("data: [DONE]\n\n");
};
deltas = [];
gen = openai.chatStream(request);
step = await gen.next();
while (!step.done) {
  deltas.push(step.value);
  step = await gen.next();
}
check("SSE stream yields deltas", deltas.join("|") === "Sa|wa" && step.value.content === "Sawa");

console.log("\nPersonal-context routing and redirects:");
const privateRequest = { ...request, contextPrivacy: "personal-local-only" as const };
for (const api of ["ollama","openai"]) {
  mutable.localLlmApi=api;
  handler=(_req,_body,res)=>{res.statusCode=307;res.setHeader("location",`http://127.0.0.1:${port}/redirect-target`);res.end();};
  let before=seen.length;
  await provider.chat(privateRequest).then(()=>check(`${api} private chat rejects redirects`,false),()=>check(`${api} private chat rejects redirects`,seen.length===before+1));
  before=seen.length;
  await provider.chatStream(privateRequest).next().then(()=>check(`${api} private stream rejects redirects`,false),()=>check(`${api} private stream rejects redirects`,seen.length===before+1));
}
const { AfribitAIGateway } = await import("../gateway/gateway.js");
const { OpenRouterProvider } = await import("./openRouterProvider.js");
let remoteCalls=0;
const outside={...provider,name:"openrouter",async chat(){remoteCalls++;throw new Error("Remote trap");},async *chatStream(){remoteCalls++;throw new Error("Remote trap");},health:()=>provider.health(),capabilities:()=>provider.capabilities()};
const routed=new AfribitAIGateway(new Map<string,InferenceProvider>([["local",provider],["openrouter",outside]]));
handler=(_req,_body,res)=>{res.statusCode=503;res.end("Synthetic local failure");};
const fallbackRequest={...privateRequest,modelProfile:"node_chat_cloud_fallback"};
await routed.chat(fallbackRequest).then(()=>check("private fallback must fail closed",false),()=>check("private fallback never reaches outside provider",remoteCalls===0));
await routed.chatStream(fallbackRequest).next().then(()=>check("private stream fallback must fail closed",false),()=>check("private stream fallback never reaches outside provider",remoteCalls===0));
await routed.chat({...privateRequest,modelProfile:"default_chat"}).then(()=>check("private primary remote must fail closed",false),()=>check("private primary remote never reaches provider",remoteCalls===0));
const outsideProvider=new OpenRouterProvider();
await outsideProvider.chat({...privateRequest,modelProfile:"default_chat"}).then(()=>check("outside direct call fails closed",false),(e:Error)=>check("outside direct call rejects privacy before credentials/network",e.message.includes("Local-only")));
mutable.localLlmBaseUrl="https://remote.example.invalid";
await provider.chat(privateRequest).then(()=>check("remote node rejects private notes",false),(e:Error)=>check("remote node rejects private notes before network",e.message.includes("Local-only")));
mutable.localLlmBaseUrl=`http://127.0.0.1:${port}`;

console.log("\nHealth:");
handler = (_req, _body, res) => res.end("{}");
check("healthy when the server answers", (await openai.health()).healthy === true);
server.close();
check("unhealthy when the server is down", (await openai.health()).healthy === false);

console.log(`\n${failures === 0 ? "All local-provider checks pass." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
