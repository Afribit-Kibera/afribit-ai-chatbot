import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { authPlugin } from "../auth/plugin.js";
import { hashPassword } from "../auth/passwords.js";
import { registerAuthRoutes } from "../routes/auth.js";
import { registerCommunityRoutes } from "../routes/community.js";
import { registerPackRoutes } from "../routes/pack.js";
import { registerCommunityGuard } from "../community/guard.js";
import { communityStore } from "../community/store.js";
import { registerChatRoutes } from "../routes/chat.js";
import { registerMemoryRoutes } from "../routes/memory.js";
import { registerPreferenceRoutes } from "../routes/preferences.js";
import { registerPrivacyRoutes } from "../routes/privacy.js";
import { memoryStore } from "../memory/store.js";
import { AfribitAIGateway } from "../gateway/gateway.js";
import { enforceComputePolicies } from "../compute/admission.js";
import { withProcessingPolicy } from "../privacy/contextPolicy.js";
import { loadPack } from "../pack/load.js";
import { DEFAULT_PACK_DIR, getRegistry, setRegistry } from "../pack/active.js";
import { buildRegistry } from "../pack/registry.js";
import { REPOSITORY_ROOT } from "./revision.js";

let active = false;
export interface LanAccount { id: string; email: string; password: string; packId: string; label: string }

/** Process-isolated operator node, never the production server. All content is fictional. */
export async function createMemberLanNode(options: { webRoot?: string } = {}) {
  if (active) throw new Error("A synthetic LAN node already owns this process");
  active = true;
  const originalEnv = { ...env }, originalPool = { query: pool.query, connect: pool.connect }, originalRegistry = getRegistry(), originalFetch = globalThis.fetch;
  const previousEnforcement = enforceComputePolicies(true);
  const db = new PGlite({ extensions: { pgcrypto } });
  const app = Fastify({ logger: false, bodyLimit: 32768, forceCloseConnections: true });
  let deniedEgress = 0, modelCalls = 0, retrievalQueries = 0, closed = false, metricsAfterClose: unknown = null;
  const accounts: LanAccount[] = [];
  let lockTail = Promise.resolve();
  const acquire = async () => { let release!: () => void; const before = lockTail; lockTail = new Promise<void>(r => { release = r; }); await before; return release; };
  const directQuery = async (sql: string, values: unknown[] = []) => {
    if (/FROM (knowledge_entries|language_entries)\b/.test(sql)) retrievalQueries++;
    const result = await db.query(sql, values); return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
  };
  const lockedQuery = async (sql: string, values: unknown[] = []) => { const release = await acquire(); try { return await directQuery(sql, values); } finally { release(); } };
  const stats = async () => {
    const counts = await lockedQuery("SELECT (SELECT count(*)::int FROM chat_sessions) AS sessions,(SELECT count(*)::int FROM chat_messages) AS messages,(SELECT count(*)::int FROM personal_memory_items) AS notes");
    const sources = await lockedQuery("SELECT answer_source AS source,count(*)::int AS n FROM chat_messages WHERE role='assistant' GROUP BY answer_source");
    return { counts: counts.rows[0], sources: sources.rows, deniedEgress, modelCalls, retrievalQueries, syntheticOnly: true, reviewedOnly: true };
  };
  const close = async () => {
    if (closed) return metricsAfterClose; closed = true;
    try { await app.close(); metricsAfterClose = await stats(); }
    finally {
      try { await db.close(); }
      finally { Object.assign(pool, originalPool); Object.assign(env, originalEnv); setRegistry(originalRegistry); enforceComputePolicies(previousEnforcement); globalThis.fetch = originalFetch; active = false; }
    }
    return metricsAfterClose;
  };
  try {
    for (const name of readdirSync(join(REPOSITORY_ROOT, "db/migrations")).filter(n => n.endsWith(".sql")).sort())
      await db.exec(readFileSync(join(REPOSITORY_ROOT, "db/migrations", name), "utf8")
        .replace(/CREATE EXTENSION IF NOT EXISTS vector;/g, "")
        .replace(/CREATE INDEX idx_knowledge_embeddings_ivfflat[\s\S]*?WITH \(lists = 100\);/g, "")
        .replace(/\bvector\(\d+\)/g, "real[]").replace(/embedding vector NOT NULL/g, "embedding real[] NOT NULL")
        .replace(/vector_dims\(embedding\)/g, "array_length(embedding, 1)"));
    Object.assign(pool, { query: lockedQuery, connect: async () => {
      const release = await acquire(); let done = false;
      return { query: directQuery, release: () => { if (!done) { done = true; release(); } } };
    } });
    Object.assign(env, { jwtSecret: randomBytes(32).toString("hex"), registration: "closed", inferenceMode: "node", modelLocationSetting: "auto",
      localLlmBaseUrl: "http://127.0.0.1:9", localLlmApiKey: "", openRouterApiKey: "", embeddingProvider: "openrouter", cloudEmbeddingsAllowed: false,
      waiterQueryRewrite: false, gapLabels: false, chatRetention: { mode: "keep" }, chatPipeline: "single", promptLoggingEnabled: false });
    globalThis.fetch = async () => { deniedEgress++; throw new Error("Synthetic LAN node forbids model/network egress"); };
    const report = loadPack(DEFAULT_PACK_DIR); assert.ok(report.ok && report.pack);
    const packs = ["a", "b"].map(letter => ({ ...report.pack!, id: `lan-${letter}`, name: `Fictional LAN community ${letter.toUpperCase()}`,
      community: { name: `Synthetic test community ${letter.toUpperCase()}` }, description: "Temporary fictional member test; reviewed local cards only, no LLM",
      domain: { ...report.pack!.domain, id: `lan-${letter}`, retrievalDomains: [`lan-${letter}`] }, knowledge: { topics: [], entries: [] },
      branding: { ...report.pack!.branding, shortName: `LAN community ${letter.toUpperCase()}`, tagline: "Synthetic local test" },
      starterQuestions: { reviewed: true, byMode: Object.fromEntries(report.pack!.modes.map(m => [m.id, ["When is the fictional ledgerdesk open, and what does a session cost? ledgerdesk"]])) } }));
    const registry = buildRegistry(packs, packs[0]!.id); assert.ok(registry.ok && registry.registry); setRegistry(registry.registry);
    for (const [index, pack] of packs.entries()) {
      await lockedQuery("INSERT INTO community_access_policies(pack_id,members_only) VALUES($1,true)", [pack.id]);
      const facts = index === 0 ? "Fictional ledgerdesk opens Tuesday 14:00 to 16:00 (2:00pm to 4:00pm); sessions are free. No appointment dates are supplied. Synthetic test data only."
        : "Fictional ledgerdesk opens Friday 09:00 to 11:00 (9:00am to 11:00am); each session costs KSh 50. No appointment dates are supplied. Synthetic test data only.";
      await lockedQuery("INSERT INTO knowledge_entries(id,title,domain,canonical_answer,beginner_answer,status,community_pack_id) VALUES($1,'ledgerdesk',$2,$3,$3,'approved',$2)", [`${pack.id}.desk`, pack.id, facts]);
      for (const n of [1, 2]) {
        const label = `${index === 0 ? "A" : "B"}${n}`, id = `64000000-0000-4000-8000-0000000000${index}${n}`;
        const email = `${label.toLowerCase()}@lan.invalid`, password = randomBytes(12).toString("base64url");
        await lockedQuery("INSERT INTO users(id,email,password_hash,display_name,role,created_via) VALUES($1,$2,$3,$4,'learner','registered')", [id,email,await hashPassword(password),`Synthetic ${label}`]);
        await lockedQuery("INSERT INTO community_memberships(pack_id,user_id) VALUES($1,$2)", [pack.id,id]);
        await memoryStore.enable(id,pack.id,true); await memoryStore.create(id,pack.id,`FICTIONAL-OWNER-${label}: prefers garden examples`,false);
        accounts.push({id,email,password,packId:pack.id,label});
      }
    }
    await app.register(rateLimit,{max:200,timeWindow:"1 minute"}); await app.register(authPlugin);
    registerPackRoutes(app,communityStore); registerCommunityGuard(app);
    app.addHook("onRequest",(_request,_reply,done)=>withProcessingPolicy({localOnly:true,reviewedOnly:true},done));
    app.addHook("onSend",async (_request,reply,payload)=>{ reply.header("cache-control","no-store");reply.header("x-content-type-options","nosniff");return payload; });
    registerAuthRoutes(app);registerCommunityRoutes(app);registerMemoryRoutes(app);registerPreferenceRoutes(app);registerPrivacyRoutes(app);
    const gateway = new AfribitAIGateway(new Map()); gateway.setMeter(async()=>{modelCalls++;});registerChatRoutes(app,gateway);
    const assets = new Map<string,{bytes:Buffer;type:string}>(),dist=options.webRoot??join(REPOSITORY_ROOT,"apps/web/dist");
    const types:Record<string,string>={"js":"text/javascript","css":"text/css","woff2":"font/woff2","png":"image/png","svg":"image/svg+xml","ico":"image/x-icon","webp":"image/webp","avif":"image/avif"};
    for (const folder of ["assets","brand","icons"]) {
      const walk=(path:string)=>{for(const entry of readdirSync(path,{withFileTypes:true})){const full=join(path,entry.name);if(entry.isDirectory())walk(full);else{const type=types[entry.name.split(".").at(-1)!];if(type)assets.set('/'+relative(dist,full).replace(/\\/g,'/'),{bytes:readFileSync(full),type});}}};walk(join(dist,folder));
    }
    const banner='<aside role="status" style="padding:12px;background:#153c2b;color:white;font:14px system-ui;text-align:center">Synthetic Wi-Fi test · Saved approved answers only · No LLM or GPU · Use fictional inputs only</aside>';
    for (const route of ["/app","/app/","/app/settings","/app/settings/","/app/contribute","/app/contribute/"])
      assets.set(route,{bytes:Buffer.from(readFileSync(join(dist,"app/index.html"),"utf8").replace(/<body>/,"<body>"+banner)),type:"text/html; charset=utf-8"});
    if(existsSync(join(dist,"manifest.webmanifest")))assets.set("/manifest.webmanifest",{bytes:readFileSync(join(dist,"manifest.webmanifest")),type:"application/manifest+json"});
    app.get("/",async(_req,reply)=>reply.redirect("/app/?pack=lan-a"));
    app.get("/*",async(req,reply)=>{const file=assets.get(req.url.split("?")[0]!);if(!file)return reply.status(404).send({error:"Not found"});return reply.type(file.type).send(file.bytes);});
    await app.ready();
    return {app,accounts,packs: packs.map(p=>p.id),stats,close,setOrigin:(origin:string)=>{env.corsOrigins=[origin];},staticAssetCount:assets.size};
  } catch(error) { await close();throw error; }
}
