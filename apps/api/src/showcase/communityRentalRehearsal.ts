import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { FastifyInstance } from "fastify";
import type { PGlite } from "@electric-sql/pglite";
import type { ModelProfile } from "@afribit/shared";
import type { CommunityPack } from "../pack/types.js";
import { env } from "../config/env.js";
import { withModelProfiles } from "../config/modelProfiles.js";
import { withIsolatedComputePolicy } from "../compute/admission.js";
import { validateComputePolicy, type ComputeRoute } from "../compute/policy.js";
import { withNativeContextBudget, assertNativeContext, assertNativeCompletion } from "../prompt/nativeContext.js";
import { contextHeadroom } from "../prompt/contextBudget.js";
import { memoryStore } from "../memory/store.js";
import { ExperimentLedger } from "./ledger.js";
import { hash } from "./protocol.js";
import { REPOSITORY_ROOT, revisionIdentity } from "./revision.js";
import type { TrialRecord } from "./trials.js";
import { runCommunityLiveSubset, communityLiveQuestion, qualifyCommunityLease, type CommunityLiveConnector, type CommunityLeaseEvidence } from "./communityLiveSubset.js";

type Member = {id:string;marker:string;pack:CommunityPack};
interface Context {
  trial:TrialRecord; db:PGlite; app:FastifyInstance; members:Member[]; directory:string;
  headers:(member:Member,pack?:string)=>Record<string,string>;
  ask:(member:Member,extra?:Record<string,unknown>)=>Promise<any>;
  check:(name:string,work:()=>Promise<void>)=>Promise<void>;
  save:(name:string,value:unknown)=>void; originalFetch:typeof fetch;
}
const MODEL="gemma4:e4b-it-q4_K_M", WINDOW=8192, OUTPUT=300;
const LOGICAL=["https://afribit-rehearsal-a.invalid","https://afribit-rehearsal-b.invalid"];

/** Offline only: real API/DB/native transport/worker gate; model backend is a loopback fixture. */
export async function runCommunityRentalRehearsal(c:Context, live?:CommunityLiveConnector) {
  const originalEnv={...env},previousFetch=globalThis.fetch;
  const trace:any[]=[],backendCalls:any[]=[],answers:any[]=[],ledgers:ExperimentLedger[]=[];
  const keys=LOGICAL.map(()=>randomBytes(32).toString("hex"));
  const workerModule=await import(pathToFileURL(join(REPOSITORY_ROOT,"tools/showcase/rental_worker.mjs")).href);
  const pins=JSON.parse(readFileSync(join(REPOSITORY_ROOT,"docs/evaluation/rental-artifacts-2026-10-27.json"),"utf8"));
  const pin=pins.models.find((p:any)=>p.name===MODEL);
  let mode:"normal"|"outage"|"length"="normal",denied=0,active=0,maximumActive=0;
  const workers:any[]=[];
  const server=http.createServer(async(req,res)=>{
    const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
    const body=JSON.parse(Buffer.concat(chunks).toString());
    backendCalls.push({path:req.url,authorizationPresent:!!req.headers.authorization,stream:body.stream,options:body.options});
    active++;maximumActive=Math.max(maximumActive,active);
    try{
      if(mode==="outage"){res.writeHead(503).end("Synthetic model unavailable");return;}
      await new Promise(resolve=>setTimeout(resolve,30));
      const response={model:MODEL,message:{content:"Synthetic rehearsal answer from a simulated model; no language quality measured."},done:true,
        done_reason:mode==="length"?"length":"stop",prompt_eval_count:128,eval_count:16};
      res.writeHead(200,{"content-type":"application/x-ndjson"});
      if(body.stream){res.write(JSON.stringify({...response,done:false})+"\n");res.end(JSON.stringify({...response,message:{content:""}})+"\n");}
      else res.end(JSON.stringify(response));
    }finally{active--;}
  });
  const origin=(s:http.Server)=>`http://127.0.0.1:${(s.address() as AddressInfo).port}`;
  const persist=()=>{c.save("rental-boundary-traces.json",trace);c.save("rental-api-answers.json",answers);c.save("rental-backend-calls.json",backendCalls);};
  try{
    await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
    for(let index=0;index<2;index++){
      const config={schema:1,model:MODEL,keySha256:createHash("sha256").update(keys[index]!).digest("hex"),leaseId:randomUUID(),
        manifestDigest:pin.manifestDigest,admittedAt:new Date().toISOString(),deadlineAt:new Date(Date.now()+600000).toISOString(),contextWindowTokens:WINDOW};
      workerModule.validateWorkerConfig(config);
      // Explicitly simulated readiness metadata; no weights or GPU are inspected by this fixture.
      const sha=(file:string)=>createHash("sha256").update(readFileSync(join(REPOSITORY_ROOT,file))).digest("hex");
      const state={stage:"ready",armed:true,bootstrap:{nodeArchiveBytesVerified:true},
        verification:{status:"completed",weightsBytesVerified:true,manifestDigest:pin.manifestDigest,verifiedBytes:pin.downloadBytes,
          helperSha256:sha("tools/showcase/verify_ollama_store.py"),snapshotSha256:sha("docs/evaluation/rental-artifacts-2026-10-27.json")},
        placement:[{name:MODEL,digest:pin.manifestDigest,size:1,sizeVram:1,contextLength:8192}],telemetry:{status:"started",sampleCount:1,failures:[]}};
      const worker=workerModule.createWorkerServer(config,state,{upstream:origin(server)});
      await new Promise<void>(resolve=>worker.server.listen(0,"127.0.0.1",resolve));workers.push(worker);
    }
    // Logical remote identities preserve privacy classification. Only this interceptor maps to fixtures.
    globalThis.fetch=async(input,init)=>{
      const url=String(input),index=LOGICAL.findIndex(base=>url===`${base}/api/chat`);
      if(index<0||init?.method!=="POST"){denied++;throw new Error("Rental rehearsal refused unexpected destination");}
      const body=JSON.parse(String(init.body)),wire=JSON.stringify(body.messages);
      const owner=c.members.find(m=>wire.includes(`REQUEST-OWNER-${m.marker}`));
      assert.ok(owner,"Synthetic request owner marker required at boundary");
      assert.ok(!/LOCAL-HARNESS-|UNAPPROVED-HARNESS-|OTHER-PACK-HARNESS/.test(wire),"Forbidden synthetic private/draft context at remote boundary");
      for(const other of c.members.filter(m=>m.id!==owner.id))assert.ok(!wire.includes(`REMOTE-HINT-${other.marker}`)&&!wire.includes(`REQUEST-OWNER-${other.marker}`),"Foreign context at remote boundary");
      const letter=owner.marker[0];assert.ok(wire.includes(`SYNTHETIC-FACT-${letter}`));
      assert.ok(!wire.includes(`SYNTHETIC-FACT-${letter==="A"?"B":"A"}`));
      assert.equal(body.model,MODEL);assert.equal(body.options.num_ctx,WINDOW);assert.equal(body.options.num_predict,OUTPUT);assert.equal(body.options.temperature,0);assert.equal(body.think,false);
      const context=contextHeadroom(body.messages,OUTPUT,WINDOW);assert.ok(context.remainingEstimate>=0);
      trace.push({endpoint:index,owner:owner.marker,model:body.model,messages:body.messages,stream:body.stream,context});persist();
      return c.originalFetch(`${origin(workers[index].server)}/api/chat`,{...init,redirect:"error"});
    };
    Object.assign(env,{inferenceMode:"cloud",cloudChatProfile:"harness_rental",localLlmApi:"ollama",localLlmBaseUrl:LOGICAL[0],localLlmApiKey:keys[0],
      localLlmDisableThinking:true,localLlmNumCtx:WINDOW,localLlmNumGpu:undefined,promptMode:"compact",chatPipeline:"single",waiterQueryRewrite:false,gapLabels:false});
    const profile=(name:string):ModelProfile=>({profile:name,provider:"local",model:MODEL,fallbackProfile:null,maxOutputTokens:OUTPUT,temperature:0,privacyProfile:"strict",timeoutMs:10000});
    const routes=LOGICAL.map(baseUrl=>({kind:"chat",provider:"local",model:MODEL,baseUrl,region:"unrestricted",maxInputBytes:65536,maxOutputTokens:OUTPUT,
      reservationMicrousd:1,billingBoundConfirmed:true,upstreams:[],promptPriceMicrousdPerMillion:0,completionPriceMicrousdPerMillion:0} as ComputeRoute));
    const scope=async<T>(name:string,maxAttempts:number,work:()=>Promise<T>)=>{
      const ledger=ExperimentLedger.open(join(c.directory,`${name}-ledger.json`),{fingerprint:hash({name,revision:revisionIdentity(),routes}),budgetMicrousd:10000000,
        heldAsideMicrousd:2000000,externalChargesMicrousd:7755016,maxAttempts});ledgers.push(ledger);
      return withModelProfiles([profile("harness_rental"),profile("node_chat")],()=>withIsolatedComputePolicy(validateComputePolicy({dailyBudgetMicrousd:10000000,dailyAttemptLimit:maxAttempts,routes}),ledger,
        ()=>withNativeContextBudget(WINDOW,work)));
    };
    const question=(m:Member)=>`REQUEST-OWNER-${m.marker}: Using the approved fictional ledgerdesk schedule and prices, plan two short Bitcoin learning visits. Explain the constraints and do not invent opening times. ledgerdesk`;
    const ask=async(m:Member,extra:Record<string,unknown>={})=>{
      const answer=await c.ask(m,{message:question(m),...extra});answers.push({member:m.marker,...answer});persist();return answer;
    };
    await scope("rental-rehearsal",64,async()=>{
      await c.check("rental gate refuses anonymous/wrong-key access and never forwards its bearer to the model",async()=>{
        const before=backendCalls.length;
        for(const authorization of [undefined,`Bearer ${"f".repeat(64)}`]){
          const r=await c.originalFetch(`${origin(workers[0].server)}/v1/models`,{headers:authorization?{authorization}:{}});
          assert.equal(r.status,401);await r.body?.cancel();
        }assert.equal(backendCalls.length,before);
      });
      await c.check("four normal API members reach the rental gate with scoped retrieval and remote-permitted memory",async()=>{
        const before=trace.length;const results=await Promise.all(c.members.map(m=>ask(m)));
        assert.equal(trace.length-before,4);assert.equal(maximumActive,4);
        for(let i=0;i<c.members.length;i++){
          const member=c.members[i]!,answer=results[i];assert.equal(answer.answerSource,"model");assert.equal(answer.processingPolicy,"configured");assert.equal(answer.answeredBy,"outside");
          const t=trace.slice(before).find(t=>t.owner===member.marker);assert.ok(t&&JSON.stringify(t.messages).includes(`REMOTE-HINT-${member.marker}`));
          const row=await c.db.query<{retrieved_ids:string[]}>("SELECT retrieved_ids FROM chat_messages WHERE id=$1",[answer.messageId]);
          assert.deepEqual(row.rows[0]!.retrieved_ids,[`${member.pack.id}.desk`]);
        }
        assert.ok(backendCalls.every(c=>!c.authorizationPresent));
      });
      await c.check("rental continuation preserves owner history while known foreign IDs cause zero dispatch",async()=>{
        const owner=c.members[0]!,first=answers.find(a=>a.member===owner.marker&&a.answerSource==="model");
        const answer=await ask(owner,{sessionId:first.sessionId,message:`REQUEST-OWNER-${owner.marker}: Explain the earlier ledgerdesk plan more simply.`});assert.equal(answer.answerSource,"model");
        assert.ok(trace.at(-1).messages.some((m:any)=>m.role==="assistant"));
        const before=trace.length;
        for(const other of [c.members[1]!,c.members[2]!]){
          const response=await c.app.inject({method:"POST",url:"/api/v1/chat",headers:c.headers(other),payload:{sessionId:first.sessionId,message:question(other)}});assert.equal(response.statusCode,404);
        }assert.equal(trace.length,before);
      });
      await c.check("reviewed-only and local-only normal API requests have zero rental egress",async()=>{
        const before=trace.length;
        const reviewed=await ask(c.members[0]!,{answerMode:"reviewed-only"});assert.equal(reviewed.answerSource,"reviewed-card");assert.equal(reviewed.answeredBy,"local");
        const answer=await ask(c.members[1]!,{processingPolicy:"local-only"});assert.equal(answer.answerSource,"reviewed-fallback");assert.equal(answer.processingPolicy,"local-only");
        assert.equal(trace.length,before);
      });
      await c.check("revoking a personal note's remote permission removes it from subsequent rental requests",async()=>{
        const member=c.members[1]!,notes=await memoryStore.list(member.id,member.pack.id),note=notes.items.find(n=>n.content.includes(`REMOTE-HINT-${member.marker}`))!;
        await memoryStore.update(member.id,member.pack.id,note.id,note.version,note.content,false);
        assert.equal((await ask(member)).answerSource,"model");assert.ok(!JSON.stringify(trace.at(-1).messages).includes(`REMOTE-HINT-${member.marker}`));
      });
      await c.check("deleting an allowed note removes it from subsequent rental requests without publishing private notes",async()=>{
        const member=c.members[2]!,notes=await memoryStore.list(member.id,member.pack.id),note=notes.items.find(n=>n.content.includes(`REMOTE-HINT-${member.marker}`))!;
        const response=await c.app.inject({method:"DELETE",url:`/api/v1/me/memory/items/${note.id}`,headers:c.headers(member)});assert.equal(response.statusCode,204);
        assert.equal((await ask(member)).answerSource,"model");assert.ok(!JSON.stringify(trace.at(-1).messages).includes(`REMOTE-HINT-${member.marker}`));
        const shared=await c.db.query<{n:number}>("SELECT count(*)::int AS n FROM knowledge_entries WHERE canonical_answer LIKE '%LOCAL-HARNESS-%' OR canonical_answer LIKE '%REMOTE-HINT-%'");assert.equal(shared.rows[0]!.n,0);
      });
      await c.check("an approved local-record update changes the next retrieved passage with the same model and no training",async()=>{
        const member=c.members[0]!,updated="SYNTHETIC-FACT-A: fictional ledgerdesk opens Wednesday 15:00 to 17:00; sessions are free. Invented test update.";
        await c.db.query("UPDATE knowledge_entries SET canonical_answer=$2,beginner_answer=$2,version=version+1 WHERE id=$1",[`${member.pack.id}.desk`,updated]);
        assert.equal((await ask(member)).answerSource,"model");assert.ok(JSON.stringify(trace.at(-1).messages).includes(updated));
      });
      await c.check("switching an eligible endpoint preserves the same local accounts, knowledge and history",async()=>{
        const before=await c.db.query("SELECT id,canonical_answer FROM knowledge_entries ORDER BY id");
        Object.assign(env,{localLlmBaseUrl:LOGICAL[1],localLlmApiKey:keys[1]});
        try{assert.equal((await ask(c.members[0]!)).answerSource,"model");assert.equal(trace.at(-1).endpoint,1);}
        finally{Object.assign(env,{localLlmBaseUrl:LOGICAL[0],localLlmApiKey:keys[0]});}
        assert.deepEqual((await c.db.query("SELECT id,canonical_answer FROM knowledge_entries ORDER BY id")).rows,before.rows);
      });
      await c.check("rental outage returns a reviewed local answer without another provider or privacy downgrade",async()=>{
        mode="outage";const before=trace.length;
        try{assert.equal((await ask(c.members[0]!)).answerSource,"reviewed-fallback");}finally{mode="normal";}
        assert.equal(trace.length-before,1);assert.equal(trace.at(-1).endpoint,0);
      });
      await c.check("member HTTP remains available during remote socket loss and the same conversation recovers without duplicate turns",async()=>{
        await c.app.listen({host:"127.0.0.1",port:0});
        const memberOrigin=origin(c.app.server),workerPort=(workers[0].server.address() as AddressInfo).port,member=c.members[0]!,evidence:any[]=[];
        const memberRequest=async(extra:Record<string,unknown>={})=>{
          const started=performance.now();
          const response=await c.originalFetch(`${memberOrigin}/api/v1/chat`,{method:"POST",headers:{"content-type":"application/json",...c.headers(member)},
            body:JSON.stringify({message:question(member),languageMode:"sheng",explanationLevel:"simple",...extra}),signal:AbortSignal.timeout(10000)});
          assert.equal(response.status,200);const answer=await response.json() as any;
          evidence.push({answerSource:answer.answerSource,processingPolicy:answer.processingPolicy,elapsedHttpMs:performance.now()-started,sessionId:answer.sessionId,messageId:answer.messageId});return answer;
        };
        const beforeBackend=backendCalls.length;
        workers[0].server.closeAllConnections();await new Promise<void>(resolve=>workers[0].server.close(resolve));
        let failed:any;
        try{
          failed=await memberRequest();assert.equal(failed.answerSource,"reviewed-fallback");assert.equal(failed.usedFallback,true);
          const before=trace.length;
          assert.equal((await memberRequest({answerMode:"reviewed-only"})).answerSource,"reviewed-card");
          assert.equal((await memberRequest({processingPolicy:"local-only"})).answerSource,"reviewed-fallback");
          assert.equal(trace.length,before);assert.equal(backendCalls.length,beforeBackend);
        }finally{await new Promise<void>(resolve=>workers[0].server.listen(workerPort,"127.0.0.1",resolve));}
        const restored=await memberRequest({sessionId:failed.sessionId});assert.equal(restored.answerSource,"model");assert.equal(restored.answeredBy,"outside");
        assert.equal(backendCalls.length,beforeBackend+1);
        const turns=await c.db.query<{role:string;n:number}>("SELECT role,count(*)::int AS n FROM chat_messages WHERE session_id=$1 GROUP BY role",[failed.sessionId]);
        assert.deepEqual(Object.fromEntries(turns.rows.map(r=>[r.role,r.n])),{user:2,assistant:2});
        const lastTrace=trace.at(-1);assert.ok(lastTrace.messages.some((m:any)=>m.role==="assistant"));
        const measurements=await c.db.query<{latency_ms:number;prompt_tokens:number;completion_tokens:number;retrieved_ids:string[]}>(
          "SELECT latency_ms,prompt_tokens,completion_tokens,retrieved_ids FROM chat_messages WHERE id=$1",[restored.messageId]);
        const stored=measurements.rows[0]!;assert.ok(Number.isFinite(stored.latency_ms)&&stored.latency_ms>=0);
        assert.ok(stored.prompt_tokens>0&&stored.completion_tokens>0);assert.ok(stored.retrieved_ids.length>0);
        c.save("member-network-recovery.json",{physicalMeshTest:false,remoteSocketClosedAndRestarted:true,memberHttpListener:"loopback",evidence,
          backendCallsDuringOutage:0,backendCallsAfterReconnect:1,conversationTurns:turns.rows,
          limitations:["Model replies are fixtures","No Wi-Fi, mobile data, routing, DNS or real uplink was changed","Same process/host; not physical network proof"]});
      });
      await c.check("revoked rental credentials produce reviewed fallback and zero model-backend calls",async()=>{
        Object.assign(env,{localLlmApiKey:"f".repeat(64)});const before=backendCalls.length;
        try{assert.equal((await ask(c.members[0]!)).answerSource,"reviewed-fallback");}finally{Object.assign(env,{localLlmApiKey:keys[0]});}
        assert.equal(backendCalls.length,before);
      });
      await c.check("assembled context overflow and runtime mismatch fail before rental transport or ledger reservation",async()=>{
        const before=trace.length,count=ledgers[0]!.snapshot().attempts.length;
        assert.equal((await ask(c.members[0]!,{message:`${question(c.members[0]!)} ${"x".repeat(7000)}`})).answerSource,"reviewed-fallback");
        Object.assign(env,{localLlmNumCtx:4096});
        try{assert.equal((await ask(c.members[0]!)).answerSource,"reviewed-fallback");}finally{Object.assign(env,{localLlmNumCtx:WINDOW});}
        assert.equal(trace.length,before);assert.equal(ledgers[0]!.snapshot().attempts.length,count);
      });
      await c.check("length-limited normal API generation is a reviewed fallback, never a complete model answer",async()=>{
        mode="length";
        try{
          const answer=await ask(c.members[0]!);assert.equal(answer.answerSource,"reviewed-fallback");assert.equal(answer.usedFallback,true);
          const member=c.members[0]!;
          const streamed=await c.app.inject({method:"POST",url:"/api/v1/chat/stream",headers:c.headers(member),payload:{message:question(member),languageMode:"sheng",explanationLevel:"simple"}});
          c.save("incomplete-stream-evidence.json",{body:streamed.body,warning:"After a streamed prefix, the normal API reports interruption instead of silently appending a different answer"});
          assert.equal(streamed.statusCode,200);
          const events=streamed.body.trim().split("\n").map(line=>JSON.parse(line));
          assert.ok(events.some(e=>e.type==="error"&&e.message.includes("interrupted")));
          const done=events.find(e=>e.type==="done");assert.ok(done);
          const row=await c.db.query<{safety_flag:string}>("SELECT safety_flag FROM chat_messages WHERE id=$1",[done.messageId]);assert.equal(row.rows[0]!.safety_flag,"stream_interrupted");
        }finally{mode="normal";}
      });
      await c.check("native streaming uses the same normal API, gate and context contract",async()=>{
        const member=c.members[3]!,before=trace.length;
        const result=await c.app.inject({method:"POST",url:"/api/v1/chat/stream",headers:c.headers(member),payload:{message:question(member),languageMode:"sheng",explanationLevel:"simple"}});
        assert.equal(result.statusCode,200);assert.equal(trace.length-before,1);assert.equal(trace.at(-1).stream,true);
        assert.ok(result.body.includes("Synthetic rehearsal answer"));assert.ok(result.body.includes('"usedFallback":false'));assert.ok(result.body.includes('"answeredBy":"outside"'));
      });
    });
    await scope("rental-quota",1,async()=>{
      await c.check("an exhausted request allowance falls back locally with no second remote dispatch",async()=>{
        assert.equal((await ask(c.members[0]!)).answerSource,"model");const before=trace.length;
        assert.equal((await ask(c.members[0]!)).answerSource,"reviewed-fallback");assert.equal(trace.length,before);
      });
    });
    // Restore only the self-created synthetic test notes for the frozen four-account live subset.
    for(const member of c.members){
      const notes=await memoryStore.list(member.id,member.pack.id),note=notes.items.find(n=>n.content.includes(`REMOTE-HINT-${member.marker}`));
      if(note&&!note.allow_remote)await memoryStore.update(member.id,member.pack.id,note.id,note.version,note.content,true);
      else if(!note)await memoryStore.create(member.id,member.pack.id,`REMOTE-HINT-${member.marker}: prefers brief explanations`,true);
    }
    c.trial.event("live-fixture-reset",{syntheticOnly:true,accounts:4});
    await c.check("the live controller hook makes exactly four normal API calls and checks supervision before each dispatch",async()=>{
      let supervisionChecks=0;
      const deadlineAt=new Date(Date.now()+600000).toISOString();
      const connector:CommunityLiveConnector={endpoint:LOGICAL[0]!,bearer:keys[0]!,model:MODEL,manifestDigest:pin.manifestDigest,
        ledgerPath:join(c.directory,"live-hook-fixture-ledger.json"),externalChargesMicrousd:7755016,sourceHash:revisionIdentity().sourceHash,
        leaseFingerprint:"a".repeat(64),
        signal:new AbortController().signal,
        readLeaseAndWorker:async()=>{
          supervisionChecks++;assert.ok(workers[0].server.listening);
          const response=await c.originalFetch(`${origin(workers[0].server)}/trial-status`,{headers:{authorization:`Bearer ${keys[0]}`}});assert.equal(response.status,200);
          return {supervisorAlive:true,identityVerified:true,needsAttention:false,leaseFingerprint:"a".repeat(64),observedAt:new Date().toISOString(),deadlineAt,worker:await response.json()};}};
      const transport:typeof fetch=async(input,init)=>{
        assert.equal(String(input),`${LOGICAL[0]}/api/chat`);
        return c.originalFetch(`${origin(workers[0].server)}/api/chat`,init);
      };
      const before=backendCalls.length;
      const result=await runCommunityLiveSubset(connector,c.members,(m,extra)=>c.ask(c.members.find(member=>member.marker===m.marker)!,extra),transport,
        (name,value)=>c.save(`fixture-${name}`,value));
      assert.equal(result.dispatches,4);assert.equal(backendCalls.length-before,4);assert.ok(supervisionChecks>=9);
    });
    await c.check("the live hook refuses a lost supervisor before any ledger or network work",async()=>{
      const connector:CommunityLiveConnector={endpoint:LOGICAL[0]!,bearer:keys[0]!,model:MODEL,manifestDigest:pin.manifestDigest,
        ledgerPath:join(c.directory,"lost-supervisor-ledger.json"),externalChargesMicrousd:7755016,sourceHash:revisionIdentity().sourceHash,
        leaseFingerprint:"a".repeat(64),
        signal:new AbortController().signal,
        readLeaseAndWorker:async()=>{throw new Error("Synthetic supervisor unavailable");}};
      let calls=0;
      await assert.rejects(()=>runCommunityLiveSubset(connector,c.members,async()=>{calls++;return {};},async()=>{calls++;throw new Error("No transport");},
        (name,value)=>c.save(`lost-supervisor-${name}`,value)));
      assert.equal(calls,0);
    });
    await c.check("live readiness rejects stale, mismatched, unverified or unsupervised worker evidence",async()=>{
      const response=await c.originalFetch(`${origin(workers[0].server)}/trial-status`,{headers:{authorization:`Bearer ${keys[0]}`}});
      const evidence:CommunityLeaseEvidence={supervisorAlive:true,identityVerified:true,needsAttention:false,leaseFingerprint:"a".repeat(64),observedAt:new Date().toISOString(),deadlineAt:new Date(Date.now()+600000).toISOString(),worker:await response.json()};
      assert.doesNotThrow(()=>qualifyCommunityLease(evidence,pin.manifestDigest));
      for(const patch of [{supervisorAlive:false},{identityVerified:false},{needsAttention:true},{observedAt:"2020-01-01T00:00:00.000Z"},{deadlineAt:new Date(Date.now()+120000).toISOString()}])assert.throws(()=>qualifyCommunityLease({...evidence,...patch},pin.manifestDigest));
      for(const patch of [{at:"2020-01-01T00:00:00.000Z"},{stage:"warming"},{armed:false},{verification:{weightsBytesVerified:false}},{placement:[{name:MODEL,digest:pin.manifestDigest,size:1,sizeVram:1,contextLength:4096}]},{telemetry:{sampleCount:1,failures:1}},
        {telemetry:{status:"started",sampleCount:"1",failures:0}},{telemetry:{status:"started",sampleCount:Infinity,failures:0}},{telemetry:{status:"unknown",sampleCount:1,failures:0}}])assert.throws(()=>qualifyCommunityLease({...evidence,worker:{...(evidence.worker as any),...patch}},pin.manifestDigest));
    });
    await c.check("native context contracts remain isolated across async work and do not change unscoped deployments",async()=>{
      const messages=[{role:"user" as const,content:"x".repeat(200)}];
      await Promise.all([512,8192].map(window=>withNativeContextBudget(window,async()=>{
        await new Promise(resolve=>setTimeout(resolve,1));
        if(window===512)assert.throws(()=>assertNativeContext(messages,300,"ollama",window),/headroom/);
        else assert.doesNotThrow(()=>assertNativeContext(messages,300,"ollama",window));
        assert.throws(()=>withNativeContextBudget(window,()=>null),/nested/);
        assert.throws(()=>assertNativeCompletion("length"),/incomplete/);
      })));
      assert.doesNotThrow(()=>assertNativeCompletion("length"));
    });
    let liveSubset=null;
    if(live) liveSubset=await runCommunityLiveSubset(live,c.members,(m,extra)=>c.ask(c.members.find(member=>member.marker===m.marker)!,extra),c.originalFetch,c.save);
    assert.equal(denied,0);persist();
    const readiness={schema:1,kind:"offline-community-rental-handoff",trial:c.trial.id,revision:revisionIdentity(),synthetic:true,
      liveExecuted:!!live,model:MODEL,manifestDigest:pin.manifestDigest,promptMode:"compact",contextWindowTokens:WINDOW,maxOutputTokens:OUTPUT,temperature:0,
      workerSourceSha256:createHash("sha256").update(readFileSync(join(REPOSITORY_ROOT,"tools/showcase/rental_worker.mjs"))).digest("hex"),
      liveSubset:{maximumGenerationAttempts:4,concurrency:1,communities:2,accounts:4,
        questions:c.members.map(m=>({owner:m.marker,message:communityLiveQuestion(m.marker)})),
        mustExclude:["local-only memory","foreign accounts/history","draft knowledge","other-community knowledge"],requireComplete:true},
      gates:{newPaidAllocation:false,exactTokenizerQualified:false,real8192GpuPlacementQualified:false,independentSupervisorArmed:false,
        authenticatedFreshWorkerVerified:false,liveControllerHookFixtureVerified:true,humanLanguageReview:false},
      controllerHook:"runCommunityHarness(trial,false,true,connector); caller owns funded lease, fresh readiness and independent shutdown",
      originalExperiment:{budgetMicrousd:10000000,heldMicrousd:9755016,unallocatedMicrousd:244984,reservationsRefunded:false},
      boundaries:["Synthetic PGlite/lexical retrieval only; no production database","Logical HTTPS identities map to loopback HTTP fixtures, not live TLS proof",
        "Worker/gate code is real; readiness/model replies/placement are simulated","Approved-record update is not publication-governance verification",
        "No local LLM, GPU, Mesh, private-document ACL, heavy-reasoning quality or TEE proof"]};
    c.save("live-handoff.json",readiness);
    return {boundaryRequests:trace.length,backendCalls:backendCalls.length,maximumActive,deniedEgress:denied,liveExecuted:!!live,liveSubset,modelCalls:liveSubset?.dispatches??0};
  }finally{
    try{persist();for(const ledger of ledgers){await ledger.drain();ledger.close();}}
    finally{
      for(const worker of workers){worker.server.closeAllConnections();await new Promise<void>(resolve=>worker.server.close(resolve));}
      server.closeAllConnections();if(server.listening)await new Promise<void>(resolve=>server.close(()=>resolve()));
      globalThis.fetch=previousFetch;Object.assign(env,originalEnv);
      c.trial.event("rental-rehearsal-cleanup",{workersClosed:workers.every(w=>!w.server.listening),backendClosed:!server.listening});
    }
  }
}
