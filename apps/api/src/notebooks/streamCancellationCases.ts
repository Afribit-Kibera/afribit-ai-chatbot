import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AfribitAIGateway } from '../gateway/gateway.js';
import { getModelProfile } from '../config/modelProfiles.js';
import type { InferenceProvider, AfribitChatRequest } from '@afribit/shared';
import Fastify from 'fastify';
import { registerChatRoutes, type ChatService } from '../routes/chat.js';
test('Stop before the first token aborts the attempt without starting a fallback',async()=>{
 let attempts=0;const control=new AbortController();
 const provider:InferenceProvider={name:'local',capabilities:()=>({streaming:true,maxContextTokens:4096,supportsJsonMode:false,zdrSupported:true}),health:async()=>({healthy:true,checkedAt:new Date().toISOString()}),async chat(){throw Error('Not used');},
  async *chatStream(request){attempts++;const signal=request.signal as AbortSignal;control.abort();if(signal.aborted)throw Error('Cancelled by user');return undefined as never;}};
 // Exercise the existing fallback-bearing profile with fixture transports only, no paid/network code.
 const gateway=new AfribitAIGateway(new Map([['local',provider],['openrouter',provider]]));
 assert.ok(getModelProfile('node_chat_cloud_fallback').fallbackProfile);
 {
  const request:AfribitChatRequest={signal:control.signal,requestId:'cancel-test',modelProfile:'node_chat_cloud_fallback',messages:[{role:'user',content:'Fictional example'}],languageMode:'simple_en',explanationLevel:'simple',maxOutputTokens:64,temperature:0,privacyProfile:'strict'};
  await assert.rejects(gateway.chatStream(request).next(),/Cancelled by user/);assert.equal(attempts,1);
 }
});
test('closing the real HTTP stream signals cancellation to the chat service',async()=>{
 const app=Fastify({logger:false,forceCloseConnections:true});app.decorate('optionalAuth',async()=>{});
 let observed!:()=>void;const aborted=new Promise<void>(resolve=>{observed=resolve;});
 const service:ChatService={sendMessage:async()=>{throw Error('Not used');},sessionPackId:async()=>null,
  async streamMessage(_gateway,input,onEvent){
   onEvent({type:'meta',sessionId:'11111111-1111-4111-8111-111111111111',safetyFlag:null});
   assert.ok(input.signal);await new Promise<void>(resolve=>input.signal!.addEventListener('abort',()=>{observed();resolve();},{once:true}));
  }};
 registerChatRoutes(app,new AfribitAIGateway(new Map()),service);
 const control=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const address=await app.listen({host:'127.0.0.1',port:0});
  const response=await fetch(address+'/api/v1/chat/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Fictional transport test'}),signal:control.signal});
  const reader=response.body!.getReader();await reader.read();control.abort();await reader.cancel().catch(()=>{});
  await Promise.race([aborted,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Service did not receive socket cancellation')),3000);})]);
 }finally{if(timer)clearTimeout(timer);control.abort();await app.close();}
});
