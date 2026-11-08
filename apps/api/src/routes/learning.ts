import type { FastifyInstance } from 'fastify';
import type { AfribitAIGateway } from '../gateway/gateway.js';
import { getPack } from '../pack/active.js';
import { pool } from '../db/pool.js';
import { LearningError, text, type LearningPath } from '../learning/content.js';
import { draft,latestReleases,recordProgress,release,requireStaff,reviewDraft,saveDraft,sharedSources,staffAccess,submitDraft } from '../learning/store.js';
import { previewDraft } from '../learning/preview.js';
import { isUuid } from '../pilot/rules.js';

export function registerLearningRoutes(app:FastifyInstance,gateway:AfribitAIGateway){
  const auth={preHandler:app.requireAuth};
  app.get('/api/v1/learning/library',{preHandler:app.optionalAuth},async(_req,reply)=>{
    reply.header('Cache-Control','no-store');
    return {sources:(await sharedSources()).map(({text:body,...source})=>({...source,summary:body.slice(0,180)})),paths:(await latestReleases('path')).map(p=>({id:p.id,draftId:p.draft_id,title:p.title,mode:p.mode,revision:p.revision,summary:p.body.summary,steps:(p.body as unknown as LearningPath).steps.length}))};
  });
  app.get<{Params:{id:string}}>('/api/v1/learning/sources/:id',{preHandler:app.optionalAuth},async(req,reply)=>{
    reply.header('Cache-Control','no-store');const source=(await sharedSources()).find(s=>s.id===req.params.id);
    if(!source)throw new LearningError(404,'Source not found in this community collection.');return source;
  });
  app.get<{Params:{id:string}}>('/api/v1/learning/paths/:id',{preHandler:app.optionalAuth},async(req,reply)=>{reply.header('Cache-Control','no-store');return release(req.params.id);});
  app.get('/api/v1/me/learning',auth,async(req,reply)=>{
    reply.header('Cache-Control','no-store');
    const notes=await pool.query('SELECT id,content,created_at FROM learning_notes WHERE user_id=$1 AND pack_id=$2 ORDER BY created_at DESC LIMIT 100',[req.user.id,getPack().id]);
    const progress=await pool.query(`SELECT p.release_id,p.step_index,p.completed_steps,p.updated_at,r.title,r.mode,r.revision,r.withdrawn_at,jsonb_array_length(r.body->'steps') AS steps FROM learning_progress p JOIN learning_releases r ON r.id=p.release_id WHERE p.user_id=$1 AND p.pack_id=$2 AND r.pack_id=$2 ORDER BY p.updated_at DESC LIMIT 50`,[req.user.id,getPack().id]);
    return {notes:notes.rows,progress:progress.rows};
  });
  app.post<{Body:{content:string}}>('/api/v1/me/learning/notes',auth,async(req,reply)=>{
    const value=text(req.body?.content,4000,'Note');
    const {rows}=await pool.query(`INSERT INTO learning_notes(user_id,pack_id,content) SELECT $1,$2,$3 WHERE (SELECT count(*) FROM learning_notes WHERE user_id=$1 AND pack_id=$2)<100 RETURNING id,content,created_at`,[req.user.id,getPack().id,value]);
    if(!rows[0])throw new LearningError(409,'You have 100 notes. Remove one before adding another.');return reply.status(201).send(rows[0]);
  });
  app.delete<{Params:{id:string}}>('/api/v1/me/learning/notes/:id',auth,async(req,reply)=>{
    if(!isUuid(req.params.id))throw new LearningError(404,'Note not found.');
    const {rowCount}=await pool.query('DELETE FROM learning_notes WHERE id=$1 AND user_id=$2 AND pack_id=$3',[req.params.id,req.user.id,getPack().id]);
    if(!rowCount)throw new LearningError(404,'Note not found.');return reply.status(204).send();
  });
  app.put<{Params:{id:string};Body:{stepIndex:number;completeStep?:string}}>('/api/v1/me/learning/progress/:id',auth,async(req)=>recordProgress(req.user.id,req.params.id,req.body??{}));
  app.delete<{Params:{id:string}}>('/api/v1/me/learning/progress/:id',auth,async(req,reply)=>{
    if(!isUuid(req.params.id))throw new LearningError(404,'Progress not found.');
    await pool.query('DELETE FROM learning_progress WHERE user_id=$1 AND pack_id=$2 AND release_id=$3',[req.user.id,getPack().id,req.params.id]);return reply.status(204).send();
  });
  app.get('/api/v1/studio/access',auth,async(req,reply)=>{reply.header('Cache-Control','no-store');return staffAccess(req.user.id);});
  app.get('/api/v1/studio/drafts',auth,async(req,reply)=>{
    await requireStaff(req.user.id);reply.header('Cache-Control','no-store');
    return {drafts:(await pool.query('SELECT * FROM studio_drafts WHERE pack_id=$1 ORDER BY updated_at DESC LIMIT 100',[getPack().id])).rows};
  });
  app.get<{Params:{id:string}}>('/api/v1/studio/drafts/:id',auth,async(req,reply)=>{
    await requireStaff(req.user.id);reply.header('Cache-Control','no-store');const current=await draft(req.params.id);
    return {draft:current,tests:(await pool.query('SELECT * FROM studio_tests WHERE draft_id=$1 ORDER BY created_at DESC LIMIT 5',[current.id])).rows,releases:(await pool.query('SELECT id,revision,withdrawn_at FROM learning_releases WHERE draft_id=$1 AND pack_id=$2 ORDER BY revision DESC',[current.id,getPack().id])).rows};
  });
  app.post<{Body:Parameters<typeof saveDraft>[1]}>('/api/v1/studio/drafts',{...auth,bodyLimit:100000},async(req,reply)=>reply.status(201).send(await saveDraft(req.user.id,req.body??{} as never)));
  app.put<{Params:{id:string};Body:Parameters<typeof saveDraft>[1]}>('/api/v1/studio/drafts/:id',{...auth,bodyLimit:100000},async(req)=>saveDraft(req.user.id,{...req.body,id:req.params.id}));
  app.post<{Params:{id:string};Body:{revision:number}}>('/api/v1/studio/drafts/:id/submit',auth,async(req)=>submitDraft(req.user.id,req.params.id,req.body?.revision));
  app.post<{Params:{id:string};Body:{revision:number;publish:boolean;note:string}}>('/api/v1/studio/drafts/:id/review',auth,async(req)=>{
    if(typeof req.body?.publish!=='boolean')throw new LearningError(400,'Choose publish or request changes.');
    return reviewDraft(req.user.id,req.params.id,req.body.revision,req.body.publish,req.body.note);
  });
  app.post<{Params:{id:string};Body:{revision:number;question:string}}>('/api/v1/studio/drafts/:id/test',{...auth,config:{rateLimit:{max:3,timeWindow:'1 minute'}}},async(req,reply)=>{
    const controller=new AbortController(),cancel=()=>{if(!reply.raw.writableEnded)controller.abort();};reply.raw.once('close',cancel);
    try{return await previewDraft(req.user.id,req.params.id,req.body?.revision,req.body?.question,gateway,controller.signal);}finally{reply.raw.off('close',cancel);}
  });
  app.post<{Params:{id:string};Body:{reason:string}}>('/api/v1/studio/releases/:id/withdraw',auth,async(req)=>{
    await requireStaff(req.user.id,true);const reason=text(req.body?.reason,1000,'Withdrawal reason');
    if(!isUuid(req.params.id))throw new LearningError(404,'Release not found.');
    const {rows}=await pool.query(`WITH changed AS (UPDATE learning_releases SET withdrawn_at=now() WHERE id=$1 AND pack_id=$2 AND withdrawn_at IS NULL RETURNING id) INSERT INTO audit_logs(actor,action,entity_type,entity_id,details) SELECT $3,'learning_release_withdrawn','learning_release',id,$4::jsonb FROM changed RETURNING entity_id`,[req.params.id,getPack().id,req.user.id,JSON.stringify({packId:getPack().id,reason})]);
    if(!rows[0])throw new LearningError(404,'Active release not found.');return {ok:true};
  });
}
