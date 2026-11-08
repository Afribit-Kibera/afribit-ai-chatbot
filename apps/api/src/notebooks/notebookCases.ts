import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OpenNotebookClient } from './client.js';
import { NotebookService, type NotebookStore, studyText } from './service.js';
import { withProcessingPolicy, assertContextPolicy } from '../privacy/contextPolicy.js';
import { sourceExcerpt } from './excerpt.js';
import {buildNotebookPrompt} from './prompt.js';
import {getPack} from '../pack/active.js';
import {env} from '../config/env.js';
const id='11111111-1111-4111-8111-111111111111';
test('compact source teaching keeps safety and fits a modest prompt budget in English and Sheng',()=>{
 const old=env.promptMode;env.promptMode='compact';
 try{for(const mode of ['simple_en','sheng']){
  const messages=buildNotebookPrompt(getPack(),mode,'simple',[],'What does this source say?');
  const prompt=messages[0]!.content;
  assert.ok(Buffer.byteLength(prompt,'utf8')<6000,'Compact teaching prompt exceeded the reserved source/context budget');
  assert.ok(prompt.includes('untrusted reference data'));
  assert.ok(prompt.includes('Do not invent sources'));
  assert.ok(prompt.includes('Never ask for'));
  assert.ok(prompt.includes('A wallet does not hold coins'));
  assert.ok(prompt.includes(getPack().modes.find(m=>m.id===mode)!.rulesCompact));
  assert.equal(messages.at(-1)!.role,'user');
  assert.equal(messages.at(-1)!.content,'What does this source say?');
 }}finally{env.promptMode=old;}
});
function fixture(options:{sourceScope?:string[];sources?:number}={}){
 const calls:{url:string;method:string;body:any}[]=[];
 const transport:typeof fetch=async(input,init)=>{
  const url=String(input);calls.push({url,method:init?.method??'GET',body:init?.body?JSON.parse(String(init.body)):null});
  let value:any={};
  if(url.includes('/sources?'))value=Array.from({length:options.sources??1},(_,i)=>({id:`source:${i}`,title:`Book ${i}`}));
  else if(url.includes('/sources/source'))value={id:'source:0',title:'Book',full_text:'FICTIONAL_SOURCE '.repeat(1000),notebooks:options.sourceScope??['notebook:own']};
  else if(url.endsWith('/sources/json'))value={id:'source:new',title:'Added',notebooks:['notebook:own']};
  else if(url.endsWith('/notebooks'))value={id:'notebook:new'};
  return new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
 };
 const store:NotebookStore={
  list:async(user,pack)=>user==='alice'&&pack==='community-a'?[{id,title:'Private',upstream_id:'notebook:own'}]:[],
  own:async(user,pack,item)=>user==='alice'&&pack==='community-a'&&item===id?{id,title:'Private',upstream_id:'notebook:own'}:null,
  create:async(_u,_p,title,upstream_id)=>({id,title,upstream_id}),remove:async()=>{},
 };
 const client=new OpenNotebookClient('http://127.0.0.1:5055','test-only-placeholder',transport);
 return {calls,service:new NotebookService(store,()=>client)};
}
test('other account, other community and guest cannot inspect a notebook or touch upstream',async()=>{
 const {service,calls}=fixture();
 for(const [user,pack] of [['bob','community-a'],['alice','community-b'],[null,'community-a']] as const){
  await assert.rejects(service.context(user,pack,id),{statusCode:404});
 }
 assert.equal(calls.length,0);
});
test('source ID from another notebook cannot be used as a direct object reference',async()=>{
 const {service,calls}=fixture();await assert.rejects(service.read('alice','community-a',id,'source:someone-else'),{statusCode:404});
 assert.equal(calls.length,1);assert.ok(!calls.some(c=>c.url.endsWith('someone-else')));
});
test('source metadata must confirm notebook association before reading or prompting',async()=>{
 const {service}=fixture({sourceScope:['notebook:other']});
 await assert.rejects(service.read('alice','community-a',id,'source:0'),{statusCode:404});
 await assert.rejects(service.context('alice','community-a',id),{statusCode:503});
});
test('imports never request transformations, embeddings, or background model work',async()=>{
 const {service,calls}=fixture();await service.add('alice','community-a',id,'Permitted text','Fictional learning example');
 assert.deepEqual(calls[0]?.body,{type:'text',notebooks:['notebook:own'],title:'Permitted text',content:'Fictional learning example',embed:false,transformations:[],async_processing:false});
 assert.equal(calls.length,1);
});
test('private excerpt preparation is bounded and does not invoke search/model endpoints',async()=>{
 const {service,calls}=fixture({sources:20});const context=await service.context('alice','community-a',id);
 assert.equal(context.length,3);assert.ok(context.reduce((n,s)=>n+s.content.length,0)<13000);
 assert.ok(calls.every(c=>!/(search|embed|chat|models)/.test(c.url)));
});
test('configured source service requires loopback and credentials',()=>{
 for(const endpoint of ['https://external.example','http://127.0.0.1.evil:5055','file:///tmp/a','http://user:pass@localhost:5055','http://localhost:5055/?redirect=external'])assert.throws(()=>new OpenNotebookClient(endpoint,'placeholder'));
 assert.throws(()=>new OpenNotebookClient('http://localhost:5055',''));
});
test('upstream response or redirect failures do not leak credential/body details',async()=>{
 const client=new OpenNotebookClient('http://127.0.0.1:5055','test-secret',async()=>new Response('private upstream failure',{status:302,headers:{Location:'https://external.example'}}));
 await assert.rejects(client.sources('notebook:own'),error=>error instanceof Error&&!error.message.includes('private')&&!error.message.includes('test-secret'));
});
test('unbounded source import and empty title are refused',()=>{assert.throws(()=>studyText('x'.repeat(20001),20000,'Source'));assert.throws(()=>studyText(' ',120,'Title'));});
test('a question can retrieve an excerpt beyond the beginning without a model or embedding',()=>{
 const text='Unrelated introductory text. '.repeat(300)+'\nThe fictional baobab library opens at sunset.\n'+'Unrelated closing text. '.repeat(50);
 const excerpt=sourceExcerpt(text,'When does the fictional baobab library open?',1000);
 assert.ok(excerpt.includes('baobab library opens at sunset'));assert.ok(excerpt.length<=1000);
});
test('private processing scope rejects an outside provider before transport',()=>{
 withProcessingPolicy({localOnly:true,reviewedOnly:false},()=>assert.throws(()=>assertContextPolicy({contextPrivacy:'personal-local-only'} as any,'openrouter')));
});
