import assert from "node:assert/strict";
import type { ModelProfile } from "@afribit/shared";
import { env } from "../config/env.js";
import { withModelProfiles } from "../config/modelProfiles.js";
import { withIsolatedComputePolicy } from "../compute/admission.js";
import { validateComputePolicy, type ComputeRoute } from "../compute/policy.js";
import { withNativeContextBudget } from "../prompt/nativeContext.js";
import { contextHeadroom } from "../prompt/contextBudget.js";
import { ExperimentLedger } from "./ledger.js";
import { hash } from "./protocol.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { REPOSITORY_ROOT, sourceFingerprint } from "./revision.js";

export interface CommunityLeaseEvidence {
  supervisorAlive:boolean; identityVerified:boolean; needsAttention:boolean;
  deadlineAt:string; observedAt:string; worker:unknown;
  leaseFingerprint:string;
}
export function qualifyCommunityLease(e:CommunityLeaseEvidence, digest:string, now=Date.now()) {
  assert.match(e.leaseFingerprint,/^[a-f0-9]{64}$/);
  assert.ok(e.supervisorAlive===true&&e.identityVerified===true&&e.needsAttention===false,"Independent supervisor must remain armed without attention");
  assert.ok(Number.isFinite(Date.parse(e.deadlineAt))&&Date.parse(e.deadlineAt)-now>165000,"Lease must retain one 45-second request plus 120-second shutdown grace");
  assert.ok(Number.isFinite(Date.parse(e.observedAt))&&Math.abs(now-Date.parse(e.observedAt))<=15000,"Lease observation must be fresh");
  const w=e.worker as any;
  assert.ok(w?.schema===1&&w.stage==="ready"&&w.armed===true&&!w.failure,"Worker must be armed and ready");
  assert.ok(Number.isFinite(Date.parse(w.at))&&Math.abs(now-Date.parse(w.at))<=15000,"Worker evidence must be fresh");
  assert.equal(w.model,"gemma4:e4b-it-q4_K_M");assert.equal(w.bootstrap?.nodeArchiveBytesVerified,true);
  const snapshot=readFileSync(join(REPOSITORY_ROOT,"docs/evaluation/rental-artifacts-2026-10-27.json"));
  const pin=JSON.parse(snapshot.toString()).models.find((p:any)=>p.name===w.model);
  const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
  assert.equal(w.verification?.status,"completed");assert.equal(w.verification?.weightsBytesVerified,true);
  assert.equal(w.verification?.manifestDigest,digest);assert.equal(w.verification?.verifiedBytes,pin.downloadBytes);
  assert.equal(w.verification?.snapshotSha256,sha(snapshot));
  assert.equal(w.verification?.helperSha256,sha(readFileSync(join(REPOSITORY_ROOT,"tools/showcase/verify_ollama_store.py"))));
  assert.ok(Array.isArray(w.placement)&&w.placement.some((m:any)=>m.name===w.model&&typeof m.digest==="string"&&m.digest.replace(/^sha256:/,"")===digest.slice(7)&&
    Number.isFinite(m.size)&&Number.isFinite(m.sizeVram)&&m.size>0&&m.sizeVram/m.size>=.99&&m.contextLength===8192),"Expected digest/context8192/full GPU allocation evidence");
  assert.ok(Number.isSafeInteger(w.telemetry?.sampleCount)&&w.telemetry.sampleCount>=1&&w.telemetry?.failures===0&&
    ["started","completed"].includes(w.telemetry?.status),"Require real telemetry with no observed failures");
}

/** Supplied by a funded rental controller AFTER independent supervision and fresh worker checks. */
export interface CommunityLiveConnector {
  endpoint:string; bearer:string; model:string; manifestDigest:string; ledgerPath:string;
  externalChargesMicrousd:number; sourceHash:string;
  leaseFingerprint:string;
  signal:AbortSignal;
  readLeaseAndWorker:()=>Promise<CommunityLeaseEvidence>;
}
interface Member {marker:string}
export const communityLiveQuestion=(marker:string)=>`REQUEST-OWNER-${marker}: Using the approved fictional ledgerdesk schedule and prices, plan two short Bitcoin learning visits. Explain constraints without inventing times. ledgerdesk`;
/** Same bounded four normal-API requests in rehearsal and future live execution; never provisions. */
export async function runCommunityLiveSubset(connector:CommunityLiveConnector, members:Member[],
  ask:(member:Member,extra:Record<string,unknown>)=>Promise<any>, transport:typeof fetch,
  save:(name:string,value:unknown)=>void) {
  const u=new URL(connector.endpoint);
  assert.ok(u.protocol==="https:"&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==="/"&&
    (/^[a-z0-9]{1,80}-8080\.proxy\.runpod\.net$/.test(u.hostname)||u.hostname==="afribit-rehearsal-a.invalid"));
  assert.match(connector.bearer,/^[a-f0-9]{64}$/);
  assert.equal(connector.model,"gemma4:e4b-it-q4_K_M");
  assert.equal(connector.manifestDigest,"sha256:dc35e8d9c6061baa6f0fa870975ab6932e2542b579b13ea0f199fa4bb7300c9c");
  assert.match(connector.sourceHash,/^[a-f0-9]{64}$/);assert.equal(members.length,4);
  assert.equal(connector.sourceHash,sourceFingerprint(),"Live source must match the frozen controller input");assert.match(connector.leaseFingerprint,/^[a-f0-9]{64}$/);
  assert.ok(connector.signal instanceof AbortSignal && !connector.signal.aborted,"Live controller must supply a non-aborted lease signal");
  assert.deepEqual(new Set(members.map(m=>m.marker)),new Set(["A1","A2","B1","B2"]));
  // The active rental must already be included in externalCharges; no budget is invented here.
  const route:ComputeRoute={kind:"chat",provider:"local",model:connector.model,baseUrl:u.origin,region:"unrestricted",maxInputBytes:65536,
    maxOutputTokens:300,reservationMicrousd:1,billingBoundConfirmed:true,upstreams:[],promptPriceMicrousdPerMillion:0,completionPriceMicrousdPerMillion:0};
  const policy=validateComputePolicy({dailyBudgetMicrousd:10000000,dailyAttemptLimit:4,routes:[route]});
  const originalEnv={...env},previousFetch=globalThis.fetch;
  let ledger:ExperimentLedger|undefined,dispatches=0;
  const traces:any[]=[],answers:any[]=[];
  let deadlineAt:string|undefined;
  const qualify=async()=>{
    connector.signal.throwIfAborted();const evidence=await connector.readLeaseAndWorker();
    qualifyCommunityLease(evidence,connector.manifestDigest);assert.equal(evidence.leaseFingerprint,connector.leaseFingerprint);
    if(deadlineAt!==undefined)assert.equal(evidence.deadlineAt,deadlineAt,"Lease cannot be extended or replaced during the live subset");
    deadlineAt=evidence.deadlineAt;
  };
  const persist=()=>{save("live-subset-traces.json",traces);save("live-subset-answers.json",answers);};
  try{
    await qualify();
    ledger=ExperimentLedger.open(connector.ledgerPath,{fingerprint:hash({route,sourceHash:connector.sourceHash,leaseFingerprint:connector.leaseFingerprint,manifestDigest:connector.manifestDigest,context:8192,
      protocol:"normal-community-api-four-accounts-v1"}),budgetMicrousd:10000000,heldAsideMicrousd:2000000,externalChargesMicrousd:connector.externalChargesMicrousd,maxAttempts:4});
    Object.assign(env,{inferenceMode:"cloud",cloudChatProfile:"harness_live",localLlmApi:"ollama",localLlmBaseUrl:u.origin,localLlmApiKey:connector.bearer,
      localLlmDisableThinking:true,localLlmNumCtx:8192,localLlmNumGpu:undefined,promptMode:"compact",chatPipeline:"single",waiterQueryRewrite:false,gapLabels:false});
    globalThis.fetch=async(input,init)=>{
      assert.equal(String(input),`${u.origin}/api/chat`);assert.equal(init?.method,"POST");
      assert.ok(dispatches<4,"Live subset must never retry or exceed four generation attempts");
      const body=JSON.parse(String(init.body)),wire=JSON.stringify(body.messages);
      const member=members.find(m=>wire.includes(`REQUEST-OWNER-${m.marker}`));assert.ok(member);
      assert.ok(wire.includes(`REMOTE-HINT-${member.marker}`),"Expected synthetic owner's explicitly permitted memory");
      assert.ok(!/LOCAL-HARNESS-|UNAPPROVED-HARNESS-|OTHER-PACK-HARNESS/.test(wire));
      for(const other of members.filter(m=>m.marker!==member.marker))assert.ok(!wire.includes(`REMOTE-HINT-${other.marker}`)&&!wire.includes(`REQUEST-OWNER-${other.marker}`));
      const letter=member.marker[0];assert.ok(wire.includes(`SYNTHETIC-FACT-${letter}`));assert.ok(!wire.includes(`SYNTHETIC-FACT-${letter==="A"?"B":"A"}`));
      assert.equal(body.model,connector.model);assert.equal(body.options.num_ctx,8192);assert.equal(body.options.num_predict,300);assert.equal(body.options.temperature,0);assert.equal(body.think,false);
      const context=contextHeadroom(body.messages,300,8192);assert.ok(context.remainingEstimate>=0);
      connector.signal.throwIfAborted();
      await qualify();dispatches++;
      traces.push({owner:member.marker,messages:body.messages,context,model:body.model});persist();
      return transport(input,{...init,signal:AbortSignal.any([connector.signal,...(init.signal?[init.signal]:[])])});
    };
    const profile:ModelProfile={profile:"harness_live",provider:"local",model:connector.model,fallbackProfile:null,maxOutputTokens:300,temperature:0,privacyProfile:"strict",timeoutMs:45000};
    await withModelProfiles([profile],()=>withIsolatedComputePolicy(policy,ledger!,()=>withNativeContextBudget(8192,async()=>{
      for(const member of members){
        await qualify();
        const answer=await ask(member,{message:communityLiveQuestion(member.marker)});
        answers.push({member:member.marker,...answer});persist();assert.equal(answer.answerSource,"model","A reviewed fallback is not a live model success");
        assert.equal(answer.usedFallback,false);
        assert.equal(answer.answeredBy,"outside","Remote native inference must be labeled outside the community box");
        assert.equal(answer.safetyFlag,null,"Withheld/unsafe model output is not a successful live answer");
      }
    })));
    assert.equal(dispatches,4);return {dispatches,complete:answers.length,sourceHash:connector.sourceHash};
  }finally{
    try{persist();if(ledger){await ledger.drain();ledger.close();}}
    finally{globalThis.fetch=previousFetch;Object.assign(env,originalEnv);}
  }
}
