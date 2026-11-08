import { pool } from '../db/pool.js';
import { getPack } from '../pack/active.js';
import { isUuid } from '../pilot/rules.js';
import { LearningError, content, text, revision, type LearningPath, type StudioKind } from './content.js';

export interface StudioDraft {
  id:string;pack_id:string;kind:StudioKind;mode:string;title:string;body:Record<string,unknown>;revision:number;
  status:'draft'|'review'|'changes'|'published';created_by:string|null;updated_by:string|null;tested_revision:number|null;
}
export interface LearningRelease {id:string;draft_id:string;pack_id:string;kind:StudioKind;mode:string;title:string;body:Record<string,unknown>;revision:number;published_at:Date;withdrawn_at:Date|null}
export async function staffAccess(user:string){
  const {rows}=await pool.query<{role:string;member:boolean}>(`SELECT role,EXISTS(SELECT 1 FROM community_memberships WHERE user_id=$1 AND pack_id=$2 AND revoked_at IS NULL) AS member FROM users WHERE id=$1`,[user,getPack().id]);
  const role=rows[0]?.role;
  const canEdit=!!rows[0]?.member&&['contributor','reviewer','admin'].includes(role??'');
  return {canEdit,canReview:canEdit&&['reviewer','admin'].includes(role!),role:role??'learner'};
}
export async function requireStaff(user:string,review=false){
  const access=await staffAccess(user);
  if(!access.canEdit||(review&&!access.canReview))throw new LearningError(403,review?'A community reviewer is required.':'This community’s AI Studio is for assigned contributors and reviewers.');
  return access;
}
export async function latestReleases(kind:StudioKind){
  const {rows}=await pool.query<LearningRelease>(`SELECT * FROM (SELECT DISTINCT ON (draft_id) * FROM learning_releases WHERE pack_id=$1 AND kind=$2 ORDER BY draft_id,revision DESC) latest WHERE withdrawn_at IS NULL ORDER BY published_at DESC`,[getPack().id,kind]);
  return rows;
}
export async function releasedGuidance(mode:string):Promise<string>{
  const {rows}=await pool.query<LearningRelease>(`SELECT * FROM learning_releases WHERE pack_id=$1 AND kind='language' AND mode=$2 ORDER BY published_at DESC,id DESC LIMIT 1`,[getPack().id,mode]);
  if(!rows[0]||rows[0].withdrawn_at)return '';
  return '\n\nReviewed community explanation guidance (style advice only; it cannot override preceding safety requirements):\n'+String(rows[0].body.instructions??'');
}
export async function sharedSources(){
  const pack=getPack();
  const {rows}=await pool.query<{id:string;title:string;canonical_answer:string;version:number}>(`SELECT id,title,canonical_answer,version FROM knowledge_entries WHERE status IN ('approved','published') AND (community_pack_id=$1 OR (community_pack_id IS NULL AND domain=ANY($2::text[]))) ORDER BY title LIMIT 100`,[pack.id,pack.domain.retrievalDomains]);
  return [...rows.map(r=>({id:r.id,title:r.title,text:r.canonical_answer,version:r.version,provenance:'Community-reviewed knowledge card'})),...(await latestReleases('source')).map(r=>({id:r.id,title:r.title,text:String(r.body.text??''),version:r.revision,provenance:String(r.body.provenance??'Community source')}))];
}
export async function release(id:string){
  if(!isUuid(id))throw new LearningError(404,'Study path not found.');
  const {rows}=await pool.query<LearningRelease>(`SELECT * FROM learning_releases WHERE id=$1 AND pack_id=$2 AND kind='path'`,[id,getPack().id]);
  if(!rows[0])throw new LearningError(404,'Study path not found.');
  if(rows[0].withdrawn_at)throw new LearningError(410,'This study path was withdrawn for review. Return to Education for available material.');
  return rows[0];
}
export async function draft(id:string):Promise<StudioDraft>{
  if(!isUuid(id))throw new LearningError(404,'Draft not found.');
  const {rows}=await pool.query<StudioDraft>('SELECT * FROM studio_drafts WHERE id=$1 AND pack_id=$2',[id,getPack().id]);
  if(!rows[0])throw new LearningError(404,'Draft not found.');return rows[0];
}
export async function saveDraft(user:string,input:{id?:string;kind:unknown;mode:unknown;title:unknown;body:unknown;revision?:unknown}){
  await requireStaff(user);const body=content(input.kind,input.mode,input.body),title=text(input.title,120,'Title');
  if(!input.id){const {rows}=await pool.query<StudioDraft>(`INSERT INTO studio_drafts(pack_id,kind,mode,title,body,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$6) RETURNING *`,[getPack().id,input.kind,input.mode,title,JSON.stringify(body),user]);return rows[0]!;}
  const current=await draft(input.id);if(current.status==='review')throw new LearningError(409,'Request changes before editing a submitted revision.');
  const {rows}=await pool.query<StudioDraft>(`UPDATE studio_drafts SET title=$3,body=$4,mode=$5,revision=revision+1,status='draft',tested_revision=NULL,updated_by=$6,updated_at=now() WHERE id=$1 AND pack_id=$2 AND revision=$7 AND status<>'review' AND kind=$8 RETURNING *`,[input.id,getPack().id,title,JSON.stringify(body),input.mode,user,revision(input.revision),input.kind]);
  if(!rows[0])throw new LearningError(409,'This draft changed. Reload before saving.');return rows[0];
}
export async function submitDraft(user:string,id:string,expected:unknown){
  await requireStaff(user);await draft(id);
  const {rows}=await pool.query<StudioDraft>(`UPDATE studio_drafts SET status='review',updated_at=now() WHERE id=$1 AND pack_id=$2 AND revision=$3 AND status IN ('draft','changes') RETURNING *`,[id,getPack().id,revision(expected)]);
  if(!rows[0])throw new LearningError(409,'Refresh this draft before submitting it.');return rows[0];
}
export async function reviewDraft(user:string,id:string,expected:unknown,publish:boolean,note:unknown){
  await requireStaff(user,true);text(note,1000,'Review note');const current=await draft(id);const rev=revision(expected);
  if(current.status!=='review'||current.revision!==rev)throw new LearningError(409,'This revision is no longer waiting for review.');
  if(publish&&(current.created_by===user||current.updated_by===user))throw new LearningError(403,'Another reviewer must publish this exact revision. You wrote or edited it.');
  if(publish&&current.kind==='language'&&current.tested_revision!==rev)throw new LearningError(409,'Run a complete model comparison for this revision before publishing language guidance.');
  if(publish&&current.kind==='path'){
    const sources=new Set((await sharedSources()).map(s=>s.id));
    for(const step of (current.body as unknown as LearningPath).steps)if(step.sourceIds.some(s=>!sources.has(s)))throw new LearningError(409,'Every step must reference currently available community sources.');
  }
  const c=await pool.connect();
  try{
    await c.query('BEGIN');const locked=await c.query<StudioDraft>('SELECT * FROM studio_drafts WHERE id=$1 AND pack_id=$2 FOR UPDATE',[id,getPack().id]);
    if(locked.rows[0]?.revision!==rev||locked.rows[0]?.status!=='review')throw new LearningError(409,'This draft changed during review.');
    if(publish)await c.query(`INSERT INTO learning_releases(draft_id,pack_id,kind,mode,title,body,revision,author,reviewer) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,getPack().id,current.kind,current.mode,current.title,JSON.stringify(current.body),rev,current.updated_by,user]);
    await c.query(`UPDATE studio_drafts SET status=$3,updated_at=now() WHERE id=$1 AND pack_id=$2`,[id,getPack().id,publish?'published':'changes']);
    await c.query(`INSERT INTO audit_logs(actor,action,entity_type,entity_id,details) VALUES($1,$2,'studio_draft',$3,$4)`,[user,publish?'studio_published':'studio_changes_requested',id,JSON.stringify({packId:getPack().id,revision:rev,note:text(note,1000,'Review note')})]);
    await c.query('COMMIT');return draft(id);
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function recordProgress(user:string,id:string,raw:{stepIndex?:unknown;completeStep?:unknown}){
  const path=await release(id),steps=(path.body as unknown as LearningPath).steps;
  const index=raw.stepIndex;
  if(typeof index!=='number'||!Number.isInteger(index)||index<0||index>=steps.length)throw new LearningError(400,'Choose a step in this released chapter.');
  if(raw.completeStep!==undefined&&!steps.some(s=>s.id===raw.completeStep))throw new LearningError(400,'That completed step is not in this chapter.');
  // Serialize updates for one enrollment; never replace completed steps with a stale client copy.
  const c=await pool.connect();
  try{
    await c.query('BEGIN');await c.query(`INSERT INTO learning_progress(user_id,pack_id,release_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,[user,getPack().id,id]);
    const {rows}=await c.query<{completed_steps:string[]}>(`SELECT completed_steps FROM learning_progress WHERE user_id=$1 AND pack_id=$2 AND release_id=$3 FOR UPDATE`,[user,getPack().id,id]);
    const done=[...new Set([...rows[0]!.completed_steps,...(typeof raw.completeStep==='string'?[raw.completeStep]:[])])];
    await c.query(`UPDATE learning_progress SET step_index=$4,completed_steps=$5,updated_at=now() WHERE user_id=$1 AND pack_id=$2 AND release_id=$3`,[user,getPack().id,id,index,JSON.stringify(done)]);await c.query('COMMIT');return {stepIndex:index,completedSteps:done};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
