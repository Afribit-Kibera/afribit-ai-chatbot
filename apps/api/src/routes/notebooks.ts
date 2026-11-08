import type { FastifyInstance } from 'fastify';
import { communityStore } from '../community/store.js';
import { getPack } from '../pack/active.js';
import { NotebookError } from '../notebooks/client.js';
import { notebooks } from '../notebooks/service.js';
export function registerNotebookRoutes(app:FastifyInstance){
 const auth={preHandler:app.requireAuth};
 const scope=async(user:string)=>{const pack=getPack().id;await communityStore.requireAccess(pack,user);return pack;};
 app.get('/api/v1/notebooks/status',auth,async(req,reply)=>{await scope(req.user.id);reply.header('Cache-Control','no-store');return notebooks.status();});
 app.get('/api/v1/notebooks',auth,async(req,reply)=>{reply.header('Cache-Control','no-store');return {notebooks:await notebooks.list(req.user.id,await scope(req.user.id))};});
 app.post<{Body:{title:string}}>('/api/v1/notebooks',auth,async(req,reply)=>reply.status(201).send(await notebooks.create(req.user.id,await scope(req.user.id),req.body?.title)));
 app.get<{Params:{id:string}}>('/api/v1/notebooks/:id/sources',auth,async(req,reply)=>{reply.header('Cache-Control','no-store');return {sources:await notebooks.sources(req.user.id,await scope(req.user.id),req.params.id)};});
 app.post<{Params:{id:string};Body:{title:string;content:string;permissionToUse:boolean}}>('/api/v1/notebooks/:id/sources',auth,async(req,reply)=>{
  const pack=await scope(req.user.id);if(req.body?.permissionToUse!==true)throw new NotebookError(400,'Confirm you have permission to use this material');
  return reply.status(201).send(await notebooks.add(req.user.id,pack,req.params.id,req.body.title,req.body.content));
 });
 app.get<{Params:{id:string;sourceId:string}}>('/api/v1/notebooks/:id/sources/:sourceId',auth,async(req,reply)=>{reply.header('Cache-Control','no-store');return notebooks.read(req.user.id,await scope(req.user.id),req.params.id,req.params.sourceId);});
 // Ownership remains required, but erasure stays available after membership is revoked.
 app.delete<{Params:{id:string}}>('/api/v1/notebooks/:id',auth,async(req,reply)=>{await notebooks.remove(req.user.id,getPack().id,req.params.id);return reply.status(204).send();});
}
