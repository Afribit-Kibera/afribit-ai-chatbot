import assert from "node:assert/strict";
import { mkdtempSync,mkdirSync,writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMemberLanNode } from "./memberLanNode.js";
import { TrialRecord,TRIAL_DIRECTORY } from "./trials.js";
import { revisionIdentity,REPOSITORY_ROOT } from "./revision.js";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { getRegistry } from "../pack/active.js";

const trial=new TrialRecord(TRIAL_DIRECTORY,"member-lan-api-fixtures","pnpm --filter @afribit/api test:member-lan");
const dir=join(REPOSITORY_ROOT,"output/member-lan-checks",trial.id);mkdirSync(dir,{recursive:true});
const save=(name:string,data:unknown)=>writeFileSync(join(dir,name),JSON.stringify(data,null,2)+"\n",{mode:0o600});
const checks:{name:string;passed:boolean}[]=[];let node:Awaited<ReturnType<typeof createMemberLanNode>>|undefined;
const check=async(name:string,work:()=>Promise<void>)=>{try{await work();checks.push({name,passed:true});trial.event("check",{name,passed:true});}catch(e){checks.push({name,passed:false});trial.event("check",{name,passed:false});throw e;}finally{save("checks.json",checks);}};
try{
 const revision=revisionIdentity();trial.event("revision",revision);const before={query:pool.query,connect:pool.connect,fetch:globalThis.fetch,jwt:env.jwtSecret,registry:getRegistry()};
 const web=mkdtempSync(join(tmpdir(),"afribit-member-web-"));for(const sub of ["app","assets","brand","icons"])mkdirSync(join(web,sub));
 writeFileSync(join(web,"app/index.html"),"<!doctype html><body><div id='root'>Synthetic static fixture</div></body>");writeFileSync(join(web,"assets/ok.js"),"// public fixture");writeFileSync(join(web,"assets/private.env"),"synthetic-not-served");writeFileSync(join(web,"assets/private.js.map"),"synthetic-not-served");
 node=await createMemberLanNode({webRoot:web});const n=node,tokens=new Map<string,string>();
 const headers=(label:string,pack?:string)=>({authorization:`Bearer ${tokens.get(label)}`,"x-pack":pack??n.accounts.find(a=>a.label===label)!.packId});
 await check("real password login, wrong-password refusal and closed registration",async()=>{
  const refused=await n.app.inject({method:"POST",url:"/api/v1/auth/login",payload:{email:n.accounts[0]!.email,password:"wrong-synthetic-password"}});assert.equal(refused.statusCode,401);
  for(const a of n.accounts){const r=await n.app.inject({method:"POST",url:"/api/v1/auth/login",payload:{email:a.email,password:a.password}});assert.equal(r.statusCode,200);tokens.set(a.label,r.json().token);assert.equal(r.json().role,"learner");}
  const r=await n.app.inject({method:"POST",url:"/api/v1/auth/register",payload:{}});assert.equal(r.statusCode,403);
 });
 const ask=async(label:string,extra:Record<string,unknown>={})=>{const r=await n.app.inject({method:"POST",url:"/api/v1/chat",headers:headers(label),payload:{message:"When is the fictional ledgerdesk open, and what does a session cost? ledgerdesk",languageMode:"sheng",...extra}});assert.equal(r.statusCode,200);return r.json();};
 let ownedSession="";
 await check("normal generate requests return real community-specific approved cards with no LLM",async()=>{
  const a=await ask("A2",{answerMode:"generate"}),b=await ask("B2",{answerMode:"generate"});ownedSession=a.sessionId;
  assert.equal(a.answerSource,"reviewed-card");assert.equal(b.answerSource,"reviewed-card");assert.equal(a.answeredBy,"local");assert.ok(a.content.includes("Tuesday")&&a.content.includes("free")&&!a.content.includes("Friday"));assert.ok(b.content.includes("Friday")&&b.content.includes("KSh 50")&&!b.content.includes("Tuesday"));
 });
 await check("anonymous, cross-community and known foreign-conversation access are refused",async()=>{
  assert.equal((await n.app.inject({method:"POST",url:"/api/v1/chat",payload:{message:"ledgerdesk"}})).statusCode,401);
  assert.equal((await n.app.inject({method:"GET",url:"/api/v1/me/memory",headers:headers("A1","lan-b")})).statusCode,403);
  assert.equal((await n.app.inject({method:"GET",url:`/api/v1/chat/${ownedSession}`,headers:headers("A1")})).statusCode,404);
  assert.equal((await n.app.inject({method:"POST",url:"/api/v1/chat",headers:headers("A1"),payload:{message:"ledgerdesk",sessionId:ownedSession}})).statusCode,404);
 });
 await check("parallel memory transactions stay with their accounts and never enter shared cards",async()=>{
  await Promise.all(["A1","A2"].map(async label=>{const r=await n.app.inject({method:"POST",url:"/api/v1/me/memory/items",headers:headers(label),payload:{content:`FICTIONAL-PARALLEL-${label}`,allowRemote:false}});assert.equal(r.statusCode,201);}));
  for(const label of ["A1","A2"]){const r=await n.app.inject({method:"GET",url:"/api/v1/me/memory",headers:headers(label)});assert.equal(r.statusCode,200);const text=JSON.stringify(r.json());assert.ok(text.includes(`FICTIONAL-PARALLEL-${label}`));assert.ok(!text.includes(`FICTIONAL-PARALLEL-${label==="A1"?"A2":"A1"}`));}
  assert.ok(!(await ask("A2")).content.includes("FICTIONAL-PARALLEL"));
 });
 await check("real streaming remains reviewed-only and persists the correct source",async()=>{
  const r=await n.app.inject({method:"POST",url:"/api/v1/chat/stream",headers:headers("B2"),payload:{message:"ledgerdesk",languageMode:"sheng",answerMode:"generate"}});assert.equal(r.statusCode,200);assert.ok(r.body.includes('"answerSource":"reviewed-card"'));assert.ok(r.body.includes("KSh 50"));
 });
 await check("owner history is readable and can be deleted without foreign exposure",async()=>{
  assert.equal((await n.app.inject({method:"GET",url:`/api/v1/chat/${ownedSession}`,headers:headers("A2")})).statusCode,200);
  assert.equal((await n.app.inject({method:"DELETE",url:`/api/v1/chat/${ownedSession}`,headers:headers("A2")})).statusCode,204);
  assert.equal((await n.app.inject({method:"GET",url:`/api/v1/chat/${ownedSession}`,headers:headers("A2")})).statusCode,404);
 });
 await check("static allowlist refuses private paths, source maps, env and traversal",async()=>{
  const page=await n.app.inject({method:"GET",url:"/app/?pack=lan-a"});assert.equal(page.statusCode,200);assert.ok(page.body.includes("Saved approved answers only"));
  assert.equal((await n.app.inject({method:"GET",url:"/assets/ok.js"})).statusCode,200);
  for(const url of ["/.env","/assets/private.env","/assets/private.js.map","/output/credentials.json","/%2e%2e/secret","/api/v1/unknown"])assert.equal((await n.app.inject({method:"GET",url,headers:headers("A1")})).statusCode,404,url);
 });
 await check("no model or egress occurred; a second node cannot replace live process state",async()=>{
  const stats=await n.stats();assert.equal(stats.modelCalls,0);assert.equal(stats.deniedEgress,0);assert.ok(stats.retrievalQueries>0);save("metadata-before-close.json",stats);await assert.rejects(()=>createMemberLanNode({webRoot:web}));
 });
 await check("owned app/database close and restore pool, environment, registry and fetch",async()=>{
  save("cleanup-metadata.json",await n.close());assert.equal(pool.query,before.query);assert.equal(pool.connect,before.connect);assert.equal(globalThis.fetch,before.fetch);assert.equal(env.jwtSecret,before.jwt);assert.equal(getRegistry(),before.registry);
 });
 save("summary.json",{trial:trial.id,revision,checks,modelCalls:0,paidComputeUsd:0,physicalPhoneTest:false,staticWebIsFixture:true});
 trial.finish("completed",0,{artifacts:dir,checks:checks.length,modelCalls:0,physicalPhoneTest:false});console.log(JSON.stringify({trial:trial.id,checks:checks.length,passed:true,modelCalls:0}));
}catch(e){if(node)try{await node.close();}catch{}trial.finish("failed",0,{artifacts:dir,reason:"member-lan-fixture-failed",checks:checks.length,modelCalls:0});console.error(e instanceof assert.AssertionError?e.message.split("\n")[0]:"Inspect retained member-LAN check records");process.exitCode=1;}
