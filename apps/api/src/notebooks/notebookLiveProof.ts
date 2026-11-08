import assert from 'node:assert/strict';
import { readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import Fastify from 'fastify';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { authPlugin } from '../auth/plugin.js';
import { communityStore } from '../community/store.js';
import { registerPackRoutes } from '../routes/pack.js';
import { registerCommunityGuard } from '../community/guard.js';
import { registerNotebookRoutes } from '../routes/notebooks.js';
import { registerChatRoutes } from '../routes/chat.js';
import { registerCommunityRoutes } from '../routes/community.js';
import { registerPrivacyRoutes } from '../routes/privacy.js';
import { DEFAULT_PACK_DIR,setRegistry,getRegistry } from '../pack/active.js';
import { loadPack } from '../pack/load.js';
import { buildRegistry } from '../pack/registry.js';
import { AfribitAIGateway } from '../gateway/gateway.js';
import { withModelProfiles } from '../config/modelProfiles.js';
import { TrialRecord,TRIAL_DIRECTORY } from '../showcase/trials.js';
import { REPOSITORY_ROOT } from '../showcase/revision.js';
import type { InferenceProvider,ModelProfile } from '@afribit/shared';
import { OpenNotebookClient } from '../notebooks/client.js';

const trial=new TrialRecord(TRIAL_DIRECTORY,'Real Open Notebook text lifecycle behind Afribit account authorization; synthetic processor fixture, no real LLM','open-notebook-live-proof');
const root=REPOSITORY_ROOT,dir=join(root,'internal/frontend/inspiration/2026-11-06-green');
const originalPool={query:pool.query,connect:pool.connect},originalEnv={...env},originalRegistry=getRegistry(),originalFetch=globalThis.fetch;
const originalNotebook={url:process.env.OPEN_NOTEBOOK_API_URL,password:process.env.OPEN_NOTEBOOK_PASSWORD};
const runtime=Object.fromEntries(readFileSync(join(root,'output/open-notebook-runtime/runtime.env'),'utf8').trim().split(/\r?\n/).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
const db=new PGlite({extensions:{pgcrypto}}),app=Fastify({logger:false,bodyLimit:100000});
const upstreamIds:string[]=[],checks:string[]=[],requests:{url:string;method:string}[]=[];let modelCalls=0,remoteCalls=0;
const members=[{id:randomUUID(),pack:'study-a',label:'A1'},{id:randomUUID(),pack:'study-a',label:'A2'},{id:randomUUID(),pack:'study-b',label:'B1'}];
const client=new OpenNotebookClient('http://127.0.0.1:5055',runtime.OPEN_NOTEBOOK_PASSWORD!);
async function check(name:string,work:()=>Promise<void>){await work();checks.push(name);trial.event('check',{name,passed:true});}
try{
 process.env.OPEN_NOTEBOOK_API_URL='http://127.0.0.1:5055';process.env.OPEN_NOTEBOOK_PASSWORD=runtime.OPEN_NOTEBOOK_PASSWORD;
 for(const file of readdirSync(join(root,'db/migrations')).filter(f=>f.endsWith('.sql')).sort()){
  await db.exec(readFileSync(join(root,'db/migrations',file),'utf8').replace(/CREATE EXTENSION IF NOT EXISTS vector;/g,'').replace(/CREATE INDEX idx_knowledge_embeddings_ivfflat[\s\S]*?WITH \(lists = 100\);/g,'').replace(/\bvector\(\d+\)/g,'real[]').replace(/embedding vector NOT NULL/g,'embedding real[] NOT NULL').replace(/vector_dims\(embedding\)/g,'array_length(embedding, 1)'));
 }
 const query=async(sql:string,values:unknown[]=[])=>{const r=await db.query(sql,values);return {rows:r.rows,rowCount:r.affectedRows||r.rows.length};};
 Object.assign(pool,{query,connect:async()=>({query,release(){}})});
 Object.assign(env,{inferenceMode:'node',localLlmBaseUrl:'http://127.0.0.1:9',embeddingProvider:'openrouter',cloudEmbeddingsAllowed:false,waiterQueryRewrite:false,gapLabels:false,chatRetention:{mode:'keep'},chatPipeline:'single',promptLoggingEnabled:false});
 const base=loadPack(DEFAULT_PACK_DIR).pack;assert.ok(base);
 const registry=buildRegistry(['study-a','study-b'].map(id=>({...base,id,name:'Synthetic notebook community',domain:{...base.domain,id,retrievalDomains:[id]},knowledge:{topics:[],entries:[]}})),'study-a');assert.ok(registry.registry);setRegistry(registry.registry);
 for(const p of ['study-a','study-b'])await db.query('INSERT INTO community_access_policies(pack_id,members_only) VALUES($1,true)',[p]);
 for(const m of members){await db.query("INSERT INTO users(id,email,role,created_via) VALUES($1,$2,'learner','registered')",[m.id,m.label+'@fiction.invalid']);await db.query('INSERT INTO community_memberships(pack_id,user_id) VALUES($1,$2)',[m.pack,m.id]);}
 globalThis.fetch=async(...args:Parameters<typeof fetch>)=>{const url=String(args[0]);if(!url.startsWith('http://127.0.0.1:5055/')){remoteCalls++;throw Error('No other network egress permitted');}requests.push({url,method:args[1]?.method??'GET'});return originalFetch(...args);};
 let lastPrompt='',lastSystem='';
 const fixture:InferenceProvider={name:'local',capabilities:()=>({streaming:true,maxContextTokens:32000,supportsJsonMode:false,zdrSupported:true}),health:async()=>({healthy:true,checkedAt:new Date().toISOString()}),
  async chat(request){modelCalls++;lastPrompt=JSON.stringify(request.messages);lastSystem=request.messages[0]?.content??'';assert.equal(request.contextPrivacy,'personal-local-only');assert.ok(lastPrompt.includes('FICTIONAL-STUDY-A1'));assert.ok(!lastPrompt.includes('FICTIONAL-STUDY-A2'));return {requestId:request.requestId,content:'Synthetic processor fixture response about the fictional blue book. Not an LLM quality result. [Source 1]',provider:'local',model:'synthetic-processor-fixture',usage:{promptTokens:1,completionTokens:1,totalTokens:2},latencyMs:1,finishReason:'stop',estimatedCostUsd:0};},async *chatStream(request){const result=await this.chat(request);yield result.content;return result;}};
 const gateway=new AfribitAIGateway(new Map([['local',fixture]]));
 await app.register(authPlugin);registerPackRoutes(app,communityStore);registerCommunityGuard(app);registerNotebookRoutes(app);registerCommunityRoutes(app);registerPrivacyRoutes(app);registerChatRoutes(app,gateway);await app.ready();
 const headers=(index:number,pack=members[index]!.pack)=>({authorization:'Bearer '+app.jwt.sign({id:members[index]!.id,role:'learner'}),'x-pack':pack});
 let own='',other='',source='',session='';
 const cleanupMap=async(id:string)=>{await app.inject({method:'DELETE',url:'/api/v1/notebooks/'+id,headers:headers(id===other?1:0)});};
 const profile:ModelProfile={profile:'node_chat',provider:'local',model:'synthetic-processor-fixture',fallbackProfile:null,maxOutputTokens:640,temperature:0,privacyProfile:'strict',timeoutMs:60000};
 await withModelProfiles([profile],async()=>{
  await check('live source engine rejects missing password',async()=>{const r=await originalFetch('http://127.0.0.1:5055/api/notebooks');assert.equal(r.status,401);await r.body?.cancel();});
  await check('anonymous Afribit notebook access is refused',async()=>{const r=await app.inject({method:'GET',url:'/api/v1/notebooks'});assert.equal(r.statusCode,401);});
  await check('create two account-private notebooks through real upstream API',async()=>{
   for(const index of [0,1]){const r=await app.inject({method:'POST',url:'/api/v1/notebooks',headers:headers(index),payload:{title:'Synthetic live proof '+members[index]!.label+' '+trial.id}});assert.equal(r.statusCode,201,r.body);if(index===0)own=r.json().id;else other=r.json().id;}
   const all=await db.query<{upstream_id:string}>('SELECT upstream_id FROM study_notebooks');upstreamIds.push(...all.rows.map(r=>r.upstream_id));
  });
  await check('text import, scope and plaintext reading work against real Open Notebook',async()=>{
   const refused=await app.inject({method:'POST',url:`/api/v1/notebooks/${own}/sources`,headers:headers(0),payload:{title:'Fiction',content:'Fictional text'}});assert.equal(refused.statusCode,400);
   for(const [index,id] of [[0,own],[1,other]] as const){const r=await app.inject({method:'POST',url:`/api/v1/notebooks/${id}/sources`,headers:headers(index),payload:{title:'Fictional blue book',content:`FICTIONAL-STUDY-${members[index]!.label}: The invented learning book has a blue cover.`,permissionToUse:true}});assert.equal(r.statusCode,201,r.body);if(index===0)source=r.json().id;}
   const read=await app.inject({method:'GET',url:`/api/v1/notebooks/${own}/sources/${encodeURIComponent(source)}`,headers:headers(0)});assert.equal(read.statusCode,200,read.body);assert.ok(read.json().full_text.includes('FICTIONAL-STUDY-A1'));
  });
  await check('same-community and cross-community ID guesses refused before upstream access',async()=>{
   for(const h of [headers(1),headers(2),headers(0,'study-b')]){const before=requests.length;const r=await app.inject({method:'GET',url:`/api/v1/notebooks/${own}/sources`,headers:h});assert.ok([403,404].includes(r.statusCode),r.body);assert.equal(requests.length,before);}
   const listing=await app.inject({method:'GET',url:'/api/v1/notebooks',headers:headers(1)});assert.ok(!listing.body.includes(own));
  });
  await check('notebook request binds local-only context and preserves selected Sheng pack',async()=>{
   const r=await app.inject({method:'POST',url:'/api/v1/chat',headers:headers(0),payload:{message:'Explain the fictional blue book',notebookId:own,languageMode:'sheng',processingPolicy:'configured'}});assert.equal(r.statusCode,200,r.body);assert.equal(r.json().processingPolicy,'local-only');assert.equal(r.json().answerSource,'model');session=r.json().sessionId;assert.ok(lastSystem.includes(base.modes.find(m=>m.id==='sheng')!.policyFull));
  });
  await check('resumed stream without notebook ID remains bound and local-only',async()=>{
   const r=await app.inject({method:'POST',url:'/api/v1/chat/stream',headers:headers(0),payload:{message:'Explain again',sessionId:session,processingPolicy:'configured',languageMode:'sheng'}});assert.equal(r.statusCode,200);const events=r.body.trim().split('\n').map(s=>JSON.parse(s));assert.ok(events.some(e=>e.type==='meta'&&e.processingPolicy==='local-only'));assert.ok(events.some(e=>e.type==='done'));assert.equal(events.find(e=>e.type==='done')?.answerSource,'model',JSON.stringify(events));assert.equal(modelCalls,2);
   const list=await app.inject({method:'GET',url:'/api/v1/me/conversations',headers:headers(0)});assert.equal(list.json().conversations[0].notebookId,own);
  });
  await check('deleting an account cannot orphan its upstream sources',async()=>{const r=await app.inject({method:'DELETE',url:'/api/v1/me',headers:headers(0),payload:{contributions:'keep'}});assert.equal(r.statusCode,409);});
  await check('revoked membership blocks reads but permits owned notebook erasure',async()=>{
   await db.query("UPDATE community_memberships SET revoked_at=now() WHERE user_id=$1 AND pack_id=$2",[members[0]!.id,members[0]!.pack]);
   const denied=await app.inject({method:'GET',url:`/api/v1/notebooks/${own}/sources`,headers:headers(0)});assert.equal(denied.statusCode,403);
   const removed=await app.inject({method:'DELETE',url:'/api/v1/notebooks/'+own,headers:headers(0)});assert.equal(removed.statusCode,204,removed.body);
  });
  await check('deletion removes exclusive source text upstream',async()=>{
   const r=await originalFetch('http://127.0.0.1:5055/api/sources/'+encodeURIComponent(source),{headers:{authorization:'Bearer '+runtime.OPEN_NOTEBOOK_PASSWORD}});assert.equal(r.status,404);await r.body?.cancel();await cleanupMap(other);
  });
 });
 assert.equal(remoteCalls,0);trial.finish('completed',0,{checks:checks.length,syntheticProcessorCalls:modelCalls,realLlmCalls:0,remoteRequests:remoteCalls,upstream:'Live Docker Open Notebook',sourceLifecycle:true});
 writeFileSync(join(dir,'open-notebook-live-proof.json'),JSON.stringify({trial:trial.id,checks,sourceEngine:'real Open Notebook',processor:'synthetic fixture, not an LLM',realLlmCalls:0,syntheticProcessorCalls:modelCalls,paidComputeUsd:0,remoteRequests:remoteCalls,imagePins:JSON.parse(readFileSync(join(root,'output/open-notebook-runtime/image-pins.json'),'utf8'))},null,2));
 console.log(JSON.stringify({trial:trial.id,checks:checks.length,realSourceEngine:true,realLlmCalls:0,syntheticProcessorCalls:modelCalls,paidComputeUsd:0}));
}catch(error){trial.finish('failed',0,{reason:error instanceof Error?error.message:'Live source proof failed',checks:checks.length,realLlmCalls:0,remoteRequests:remoteCalls});console.error(error instanceof Error?error.message:'Live proof failed');process.exitCode=1;}
finally{
 globalThis.fetch=originalFetch;
 for(const id of upstreamIds)await client.remove(id).catch(()=>{});
 await app.close();await db.close();Object.assign(pool,originalPool);Object.assign(env,originalEnv);setRegistry(originalRegistry);
 if(originalNotebook.url===undefined)delete process.env.OPEN_NOTEBOOK_API_URL;else process.env.OPEN_NOTEBOOK_API_URL=originalNotebook.url;
 if(originalNotebook.password===undefined)delete process.env.OPEN_NOTEBOOK_PASSWORD;else process.env.OPEN_NOTEBOOK_PASSWORD=originalNotebook.password;
}
