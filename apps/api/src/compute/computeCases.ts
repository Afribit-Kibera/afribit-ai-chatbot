import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import type { PGlite } from "@electric-sql/pglite";
import type { AfribitChatRequest } from "@afribit/shared";
import Fastify from "fastify";
import { env } from "../config/env.js";
import { getPack, getRegistry, runWithPack, setRegistry } from "../pack/active.js";
import { buildRegistry } from "../pack/registry.js";
import { authPlugin } from "../auth/plugin.js";
import { registerPackRoutes } from "../routes/pack.js";
import { registerComputeRoutes } from "../routes/compute.js";
import { registerChatRoutes } from "../routes/chat.js";
import { createGateway } from "../gateway/registry.js";
import { getModelProfile } from "../config/modelProfiles.js";
import { LocalProvider } from "../providers/localProvider.js";
import { OpenRouterProvider } from "../providers/openRouterProvider.js";
import { embedLocalTexts } from "../providers/localEmbeddings.js";
import { embedTexts } from "../providers/openRouterEmbeddings.js";
import { sendMessage } from "../chat/chatService.js";
import { withProcessingPolicy } from "../privacy/contextPolicy.js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { enforceComputePolicies } from "./admission.js";
import { computeStore } from "./store.js";
import { ComputePolicyError, validateComputePolicy, type ComputePolicy, type ComputeRoute } from "./policy.js";
export async function runComputeCases(db: PGlite, ok: (name: string, fn: () => Promise<void>) => Promise<void>) {
    const previous = { ...env }, registry = getRegistry(), base = getPack(), priorEnforced = enforceComputePolicies(true);
    const ADMIN = "61000000-0000-4000-8000-000000000001", LEARNER = "61000000-0000-4000-8000-000000000002";
    await db.query(`INSERT INTO users(id,email,role,created_via) VALUES($1,'compute-admin@x','admin','registered'),($2,'compute-learner@x','learner','registered')`, [ADMIN, LEARNER]);
    let sequence = 0, mode = "ok", closed = false;
    const seen: {
        model?: string;
        body: any;
        path: string;
    }[] = [];
    const server = http.createServer(async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const c of req)
            chunks.push(Buffer.from(c));
        const b = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        seen.push({ model: b.model, body: b, path: req.url ?? "" });
        if (mode === "hang") {
            res.on("close", () => { closed = true; });
            return;
        }
        if (mode === "fail" || (mode === "fail-primary" && b.model === getModelProfile("default_chat").model)) {
            res.writeHead(503);
            res.end("Synthetic failure");
            return;
        }
        if (req.url?.includes("embeddings")) {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: b.input.map((_: unknown) => ({ embedding: [0.1, 0.2] })) }));
            return;
        }
        if (b.stream) {
            res.writeHead(200, { "content-type": "text/event-stream" });
            res.write(`data: ${JSON.stringify({ model: b.model, choices: [{ delta: { content: "synthetic output" } }] })}\n\n`);
            if (mode === "partial") {
                setTimeout(() => res.destroy(), 20);
                return;
            }
            if (mode === "cancel") {
                res.on("close", () => { closed = true; });
                return;
            }
            res.end(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2, cost: mode === "overrun" ? 0.01 : 0.000001 } })}\n\ndata: [DONE]\n\n`);
            return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ model: b.model, choices: [{ message: { content: "synthetic output" }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2, cost: mode === "overrun" ? 0.01 : 0.000001 } }));
    });
    await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    Object.assign(env, { openRouterBaseUrl: url, openRouterApiKey: "synthetic-key", localLlmBaseUrl: url, localLlmApi: "openai", localLlmModel: "synthetic-local", localEmbeddingBaseUrl: url, localEmbeddingApi: "openai", localEmbeddingModel: "synthetic-embedding", inferenceMode: "cloud", waiterQueryRewrite: false, chatPipeline: "single", cloudEmbeddingsAllowed: false });
    const remote = new OpenRouterProvider(), local = new LocalProvider(), gateway = createGateway();
    const request: AfribitChatRequest = { requestId: "compute-proof", messages: [{ role: "user", content: "PRIVATE-COMPUTE-CANARY" }], languageMode: "simple_en", explanationLevel: "simple", modelProfile: "default_chat", maxOutputTokens: 100, temperature: 0, privacyProfile: "strict" };
    const route = (extra: Partial<ComputeRoute> = {}): ComputeRoute => ({ kind: "chat", provider: "openrouter", model: getModelProfile("default_chat").model, baseUrl: url, region: "unrestricted", maxInputBytes: 4096, maxOutputTokens: 500, reservationMicrousd: 100, billingBoundConfirmed: true, upstreams: ["synthetic-upstream"], promptPriceMicrousdPerMillion: 1000, completionPriceMicrousdPerMillion: 1000, ...extra });
    const policy = (routes = [route()], dailyBudgetMicrousd = 1000, dailyAttemptLimit = 10): ComputePolicy => ({ routes, dailyBudgetMicrousd, dailyAttemptLimit });
    const scope = () => ({ ...base, id: `compute-proof-${++sequence}`, knowledge: { topics: [], entries: [] } });
    const configure = async (p: ComputePolicy) => { const pack = scope(); await computeStore.save(pack.id, ADMIN, 0, true, p); return pack; };
    const one = async (sql: string, params: unknown[] = []) => ((await db.query(sql, params)).rows[0] as any);
    const status = (n: number) => (e: unknown) => e instanceof ComputePolicyError && e.statusCode === n;
    const eventually = async (check: () => Promise<boolean>) => { const end = Date.now() + 1500; while (!await check()) {
        if (Date.now() > end)
            throw new Error("Synthetic cancellation did not settle");
        await new Promise(r => setTimeout(r, 10));
    } };
    const other = { ...base, id: "compute-api-other", domain: { ...base.domain, id: "compute-api-other", retrievalDomains: ["compute-api-other"] }, knowledge: { topics: [], entries: [] } };
    const registryReport = buildRegistry([base, other], base.id);
    assert.ok(registryReport.registry, registryReport.errors.join("\n"));
    setRegistry(registryReport.registry);
    const app = Fastify();
    await app.register(authPlugin);
    registerPackRoutes(app);
    registerComputeRoutes(app);
    registerChatRoutes(app, gateway);
    await app.ready();
    const auth = (id = ADMIN) => ({ authorization: `Bearer ${app.jwt.sign({ id, role: "admin" })}` });
    try {
        await ok("compute policy: validates region, endpoint, billing bound, dynamic model and credential fields", async () => {
            validateComputePolicy(policy());
            const example = JSON.parse(readFileSync(new URL("../../../../docs/examples/compute-local-only.json", import.meta.url), "utf8"));
            validateComputePolicy(example.policy);
            for (const bad of [route({ region: "eu" }), route({ baseUrl: "http://remote.example.invalid" }), route({ billingBoundConfirmed: false }), route({ reservationMicrousd: 1 }), route({ model: "openrouter/auto" }), { ...route(), apiKey: "not-allowed" }])
                assert.throws(() => validateComputePolicy(policy([bad])), status(400));
            validateComputePolicy(policy([route({ region: "eu", baseUrl: "https://eu.openrouter.ai/api/v1" })]));
            assert.throws(() => validateComputePolicy(policy([route({ kind: "embeddings", maxOutputTokens: 0 })])), status(400));
        });
        await ok("compute admin: default disabled, current admin only, optimistic versions and pack-scoped reads", async () => {
            assert.equal((await app.inject({ url: "/api/v1/admin/community/compute" })).statusCode, 401);
            assert.equal((await app.inject({ url: "/api/v1/admin/community/compute", headers: auth(LEARNER) })).statusCode, 403);
            assert.equal((await app.inject({ url: "/api/v1/admin/community/compute", headers: auth() })).json().enabled, false);
            const put = () => app.inject({ method: "PUT", url: "/api/v1/admin/community/compute", headers: auth(), payload: { expectedVersion: 0, enabled: true, policy: policy() } });
            assert.equal((await put()).statusCode, 200);
            assert.equal((await put()).statusCode, 409);
            const otherState = await app.inject({ url: "/api/v1/admin/community/compute", headers: { ...auth(), "x-pack": other.id } });
            assert.equal(otherState.statusCode, 200, otherState.body);
            assert.equal(otherState.json().version, 0);
            await db.query(`UPDATE users SET role='learner' WHERE id=$1`, [ADMIN]);
            assert.equal((await app.inject({ url: "/api/v1/admin/community/compute", headers: auth() })).statusCode, 403);
            await db.query(`UPDATE users SET role='admin' WHERE id=$1`, [ADMIN]);
        });
        await ok("compute admission: missing policy blocks raw chat/stream/embeddings while reviewed-only still works", async () => {
            const pack = scope(), before = seen.length;
            await runWithPack(pack, async () => {
                await assert.rejects(() => remote.chat(request), status(403));
                await assert.rejects(() => remote.chatStream(request).next(), status(403));
                await assert.rejects(() => embedTexts(["PRIVATE-COMPUTE-CANARY"]), status(403));
                const result = await sendMessage(gateway, { sessionId: null, userId: LEARNER, message: "proofcardtoken", answerMode: "reviewed-only" });
                assert.equal(result.answerSource, "reviewed-card");
            });
            assert.equal(seen.length, before);
        });
        await ok("compute admission: pins upstreams/prices and retains the full reservation after successful work", async () => {
            const pack = await configure(policy()), before = seen.length;
            await runWithPack(pack, () => remote.chat(request));
            assert.equal(seen.length, before + 1);
            const prefs = seen.at(-1)!.body.provider;
            assert.deepEqual(prefs.only, ["synthetic-upstream"]);
            assert.equal(prefs.allow_fallbacks, false);
            assert.equal(prefs.zdr, true);
            assert.deepEqual(prefs.max_price, { prompt: 0.001, completion: 0.001 });
            const usage = await computeStore.usage(pack.id);
            assert.equal(usage.reservedMicrousd, "100");
            const row = await one(`SELECT status,reported_microusd::text AS cost FROM community_compute_reservations WHERE pack_id=$1`, [pack.id]);
            assert.deepEqual(row, { status: "completed", cost: "1" });
        });
        await ok("compute privacy: an approved/budgeted route cannot override local-only permission", async () => {
            const pack = await configure(policy()), before = seen.length;
            await runWithPack(pack, () => withProcessingPolicy({ localOnly: true, reviewedOnly: false }, () => assert.rejects(() => remote.chat(request), /Local-only/)));
            assert.equal(seen.length, before);
            assert.equal((await computeStore.usage(pack.id)).attempts, 0);
        });
        await ok("compute admission: rejects context, output, model and endpoint before transport or reservation", async () => {
            const pack = await configure(policy()), before = seen.length;
            await runWithPack(pack, async () => {
                await assert.rejects(() => remote.chat({ ...request, messages: [{ role: "user", content: "x".repeat(5000) }] }), status(413));
                await assert.rejects(() => remote.chat({ ...request, maxOutputTokens: 501 }), status(413));
                await assert.rejects(() => remote.chat({ ...request, modelProfile: "fallback_chat" }), status(403));
                Object.assign(env, { openRouterBaseUrl: "https://remote.example.invalid" });
                try {
                    await assert.rejects(() => remote.chat(request), status(403));
                }
                finally {
                    Object.assign(env, { openRouterBaseUrl: url });
                }
            });
            assert.equal(seen.length, before);
            assert.equal((await computeStore.usage(pack.id)).attempts, 0);
        });
        await ok("compute limits: oversized questions and hard context/message/output bounds fail before dispatch", async () => {
            const pack = await configure(policy()), before = seen.length;
            for (const endpoint of ["/api/v1/chat", "/api/v1/chat/stream"]) {
                const r = await app.inject({ method: "POST", url: endpoint, headers: auth(LEARNER), payload: { message: "x".repeat(8001) } });
                assert.equal(r.statusCode, 413);
            }
            await runWithPack(pack, async () => {
                await assert.rejects(() => remote.chat({ ...request, messages: [{ role: "user", content: "x".repeat(131073) }] }), status(413));
                await assert.rejects(() => remote.chat({ ...request, messages: Array.from({ length: 65 }, () => ({ role: "user" as const, content: "x" })) }), status(413));
                await assert.rejects(() => remote.chat({ ...request, maxOutputTokens: 4097 }), status(413));
            });
            assert.equal(seen.length, before);
        });
        await ok("compute revocation: stale policy snapshots and unavailable policy storage cannot dispatch", async () => {
            const p = policy(), pack = await configure(p), before = seen.length;
            await computeStore.save(pack.id, ADMIN, 1, false, p);
            await assert.rejects(() => computeStore.reserve(pack.id, 1, p, p.routes[0]!), status(429));
            const read = computeStore.read;
            computeStore.read = async () => { throw new Error("Synthetic policy database unavailable"); };
            try {
                await runWithPack(pack, () => assert.rejects(() => remote.chat(request), /policy database unavailable/));
            }
            finally {
                computeStore.read = read;
            }
            assert.equal(seen.length, before);
            assert.equal((await computeStore.usage(pack.id)).attempts, 0);
        });
        await ok("compute budget: concurrent attempts cannot exceed money/attempt ceilings, and communities are independent", async () => {
            const p = policy([route()], 100, 1), pack = await configure(p), before = seen.length;
            const outcomes = await runWithPack(pack, () => Promise.allSettled([remote.chat(request), remote.chat(request)]));
            assert.equal(outcomes.filter(r => r.status === "fulfilled").length, 1);
            assert.equal(seen.length, before + 1);
            const second = await configure(p);
            await runWithPack(second, () => remote.chat(request));
            await computeStore.save(pack.id, ADMIN, 1, true, p);
            await runWithPack(pack, () => assert.rejects(() => remote.chat(request), status(429)));
            assert.equal((await computeStore.usage(pack.id)).reservedMicrousd, "100");
        });
        await ok("compute budget: UTC daily buckets do not reuse yesterday's allowance", async () => {
            const pack = await configure(policy([route()], 100, 1));
            await db.query(`INSERT INTO community_compute_usage(pack_id,day,attempts,reserved_microusd) VALUES($1,(now() AT TIME ZONE 'UTC')::date-1,100,10000)`, [pack.id]);
            await runWithPack(pack, () => remote.chat(request));
            assert.equal((await computeStore.usage(pack.id)).attempts, 1);
        });
        await ok("compute budget: failures and each fallback consume their own reservation; denied fallbacks never dispatch", async () => {
            const fallback = route({ model: getModelProfile("fallback_chat").model });
            mode = "fail-primary";
            try {
                for (const [routes, budget, expected] of [[[route()], 1000, 1], [[route(), fallback], 100, 1], [[route(), fallback], 200, 2]] as const) {
                    const pack = await configure(policy([...routes], budget, 10)), before = seen.length;
                    const call = () => runWithPack(pack, () => gateway.chat(request));
                    if (expected === 2)
                        assert.equal((await call()).model, fallback.model);
                    else
                        await assert.rejects(call);
                    assert.equal(seen.length, before + expected);
                    assert.equal((await computeStore.usage(pack.id)).reservedMicrousd, String(expected * 100));
                }
            }
            finally {
                mode = "ok";
            }
        });
        await ok("compute streaming: pre-output fallbacks require their own allowed route and remaining allowance", async () => {
            const fallback = route({ model: getModelProfile("fallback_chat").model });
            mode = "fail-primary";
            try {
                for (const [routes, budget, expected] of [[[route()], 1000, 1], [[route(), fallback], 100, 1], [[route(), fallback], 200, 2]] as const) {
                    const pack = await configure(policy([...routes], budget, 10)), before = seen.length;
                    const call = () => runWithPack(pack, async () => {
                        const gen = gateway.chatStream(request);
                        let step = await gen.next();
                        while (!step.done)
                            step = await gen.next();
                        return step.value;
                    });
                    if (expected === 2)
                        assert.equal((await call()).model, fallback.model);
                    else
                        await assert.rejects(call);
                    assert.equal(seen.length, before + expected);
                    assert.equal((await computeStore.usage(pack.id)).reservedMicrousd, String(expected * 100));
                }
            }
            finally {
                mode = "ok";
            }
        });
        await ok("compute budget: timeout aborts transport and keeps allowance charged", async () => {
            const pack = await configure(policy([route()], 100, 2)), profile = getModelProfile("default_chat"), timeout = profile.timeoutMs;
            mode = "hang";
            closed = false;
            profile.timeoutMs = 40;
            try {
                await assert.rejects(() => runWithPack(pack, () => gateway.chat(request)));
                await eventually(async () => closed);
                assert.equal((await computeStore.usage(pack.id)).reservedMicrousd, "100");
            }
            finally {
                profile.timeoutMs = timeout;
                mode = "ok";
            }
        });
        await ok("compute streaming: an interrupted partial answer cannot dispatch a fallback", async () => {
            const pack = await configure(policy([route(), route({ model: getModelProfile("fallback_chat").model })], 1000)), before = seen.length;
            mode = "partial";
            try {
                await runWithPack(pack, async () => { const gen = gateway.chatStream(request); const first = await gen.next(); assert.equal(first.done, false); await assert.rejects(() => gen.next()); });
                assert.equal(seen.length, before + 1);
                assert.equal((await computeStore.usage(pack.id)).reservedMicrousd, "100");
            }
            finally {
                mode = "ok";
            }
        });
        await ok("compute streaming: the deadline still aborts a stalled stream after its first output", async () => {
            const pack = await configure(policy([route(), route({ model: getModelProfile("fallback_chat").model })])), before = seen.length;
            const profile = getModelProfile("default_chat"), timeout = profile.timeoutMs;
            mode = "cancel";
            closed = false;
            profile.timeoutMs = 100;
            try {
                await runWithPack(pack, async () => {
                    const gen = gateway.chatStream(request);
                    assert.equal((await gen.next()).done, false);
                    await assert.rejects(() => gen.next(), /interrupted/);
                });
                await eventually(async () => closed);
                assert.equal(seen.length, before + 1);
                assert.equal((await computeStore.usage(pack.id)).reservedMicrousd, "100");
            }
            finally {
                profile.timeoutMs = timeout;
                mode = "ok";
            }
        });
        await ok("compute streaming: cancellation closes transport and retains the cancelled reservation", async () => {
            const pack = await configure(policy()), before = seen.length;
            mode = "cancel";
            closed = false;
            try {
                await runWithPack(pack, async () => { const gen = gateway.chatStream(request); await gen.next(); await gen.return(undefined as never); });
                await eventually(async () => closed);
                await eventually(async () => (await one(`SELECT status FROM community_compute_reservations WHERE pack_id=$1`, [pack.id])).status === "cancelled");
                assert.equal(seen.length, before + 1);
                assert.equal((await computeStore.usage(pack.id)).reservedMicrousd, "100");
            }
            finally {
                mode = "ok";
            }
        });
        await ok("compute billing: a reported overrun disables further dispatch without clearing reservations", async () => {
            const pack = await configure(policy());
            mode = "overrun";
            try {
                await runWithPack(pack, () => remote.chat(request));
                assert.equal((await computeStore.read(pack.id)).enabled, false);
                await runWithPack(pack, () => assert.rejects(() => remote.chat(request), status(403)));
                assert.equal((await computeStore.usage(pack.id)).reservedMicrousd, "100");
            }
            finally {
                mode = "ok";
            }
        });
        await ok("compute billing: streamed costs are settled and can also stop dispatch after an overrun", async () => {
            const pack = await configure(policy());
            mode = "overrun";
            try {
                await runWithPack(pack, async () => { const gen = remote.chatStream(request); let step = await gen.next(); while (!step.done)
                    step = await gen.next(); assert.equal(step.value.estimatedCostUsd, 0.01); });
                assert.equal((await computeStore.read(pack.id)).enabled, false);
            }
            finally {
                mode = "ok";
            }
        });
        await ok("compute embeddings/local model: exact configured models are checked and local work still has an attempt cap", async () => {
            const localRoute = route({ provider: "local", region: "community", model: "synthetic-local", reservationMicrousd: 0, upstreams: [], billingBoundConfirmed: false, promptPriceMicrousdPerMillion: 0, completionPriceMicrousdPerMillion: 0 });
            const embedding = ({ ...localRoute, kind: "embeddings", model: "synthetic-embedding", maxOutputTokens: 0 }) as ComputeRoute;
            const pack = await configure(policy([localRoute, embedding], 0, 2));
            await runWithPack(pack, async () => { await local.chat({ ...request, modelProfile: "node_chat" }); assert.deepEqual(await embedLocalTexts(["private embedding"]), [[0.1, 0.2]]); await assert.rejects(() => embedLocalTexts(["again"]), status(429)); });
            assert.equal((await computeStore.usage(pack.id)).reservedMicrousd, "0");
            assert.equal((await computeStore.usage(pack.id)).attempts, 2);
        });
        await ok("compute metadata: policy/audit/reservation records contain no prompts, credentials or private context", async () => {
            const rows = await db.query(`SELECT to_jsonb(r) AS entry FROM community_compute_reservations r`);
            assert.equal(JSON.stringify(rows.rows).includes("PRIVATE-COMPUTE-CANARY"), false);
            assert.equal(JSON.stringify(rows.rows).includes("synthetic-key"), false);
            const logs = await db.query(`SELECT details FROM audit_logs WHERE entity_type='compute'`);
            assert.equal(JSON.stringify(logs.rows).includes("PRIVATE-COMPUTE-CANARY"), false);
        });
        const summaries = await db.query(`SELECT provider,kind,status,count(*)::int AS attempts,sum(reserved_microusd)::text AS "reservedMicrousd"
      FROM community_compute_reservations GROUP BY provider,kind,status ORDER BY provider,kind,status`);
        const dir = fileURLToPath(new URL("../../../../output/proof/", import.meta.url));
        mkdirSync(dir, { recursive: true });
        writeFileSync(`${dir}/p3-compute-allowance-proof.json`, JSON.stringify({ synthetic: true, externalModelCalls: 0, paidComputeUsd: 0, reservations: summaries.rows }, null, 2) + "\n");
    }
    finally {
        enforceComputePolicies(priorEnforced);
        Object.assign(env, previous);
        setRegistry(registry);
        await app.close();
        server.closeAllConnections();
        await new Promise<void>(r => server.close(() => r()));
    }
}
