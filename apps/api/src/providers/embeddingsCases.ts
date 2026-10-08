import http from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Checks for the embeddings providers. No database or model: a mock Ollama / OpenAI-style server
 * stands in for the node's model server.
 *
 * What they protect: on a community node semantic search must run on the node's OWN embeddings
 * (nothing sent to a hosted API), vectors must be stored and compared per model, and a hosted
 * provider must stay off in node mode unless explicitly allowed.
 *
 * Run with: pnpm --filter @afribit/api test:embeddings
 */

type Seen = { url?: string; body?: any; auth?: string };
const seen: Seen[] = [];
let handler: (req: http.IncomingMessage, body: any, res: http.ServerResponse) => void = () => {};

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

process.env.INFERENCE_MODE = "node";
process.env.LOCAL_LLM_BASE_URL = `http://127.0.0.1:${port}`;
process.env.LOCAL_LLM_API = "ollama";

const { env } = await import("../config/env.js");
const { activeEmbeddingModel, embedDocuments, embedQuery, semanticSearchEnabled } = await import("./embeddings.js");
const { embedLocalTexts } = await import("./localEmbeddings.js");
const mutable = env as unknown as Record<string, unknown>;

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name} ${detail}`);
  }
};

// A fake model: the vector for a text is [length, 1, 0] so order is checkable.
const vec = (t: string) => [t.length, 1, 0];
const ollamaHandler: typeof handler = (_req, body, res) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ embeddings: (body.input as string[]).map(vec) }));
};
const openAIHandler: typeof handler = (_req, body, res) => {
  res.setHeader("content-type", "application/json");
  // Deliberately out of order: the provider must sort by `index`.
  const data = (body.input as string[]).map((t, index) => ({ index, embedding: vec(t) })).reverse();
  res.end(JSON.stringify({ data }));
};

console.log("Settings follow the inference mode:");
check("node mode defaults to the LOCAL embedding provider", env.embeddingProvider === "local");
check("default local model is bge-m3", env.localEmbeddingModel === "bge-m3");
check("embeddings run on the CPU by default (the GPU is for the chat model)", env.localEmbeddingNumGpu === 0);
check("the stored model id marks vectors as local", activeEmbeddingModel() === "local:bge-m3");
check("local semantic search is on even though cloud embeddings are not allowed", env.cloudEmbeddingsAllowed === false && semanticSearchEnabled() === true);

mutable.embeddingProvider = "openrouter";
check("a hosted provider in node mode stays OFF unless explicitly allowed", semanticSearchEnabled() === false);
check("hosted vectors are stored under the hosted model's own id", activeEmbeddingModel() === env.embeddingModel);
mutable.cloudEmbeddingsAllowed = true;
check("explicit opt-in turns hosted semantic search back on", semanticSearchEnabled() === true);
mutable.cloudEmbeddingsAllowed = false;
mutable.embeddingProvider = "local";

console.log("\nOllama native /api/embed:");
handler = ollamaHandler;
let v = await embedLocalTexts(["abc", "hello world"]);
check("returns one vector per input, in order", v.length === 2 && v[0]![0] === 3 && v[1]![0] === 11);
let s = seen.at(-1)!;
check("posts to /api/embed with the model and the inputs", s.url === "/api/embed" && s.body.model === "bge-m3" && s.body.input.length === 2);
check("asks Ollama to embed on the CPU", s.body.options.num_gpu === 0);
seen.length = 0;
v = await embedLocalTexts(Array.from({ length: 20 }, (_, i) => "x".repeat(i + 1)));
check("20 texts are sent as 2 batches of at most 16", seen.length === 2 && seen[0]!.body.input.length === 16 && seen[1]!.body.input.length === 4);
check("batched results stay in the original order", v.length === 20 && v[0]![0] === 1 && v[19]![0] === 20);

console.log("\nOpenAI-compatible /v1/embeddings (llama.cpp, vLLM):");
mutable.localLlmApi = "openai";
mutable.localLlmApiKey = "node-secret";
handler = openAIHandler;
v = await embedLocalTexts(["a", "bb", "ccc"]);
s = seen.at(-1)!;
check("posts to /v1/embeddings with the bearer key", s.url === "/v1/embeddings" && s.auth === "Bearer node-secret");
check("sorts the server's reply by index", v.map((x) => x[0]).join() === "1,2,3");
mutable.localLlmApi = "ollama";
mutable.localLlmApiKey = "";

console.log("\nFailures are loud, not silent:");
handler = (_r, _b, res) => ((res.statusCode = 503), res.end("model loading"));
await embedLocalTexts(["x"]).then(() => check("HTTP error throws", false), (e) => check("HTTP error throws with the status", /503/.test(String(e))));
handler = (_r, _b, res) => res.end(JSON.stringify({ embeddings: [[1, 2]] }));
await embedLocalTexts(["x", "y"]).then(() => check("count mismatch throws", false), (e) => check("a short reply (1 vector for 2 inputs) throws", /1 vectors for 2/.test(String(e))));
handler = (_r, _b, res) => res.end(JSON.stringify({ embeddings: [[]] }));
await embedLocalTexts(["x"]).then(() => check("empty vector throws", false), () => check("an empty vector throws", true));
handler = (_r, _b, res) => res.end(JSON.stringify({ error: "model not found" }));
await embedLocalTexts(["x"]).then(() => check("error body throws", false), (e) => check("an Ollama error body throws", /model not found/.test(String(e))));

console.log("\nTask prefixes (some models want them; bge-m3 needs none):");
handler = ollamaHandler;
seen.length = 0;
await embedQuery("fee ni nini?");
check("no prefix by default", seen[0]!.body.input[0] === "fee ni nini?");
mutable.embeddingQueryPrefix = "query: ";
mutable.embeddingDocPrefix = "passage: ";
seen.length = 0;
await embedQuery("fee ni nini?");
await embedDocuments(["Fees are paid by the sender."]);
check("a question gets the query prefix", seen[0]!.body.input[0] === "query: fee ni nini?");
check("a card gets the document prefix", seen[1]!.body.input[0] === "passage: Fees are paid by the sender.");
mutable.embeddingQueryPrefix = "";
mutable.embeddingDocPrefix = "";

server.close();
console.log(`\n${failures === 0 ? "All embeddings checks pass." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
