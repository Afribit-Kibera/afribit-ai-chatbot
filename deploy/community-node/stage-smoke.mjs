/** Private staging probe: synthetic content, real HTTP/database/source engine and optional local model.
 * Execute inside the API container after bootstrap. Never logs credentials or tokens. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const accounts=JSON.parse(readFileSync('/tmp/afribit-stage-accounts.json','utf8')).accounts;
const checks=[],startedAt=new Date().toISOString();let notebookId;
async function request(path,method='GET',body,token){
 const r=await fetch('http://127.0.0.1:3001/api/v1/'+path,{method,headers:{'x-pack':'kibera-bitcoin',...(token?{authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(290000)});
 const value=r.status===204?null:await r.json();return {status:r.status,value};
}
async function login(role){const a=accounts.find(a=>a.role===role);const r=await request('auth/login','POST',{email:a.email,password:a.password});assert.equal(r.status,200,'Staging sign-in');assert.ok(r.value.token);return r.value.token;}
const report={startedAt,checks,realModelCalls:0,paidComputeUsd:0,syntheticPersonalData:true};
try{
 assert.equal((await request('learning/library')).status,401);checks.push('Anonymous community library denied');
 const admin=await login('admin'),learner=await login('learner'),reviewer=await login('reviewer');
 const lib=await request('learning/library','GET',undefined,learner);assert.equal(lib.status,200);assert.equal(lib.value.sources.length,61);checks.push('Signed-in learner receives 61 installed community cards');
 assert.equal((await request('studio/drafts','GET',undefined,learner)).status,403);checks.push('Learner cannot enter Studio');
 const note=await request('me/learning/notes','POST',{content:'FICTIONAL-STAGING-NOTE'},learner);assert.equal(note.status,201);assert.equal((await request('me/learning','GET',undefined,reviewer)).value.notes.length,0);assert.equal((await request('me/learning/notes/'+note.value.id,'DELETE',undefined,learner)).status,204);checks.push('Personal note isolated and erased over real HTTP');
 const body={summary:'Fictional staging chapter; not pilot curriculum.',steps:[{id:'fixture-step',title:'Fictional staging step',explanation:'A wallet manages keys.',example:'An illustration has limits.',sourceIds:[lib.value.sources[0].id]}]};
 const d=await request('studio/drafts','POST',{kind:'path',mode:'simple_en',title:'STAGING ONLY - withdrawn smoke chapter',body},admin);assert.equal(d.status,201);assert.equal((await request('studio/drafts/'+d.value.id+'/submit','POST',{revision:1},admin)).status,200);assert.equal((await request('studio/drafts/'+d.value.id+'/review','POST',{revision:1,publish:true,note:'Self-review must fail'},admin)).status,403);assert.equal((await request('studio/drafts/'+d.value.id+'/review','POST',{revision:1,publish:true,note:'Independent check of synthetic staging behavior, not curriculum approval'},reviewer)).status,200);
 const chapter=(await request('learning/library','GET',undefined,learner)).value.paths.find(p=>p.draftId===d.value.id);assert.ok(chapter);assert.equal((await request('me/learning/progress/'+chapter.id,'PUT',{stepIndex:0,completeStep:'fixture-step'},learner)).status,200);assert.equal((await request('me/learning','GET',undefined,reviewer)).value.progress.length,0);assert.equal((await request('studio/releases/'+chapter.id+'/withdraw','POST',{reason:'Synthetic smoke artifact; never pilot curriculum'},reviewer)).status,200);assert.equal((await request('learning/paths/'+chapter.id,'GET',undefined,learner)).status,410);await request('me/learning/progress/'+chapter.id,'DELETE',undefined,learner);checks.push('Independent chapter release, own progress, withdrawal and erasure');
 const book=await request('notebooks','POST',{title:'Fictional solar staging smoke'},learner);assert.equal(book.status,201,'Real Open Notebook create');notebookId=book.value.id;
 assert.equal((await request('notebooks/'+notebookId+'/sources','GET',undefined,reviewer)).status,404);const s=await request('notebooks/'+notebookId+'/sources','POST',{title:'Fictional Sunleaf source',content:'In this fictional classroom exercise, Sunleaf is a solar cell. A solar cell turns light into electricity. Sunleaf is an invented example, not a product or operating instruction.',permissionToUse:true},learner);assert.equal(s.status,201,'Real text import');assert.equal((await request('notebooks/'+notebookId+'/sources/'+encodeURIComponent(s.value.id),'GET',undefined,learner)).status,200);checks.push('Real Open Notebook import/read with foreign-account denial');
 if(process.argv.includes('--model')){
  const began=Date.now();report.realModelCalls++;
  const answer=await request('chat','POST',{message:'From my source, what is Sunleaf and what does it do? Answer in two short sentences.',languageMode:'simple_en',explanationLevel:'simple',notebookId,processingPolicy:'local-only'},learner);
  report.model={httpStatus:answer.status,seconds:(Date.now()-began)/1000,answer:answer.value};
  assert.equal(answer.status,200);assert.ok(/Sunleaf/i.test(answer.value.content??''),'Source name missing from response');assert.ok(/electric/i.test(answer.value.content??''),'Source concept missing from response');assert.ok(!answer.value.usedFallback,'A fallback is not model proof');checks.push('Actual local-only model answered the private source question');
 }
 assert.equal((await request('notebooks/'+notebookId,'DELETE',undefined,learner)).status,204);notebookId=null;checks.push('Real source notebook erased over HTTP');
 report.status='completed';
}catch(e){report.status='failed';report.error=e.message;process.exitCode=1;}
finally{
 if(notebookId){try{const token=await login('learner');report.cleanupStatus=(await request('notebooks/'+notebookId,'DELETE',undefined,token)).status;}catch{report.cleanupStatus='needs-attention';}}
 report.finishedAt=new Date().toISOString();writeFileSync('/tmp/afribit-stage-smoke.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({status:report.status,checks:checks.length,realModelCalls:report.realModelCalls,paidComputeUsd:0,error:report.error??null}));
}
