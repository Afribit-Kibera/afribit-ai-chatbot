import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import Fastify from "fastify";
import type { InferenceProvider, ModelProfile } from "@afribit/shared";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { authPlugin } from "../auth/plugin.js";
import { registerPackRoutes } from "../routes/pack.js";
import { registerCommunityGuard } from "../community/guard.js";
import { communityStore } from "../community/store.js";
import { registerChatRoutes } from "../routes/chat.js";
import { registerMemoryRoutes } from "../routes/memory.js";
import { DEFAULT_PACK_DIR, getRegistry, setRegistry } from "../pack/active.js";
import { loadPack } from "../pack/load.js";
import { buildRegistry } from "../pack/registry.js";
import type { CommunityPack } from "../pack/types.js";
import { memoryStore } from "../memory/store.js";
import { AfribitAIGateway } from "../gateway/gateway.js";
import { LocalProvider } from "../providers/localProvider.js";
import { OpenRouterProvider } from "../providers/openRouterProvider.js";
import { withModelProfiles } from "../config/modelProfiles.js";
import { withIsolatedComputePolicy } from "../compute/admission.js";
import { validateComputePolicy, type ComputeRoute } from "../compute/policy.js";
import { ExperimentLedger } from "./ledger.js";
import { hash } from "./protocol.js";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";
import { revisionIdentity, REPOSITORY_ROOT } from "./revision.js";
import { runCommunityRentalRehearsal } from "./communityRentalRehearsal.js";
import type { CommunityLiveConnector } from "./communityLiveSubset.js";
import { pathToFileURL } from "node:url";

const MODEL = "google/gemma-3-27b-it";
const HOST = "https://openrouter.ai/api/v1";
const PRIOR_ALLOWANCES = 1_485_000; // Earlier USD1.46 + two failed attempts USD.01 + diagnostics USD.015.
const UPSTREAM = "parasail/fp8";
const REQUEST_ALLOWANCE = 5000;
const QUERY = "When is the fictional ledgerdesk open, and what does a session cost? ledgerdesk";
let stage = "arguments";
interface Trace { side: "local-fixture" | "remote-fixture" | "hosted"; messages: { role: string; content: string }[] }

/** A synthetic operator CLI. It never connects the configured pg pool to its configured database. */
export async function runCommunityHarness(trial: TrialRecord, hosted: boolean, rentalRehearsal = false, live?:CommunityLiveConnector) {
  if(live && (hosted || !rentalRehearsal))throw new Error("Live connector requires the rental rehearsal path");
  const originalEnv = { ...env }, originalRegistry = getRegistry();
  const originalPool = { query: pool.query, connect: pool.connect };
  const originalFetch = globalThis.fetch;
  const revision = revisionIdentity(); trial.event("revision", revision);
  const dir = join(REPOSITORY_ROOT, "output/community-harness", trial.id); mkdirSync(dir, { recursive: true });
  const save = (name: string, value: unknown) => writeFileSync(join(dir, name), JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  const db = new PGlite({ extensions: { pgcrypto } });
  const app = Fastify({ logger: false });
  const traces: Trace[] = [], checks: { name: string; passed: boolean; ms: number }[] = [];
  const sessions = new Map<string, string>();
  const usage: { cost: number | null; model: string | null; status: string }[] = [];
  const apiMeasurements: {member:string;status:number;elapsedMs:number;messageId:string|null;sessionId:string|null;answerSource:string|null}[]=[];
  let localStatus = 200, remoteEnabled = false, hostedDispatches = 0, deniedEgress = 0, retrievalQueries = 0;
  let ledger: ExperimentLedger | undefined, hostedLedger: ExperimentLedger | undefined;
  let fixturesClosed = false, appClosed = false, dbClosed = false;
  const fixtures = ["local-fixture", "remote-fixture"].map(side => http.createServer(async (request, response) => {
    const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk));
    if (!request.url?.endsWith("/chat/completions")) { response.writeHead(404).end(); return; }
    const body = JSON.parse(Buffer.concat(chunks).toString());
    traces.push({ side: side as Trace["side"], messages: body.messages });
    if (body.messages.some((message: {role:string}, i: number) => i > 0 && message.role === "user" && body.messages[i-1].role === "user")) {
      response.writeHead(400).end("Synthetic strict chat template rejects adjacent user turns"); return;
    }
    if (side === "local-fixture" && localStatus !== 200) { response.writeHead(localStatus).end("Synthetic fixture unavailable"); return; }
    const content = "Synthetic transport fixture answer; no language quality is measured.";
    const sample = { model: "harness-fixture", choices: [{ message: { content }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2, cost: 0 } };
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(sample));
  }));
  try {
    stage = "migrations";
    for (const filename of readdirSync(join(REPOSITORY_ROOT, "db/migrations")).filter(f => f.endsWith(".sql")).sort()) {
      await db.exec(readFileSync(join(REPOSITORY_ROOT, "db/migrations", filename), "utf8")
        .replace(/CREATE EXTENSION IF NOT EXISTS vector;/g, "")
        .replace(/CREATE INDEX idx_knowledge_embeddings_ivfflat[\s\S]*?WITH \(lists = 100\);/g, "")
        .replace(/\bvector\(\d+\)/g, "real[]").replace(/embedding vector NOT NULL/g, "embedding real[] NOT NULL")
        .replace(/vector_dims\(embedding\)/g, "array_length(embedding, 1)"));
    }
    const query = async (sql: string, values: unknown[] = []) => {
      if (/FROM (knowledge_entries|language_entries)\b/.test(sql)) retrievalQueries++;
      const result = await db.query(sql, values); return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
    };
    Object.assign(pool, { query, connect: async () => ({ query, release() {} }) });
    stage = "registry";
    const loaded = loadPack(DEFAULT_PACK_DIR); assert.ok(loaded.ok && loaded.pack, "Bundled public pack must validate");
    const base = loaded.pack;
    const packs: CommunityPack[] = ["a", "b"].map(letter => ({ ...base, id: `harness-${letter}`, name: `Synthetic community ${letter}`,
      domain: { ...base.domain, id: `harness-${letter}`, retrievalDomains: [`harness-${letter}`] }, knowledge: { topics: [], entries: [] },
      modes: base.modes.map(mode => ({ ...mode, policyFull: `${mode.policyFull}\nSYNTHETIC-LANGUAGE-${letter.toUpperCase()}: prefer concise answers; never invent local expressions.` })) }));
    const registry = buildRegistry(packs, packs[0]!.id); assert.ok(registry.registry, "Synthetic registry must validate"); setRegistry(registry.registry);
    const members = packs.flatMap((pack, i) => [1, 2].map(n => ({ pack, id: `63000000-0000-4000-8000-0000000000${i}${n}`, marker: `${i === 0 ? "A" : "B"}${n}` })));
    for (const pack of packs) {
      const letter = pack.id.endsWith("a") ? "A" : "B";
      await db.query(`INSERT INTO community_access_policies (pack_id,members_only) VALUES ($1,true)`, [pack.id]);
      await db.query(`INSERT INTO knowledge_entries (id,title,domain,canonical_answer,beginner_answer,status,community_pack_id)
        VALUES ($1,'ledgerdesk',$2,$3,$3,'approved',$2),($4,'ledgerdesk',$2,$5,$5,'draft',$2)`,
        [`${pack.id}.desk`, pack.id, `SYNTHETIC-FACT-${letter}: fictional ledgerdesk opens ${letter === "A" ? "Tuesday 14:00 to 16:00; sessions are free" : "Friday 09:00 to 11:00; sessions cost KSh 50"}. Invented test data, not a real service.`, `${pack.id}.draft`, `UNAPPROVED-HARNESS-${letter}`]);
      await db.query(`INSERT INTO language_entries (utterance,meaning,style,status,allowed_for_rag,pack_id,corpus_layer,synthetic)
        VALUES ($1,'ledgerdesk','sheng','approved',true,$2,'L3_afribit_reviewed',true)`, [`SYNTHETIC-VOCAB-${letter} ledgerdesk`, pack.id]);
    }
    const noteIds = new Map<string, string>();
    stage = "memory-seed";
    for (const member of members) {
      await db.query(`INSERT INTO users (id,email,role,created_via) VALUES ($1,$2,'learner','registered')`, [member.id, `${member.marker.toLowerCase()}@harness.invalid`]);
      await db.query(`INSERT INTO community_memberships (pack_id,user_id) VALUES ($1,$2)`, [member.pack.id, member.id]);
      await memoryStore.enable(member.id, member.pack.id, true);
      noteIds.set(member.id, (await memoryStore.create(member.id, member.pack.id, `LOCAL-HARNESS-${member.marker}: prefers garden examples`, false)).id);
      await memoryStore.create(member.id, member.pack.id, `REMOTE-HINT-${member.marker}: prefers brief explanations`, true);
    }
    await memoryStore.enable(members[0]!.id, packs[1]!.id, true);
    await memoryStore.create(members[0]!.id, packs[1]!.id, "OTHER-PACK-HARNESS: same account separate community", false);
    for (const server of fixtures) await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const origins = fixtures.map(server => `http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    Object.assign(env, { inferenceMode: "node", localLlmBaseUrl: origins[0], localLlmApi: "openai", localLlmModel: "harness-fixture", localLlmApiKey: "synthetic-harness",
      openRouterBaseUrl: origins[1], openRouterApiKey: "synthetic-harness", cloudChatProfile: "harness_remote", chatPipeline: "single", promptMode: "full",
      embeddingProvider: "openrouter", cloudEmbeddingsAllowed: false, waiterQueryRewrite: false, gapLabels: false, chatRetention: { mode: "keep" } });
    const route = (provider: "local" | "openrouter", baseUrl: string, real = false): ComputeRoute => ({ kind: "chat", provider,
      model: real ? MODEL : "harness-fixture", baseUrl, region: provider === "local" ? "community" : "unrestricted", maxInputBytes: 32768, maxOutputTokens: 640,
      reservationMicrousd: real ? REQUEST_ALLOWANCE : provider === "local" ? 0 : 1, billingBoundConfirmed: true, upstreams: real ? [UPSTREAM] : provider === "local" ? [] : ["harness"],
      promptPriceMicrousdPerMillion: real ? 80000 : 0, completionPriceMicrousdPerMillion: real ? 450000 : 0 });
    const localRoute = route("local", origins[0]!), remoteRoute = route("openrouter", origins[1]!);
    const policy = validateComputePolicy({ dailyBudgetMicrousd: 10_000_000, dailyAttemptLimit: 64, routes: [localRoute, remoteRoute] });
    const profile = (name: string, provider: "local" | "openrouter", model: string): ModelProfile => ({ profile: name, provider, model,
      fallbackProfile: null, maxOutputTokens: 640, temperature: 0, privacyProfile: "strict", timeoutMs: 60000 });
    const gateway = new AfribitAIGateway(new Map<string, InferenceProvider>([["local", new LocalProvider()], ["openrouter", new OpenRouterProvider()]]));
    gateway.setMeter(async event => { usage.push({ cost: event.estimatedCostUsd, model: event.model, status: event.status }); });
    globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
      const url = String(args[0]);
      if (origins.some(origin => url === `${origin}/chat/completions` || url === `${origin}/v1/chat/completions`)) return originalFetch(...args);
      if (hosted && (url === `${HOST}/credits` || url === `${HOST}/models/${MODEL}/endpoints`) && (!args[1]?.method || args[1]?.method === "GET")) return originalFetch(...args);
      if (hosted && remoteEnabled && url === `${HOST}/chat/completions` && args[1]?.method === "POST") {
        const body = JSON.parse(String(args[1].body)); const text = JSON.stringify(body.messages);
        assert.ok(!/LOCAL-HARNESS-|UNAPPROVED-HARNESS-|OTHER-PACK-HARNESS/.test(text), "Private/unapproved canary at hosted boundary");
        const active = members.find(member => text.includes(`REMOTE-HINT-${member.marker}`)); assert.ok(active, "Expected consented synthetic owner context");
        for (const other of members.filter(member => member.id !== active.id)) assert.ok(!text.includes(`REMOTE-HINT-${other.marker}`), "Foreign owner at hosted boundary");
        const letter = active.marker[0]; assert.ok(text.includes(`SYNTHETIC-FACT-${letter}`)); assert.ok(!text.includes(`SYNTHETIC-FACT-${letter === "A" ? "B" : "A"}`));
        assert.equal(body.model, MODEL); assert.ok(body.max_tokens <= 640); assert.ok(Buffer.byteLength(JSON.stringify({ messages: body.messages })) <= 32768);
        assert.deepEqual(body.provider.only, [UPSTREAM]); assert.equal(body.provider.zdr, true); assert.equal(body.provider.allow_fallbacks, false);
        assert.equal(body.provider.data_collection, "deny"); assert.equal(body.provider.require_parameters, true);
        assert.deepEqual(body.provider.max_price, { prompt: 0.08, completion: 0.45 }); assert.ok(!body.tools && !body.plugins);
        assert.ok(hostedDispatches < 4, "Fixed hosted request count"); hostedDispatches++;
        traces.push({ side: "hosted", messages: body.messages });
        const response = await originalFetch(...args);
        let code: number | null = null;
        if (!response.ok) { try { const data = await response.clone().json() as {error?:{code?:number}}; code = typeof data.error?.code === "number" ? data.error.code : null; } catch {} }
        trial.event("hosted-http-result", { status: response.status, code, request: hostedDispatches, upstream: UPSTREAM });
        return response;
      }
      deniedEgress++; throw new Error("Harness disallowed an unexpected network destination");
    };
    await app.register(authPlugin); registerPackRoutes(app, communityStore); registerCommunityGuard(app); registerChatRoutes(app, gateway); registerMemoryRoutes(app); await app.ready();
    const headers = (member: typeof members[number], pack = member.pack.id) => ({ "x-pack": pack, authorization: `Bearer ${app.jwt.sign({ id: member.id, role: "learner" })}` });
    const ask = async (member: typeof members[number], extra: Record<string, unknown> = {}) => {
      const started=performance.now();
      const response = await app.inject({ method: "POST", url: "/api/v1/chat", headers: headers(member), payload: { message: QUERY, languageMode: "sheng", explanationLevel: "simple", ...extra } });
      const body=response.json();
      apiMeasurements.push({member:member.marker,status:response.statusCode,elapsedMs:performance.now()-started,messageId:body.messageId??null,sessionId:body.sessionId??null,answerSource:body.answerSource??null});
      save("api-response-measurements.json",apiMeasurements);
      assert.equal(response.statusCode, 200, "Chat route must complete"); return body;
    };
    const check = async (name: string, work: () => Promise<void>) => {
      stage = name;
      const started = performance.now(); try { await work(); checks.push({ name, passed: true, ms: performance.now() - started }); trial.event("check", { name, passed: true }); }
      catch (error) { checks.push({ name, passed: false, ms: performance.now() - started }); trial.event("check", { name, passed: false }); throw error; }
      finally { save("checks.json", checks); save("synthetic-traces.json", traces); }
    };
    ledger = ExperimentLedger.open(join(dir, "fixture-ledger.json"), { fingerprint: hash({ fixture: 1, source: revision.sourceHash }), budgetMicrousd: 10_000_000, heldAsideMicrousd: 2_000_000, externalChargesMicrousd: PRIOR_ALLOWANCES, maxAttempts: 64 });
    await withModelProfiles([profile("node_chat", "local", "harness-fixture"), profile("harness_remote", "openrouter", "harness-fixture")],
      () => withIsolatedComputePolicy(policy, ledger!, async () => {
        await check("four concurrent members: real SQL retrieval, language hints and personal context stay scoped", async () => {
          const start = traces.length;
          const answers = await Promise.all(members.map(member => ask(member, { message: `${QUERY} HISTORY-HARNESS-${member.marker}` })));
          assert.equal(traces.length - start, 4);
          for (let i = 0; i < members.length; i++) {
            const member = members[i]!, answer = answers[i]; sessions.set(member.id, answer.sessionId);
            assert.equal(answer.answerSource, "model"); assert.equal(answer.processingPolicy, "local-only");
            const trace = traces.slice(start).find(t => JSON.stringify(t.messages).includes(`LOCAL-HARNESS-${member.marker}`)); assert.ok(trace);
            const wire = JSON.stringify(trace.messages), letter = member.marker[0];
            assert.ok(!trace.messages.some((message, i) => i > 0 && message.role === "user" && trace.messages[i-1]!.role === "user"), "Personal context must preserve valid chat turns");
            assert.ok(wire.includes(`SYNTHETIC-FACT-${letter}`)); assert.ok(wire.includes(`SYNTHETIC-LANGUAGE-${letter}`)); assert.ok(wire.includes(`SYNTHETIC-VOCAB-${letter}`));
            assert.ok(!wire.includes(`SYNTHETIC-FACT-${letter === "A" ? "B" : "A"}`)); assert.ok(!wire.includes("UNAPPROVED-HARNESS") && !wire.includes("OTHER-PACK-HARNESS"));
            for (const other of members.filter(m => m.id !== member.id)) assert.ok(!wire.includes(`LOCAL-HARNESS-${other.marker}`) && !wire.includes(`REMOTE-HINT-${other.marker}`));
            const rows = await db.query<{ retrieved_ids: string[] }>(`SELECT retrieved_ids FROM chat_messages WHERE id=$1`, [answer.messageId]);
            assert.deepEqual(rows.rows[0]!.retrieved_ids, [`${member.pack.id}.desk`]);
          }
        });
        await check("parallel conversation continuations load only their own stored history", async () => {
          const start = traces.length;
          await Promise.all(members.map(member => ask(member, { sessionId: sessions.get(member.id) })));
          assert.equal(traces.length - start, 4);
          for (const member of members) {
            const trace = traces.slice(start).find(t => JSON.stringify(t.messages).includes(`LOCAL-HARNESS-${member.marker}`)); assert.ok(trace);
            const wire = JSON.stringify(trace.messages); assert.ok(wire.includes(`HISTORY-HARNESS-${member.marker}`));
            for (const other of members.filter(m => m.id !== member.id)) assert.ok(!wire.includes(`HISTORY-HARNESS-${other.marker}`));
          }
        });
        await check("known foreign conversation IDs cannot read, append or stream and trigger no inference", async () => {
          const start = traces.length, owner = members[0]!, other = members[1]!, session = sessions.get(owner.id)!;
          for (const request of [{ method: "GET" as const, url: `/api/v1/chat/${session}` }, { method: "POST" as const, url: "/api/v1/chat", payload: { sessionId: session, message: QUERY } },
            { method: "POST" as const, url: "/api/v1/chat/stream", payload: { sessionId: session, message: QUERY } }]) assert.equal((await app.inject({ ...request, headers: headers(other) })).statusCode, 404);
          assert.equal(traces.length, start);
        });
        await check("community membership is enforced before retrieval or inference", async () => {
          const start = traces.length, retrievalStart = retrievalQueries;
          assert.equal((await app.inject({ method: "POST", url: "/api/v1/chat", headers: headers(members[0]!, packs[1]!.id), payload: { message: QUERY } })).statusCode, 403);
          assert.equal((await app.inject({ method: "POST", url: "/api/v1/chat", headers: { "x-pack": packs[0]!.id }, payload: { message: QUERY } })).statusCode, 401);
          assert.equal(traces.length, start); assert.equal(retrievalQueries, retrievalStart);
        });
        await check("reviewed-only answers use actual local retrieval with zero inference", async () => {
          const start = traces.length;
          for (const member of [members[0]!, members[2]!]) { const answer = await ask(member, { answerMode: "reviewed-only" }); assert.equal(answer.answerSource, "reviewed-card"); assert.ok(answer.content.includes(`SYNTHETIC-FACT-${member.marker[0]}`)); }
          assert.equal(traces.length, start);
        });
        await check("local-only inference failure returns the approved local card without remote fallback", async () => {
          localStatus = 503; const start = traces.length;
          try { const answer = await ask(members[0]!); assert.equal(answer.answerSource, "reviewed-fallback"); assert.ok(answer.content.includes("SYNTHETIC-FACT-A")); assert.ok(traces.length > start && traces.slice(start).every(t => t.side === "local-fixture")); }
          finally { localStatus = 200; }
        });
        await check("deleted private note disappears from subsequent full API prompts", async () => {
          const member = members[0]!;
          const response = await app.inject({ method: "DELETE", url: `/api/v1/me/memory/items/${noteIds.get(member.id)}`, headers: headers(member) }); assert.equal(response.statusCode, 204);
          const start = traces.length; await ask(member); const wire = JSON.stringify(traces.slice(start)); assert.ok(!wire.includes("LOCAL-HARNESS-A1"));
        });
        await check("configured remote transport excludes local-only and other owners' notes", async () => {
          Object.assign(env, { inferenceMode: "cloud" });
          for (const member of members) {
            const start = traces.length, answer = await ask(member); assert.equal(answer.answerSource, "model");
            const fresh = traces.slice(start); assert.equal(fresh.length, 1); assert.equal(fresh[0]!.side, "remote-fixture");
            const wire = JSON.stringify(fresh[0]!.messages); assert.ok(wire.includes(`REMOTE-HINT-${member.marker}`)); assert.ok(!wire.includes("LOCAL-HARNESS") && !wire.includes("OTHER-PACK-HARNESS"));
            for (const other of members.filter(m => m.id !== member.id)) assert.ok(!wire.includes(`REMOTE-HINT-${other.marker}`));
          }
        });
        await check("a local-only session cannot be downgraded by a later configured request", async () => {
          const start = traces.length; const answer = await ask(members[1]!, { sessionId: sessions.get(members[1]!.id), processingPolicy: "configured" });
          assert.equal(answer.processingPolicy, "local-only"); assert.ok(traces.length > start && traces.slice(start).every(t => t.side === "local-fixture"));
        });
      }));
    let rentalResult: Awaited<ReturnType<typeof runCommunityRentalRehearsal>> | null = null;
    if (rentalRehearsal) rentalResult = await runCommunityRentalRehearsal({trial,db,app,members,directory:dir,headers,ask,check,save,originalFetch},live);
    if (hosted) {
      stage = "hosted-quote-and-credit-preflight";
      assert.ok(originalEnv.openRouterApiKey, "Hosted execution requires the configured key");
      const quote = await originalFetch(`${HOST}/models/${MODEL}/endpoints`, { redirect: "error", signal: AbortSignal.timeout(15000) }); assert.ok(quote.ok, "Endpoint quote must be available");
      const metadata = await quote.json() as { data: { endpoints: { tag: string; pricing: { prompt: string; completion: string }; status: number }[] } };
      save("provider-quotes.json", metadata);
      const endpoint = metadata.data.endpoints.find(e => e.tag === UPSTREAM); assert.ok(endpoint && endpoint.status === 0, "Selected endpoint is missing or unavailable");
      assert.ok(Number(endpoint.pricing.prompt) <= 0.00000008 && Number(endpoint.pricing.completion) <= 0.00000045, "Qualified price ceiling changed");
      save("hosted-route.json", { model: MODEL, upstream: UPSTREAM, endpoint, priorAllowancesMicrousd: PRIOR_ALLOWANCES, maxAttempts: 4, requestAllowanceMicrousd: REQUEST_ALLOWANCE });
      const credits = async () => {
        const response = await originalFetch(`${HOST}/credits`, { headers: { Authorization: `Bearer ${originalEnv.openRouterApiKey}` }, redirect: "error", signal: AbortSignal.timeout(15000) }); assert.ok(response.ok);
        const data = await response.json() as { data: { total_credits: number; total_usage: number } }; return { at: new Date().toISOString(), usage: data.data.total_usage, remaining: data.data.total_credits - data.data.total_usage };
      };
      const before = await credits(); assert.ok(before.remaining >= (PRIOR_ALLOWANCES + 4 * REQUEST_ALLOWANCE + 2000000) / 1000000, "Insufficient prepaid balance for the retained envelope");
      save("hosted-account-before.json", before);
      const realRoute = route("openrouter", HOST, true);
      hostedLedger = ExperimentLedger.open(join(REPOSITORY_ROOT, "output/community-harness/hosted-parasail-normalized-ledger.json"), { fingerprint: hash({ fixture: 2, source: revision.sourceHash, route: realRoute }),
        budgetMicrousd: 10_000_000, heldAsideMicrousd: 2_000_000, externalChargesMicrousd: PRIOR_ALLOWANCES, maxAttempts: 4 });
      Object.assign(env, { openRouterBaseUrl: HOST, openRouterApiKey: originalEnv.openRouterApiKey, inferenceMode: "cloud" }); remoteEnabled = true;
      await withModelProfiles([profile("harness_remote", "openrouter", MODEL)], () => withIsolatedComputePolicy(validateComputePolicy({ dailyBudgetMicrousd: 10_000_000, dailyAttemptLimit: 4, routes: [realRoute] }), hostedLedger!, async () => {
        await check("four real hosted answers use the normal API and only authorized synthetic context", async () => {
          const answers = [];
          for (const member of members) { const answer = await ask(member); answers.push({ member: member.marker, ...answer }); save("hosted-answers.json", answers); assert.equal(answer.answerSource, "model", "Hosted model failed; reviewed fallback is not a model completion"); }
          assert.equal(hostedDispatches, 4); save("hosted-answers.json", answers);
        });
      }));
      remoteEnabled = false;
      let after = null; try { after = await credits(); } catch { trial.event("post-credit-unavailable"); }
      save("hosted-account-check.json", { before, after, incrementalUsageUsd: after ? after.usage - before.usage : null, invoiceReconciled: false });
    }
    assert.equal(deniedEgress, 0, "Unexpected egress was attempted");
    save("summary.json", { trial: trial.id, revision, synthetic: true, hosted, rentalRehearsal, rentalResult, checks, transportCalls: traces.length, hostedDispatches, deniedEgress, retrievalQueries, usage,
      limitations: ["Loopback local transport is a fixture, not LLM inference", "PGlite lexical search, no pgvector evaluation", "No private-document/team ACL, real Mesh, GPU rental or TEE proof", "Human language review pending"],
      cumulativeRequestAllowanceMicrousd: PRIOR_ALLOWANCES + (hosted ? 4 * REQUEST_ALLOWANCE : 0), heldAsideMicrousd: 2000000 });
    const hostedUsage = usage.filter(u => u.model === MODEL);
    return { artifacts: dir, checks: checks.length, hostedDispatches, knownHostedCostUsd: hosted && hostedUsage.length === 4 && hostedUsage.every(u => typeof u.cost === "number")
      ? hostedUsage.reduce((sum, u) => sum + u.cost!, 0) : null };
  } finally {
    remoteEnabled = false;
    let measurementExportFailed = false;
    try{
      const metadata=await db.query(`SELECT m.id AS "messageId",m.session_id AS "sessionId",m.role,m.answer_source AS "answerSource",m.provider,m.model_profile AS "modelProfile",m.latency_ms AS "providerLatencyMs",
        m.prompt_tokens AS "promptTokens",m.completion_tokens AS "completionTokens",m.retrieved_ids AS "retrievedIds",m.safety_flag AS "safetyFlag"
        FROM chat_messages m WHERE m.role='assistant' ORDER BY m.created_at,m.id`);
      save("database-message-measurements.json",metadata.rows);save("api-response-measurements.json",apiMeasurements);
    }catch{measurementExportFailed = true;trial.event("message-measurement-export-failed");}
    try { save("synthetic-traces.json", traces); save("usage.json", usage); }
    catch { trial.event("evidence-write-failed"); }
    try { if (ledger) { await ledger.drain(); ledger.close(); } if (hostedLedger) { await hostedLedger.drain(); hostedLedger.close(); } }
    finally {
      try { await app.close(); appClosed = true; }
      finally {
        for (const server of fixtures) if (server.listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
        fixturesClosed = fixtures.every(s => !s.listening);
        try { await db.close(); dbClosed = true; }
        finally {
          Object.assign(pool, originalPool); Object.assign(env, originalEnv); setRegistry(originalRegistry); globalThis.fetch = originalFetch;
          trial.event("cleanup", { fixturesClosed, appClosed, dbClosed });
        }
      }
    }
    if (measurementExportFailed) throw new Error("Required message measurement export failed after resource cleanup");
  }
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
const trial = new TrialRecord(TRIAL_DIRECTORY, "community-harness-proof", "pnpm --filter @afribit/api showcase:community [--hosted | --rental-rehearsal]");
const args = process.argv.slice(2);
try {
  if (args.some(arg => !["--hosted","--rental-rehearsal"].includes(arg)) || args.length > 1) throw new Error("Unsupported community harness arguments");
  trial.event("invoked", { hosted: args.includes("--hosted"), rentalRehearsal: args.includes("--rental-rehearsal") });
  const result = await runCommunityHarness(trial, args.includes("--hosted"), args.includes("--rental-rehearsal"));
  trial.finish("completed", args.includes("--hosted") ? result.knownHostedCostUsd : 0, { ...result, humanReview: "pending" });
  console.log(JSON.stringify({ trial: trial.id, ...result, humanReview: "pending" }, null, 2));
} catch (error) {
  trial.finish("failed", args.includes("--hosted") ? null : 0, { reason: "community-harness-check-or-execution-failed", stage,
    errorCode: typeof (error as {code?:unknown})?.code === "string" ? (error as {code:string}).code : null,
    constraint: typeof (error as {constraint?:unknown})?.constraint === "string" ? (error as {constraint:string}).constraint : null });
  // Assertion names carry no provider response body, credential or synthetic prompt text.
  console.error(`Community harness failed: ${error instanceof assert.AssertionError ? error.message.split("\n")[0] : "inspect retained check/trial records"}`);
  process.exitCode = 1;
}
}
