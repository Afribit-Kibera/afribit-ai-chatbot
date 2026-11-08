import { API_BASE,readResponse } from './api.js';
import {communityHeaders} from './communityScope.js';
import {getLearnerIdentity,learnerHeaders,sameLearnerIdentity} from './learnerSession.js';
export interface SharedSource {id:string;title:string;version:number;provenance:string;summary?:string;text?:string}
export interface PathSummary {id:string;draftId:string;title:string;mode:string;revision:number;summary:string;steps:number}
export interface StudyStep {id:string;title:string;explanation:string;example:string;sourceIds:string[];question?:string;options?:string[];correctIndex?:number}
export interface PathBody {summary:string;steps:StudyStep[]}
export interface ReleasedPath {id:string;draft_id:string;title:string;mode:string;revision:number;body:PathBody;withdrawn_at:string|null}
export interface LearningNote {id:string;content:string;created_at:string}
export interface PathProgress {release_id:string;step_index:number;completed_steps:string[];title:string;mode:string;revision:number;steps:number;withdrawn_at:string|null}
export interface PersonalLearning {notes:LearningNote[];progress:PathProgress[]}
export interface StudioDraft {id:string;kind:'path'|'language'|'source';mode:string;title:string;body:Record<string,unknown>;revision:number;status:'draft'|'review'|'changes'|'published';created_by:string|null;updated_by:string|null;tested_revision:number|null}
export interface StudioTest {id:string;revision:number;question:string;baseline:string;candidate:string;model:string;provider:string;latency_ms:number;created_at:string}
export interface StudioAccess {canEdit:boolean;canReview:boolean;role:string}
export async function learningRequest<T>(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>{
 const token=getLearnerIdentity()?.token??null;
 const response=await fetch(API_BASE+'/api/v1/'+path,{method,headers:{...communityHeaders(),...learnerHeaders(),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal,cache:'no-store'});
 if(!sameLearnerIdentity(token))throw new Error('Your account changed. Open this workspace again.');
 if(response.status===204)return undefined as T;return readResponse<T>(response);
}
export const learningApi={
 library:(signal?:AbortSignal)=>learningRequest<{sources:SharedSource[];paths:PathSummary[]}>('learning/library','GET',undefined,signal),
 source:(id:string)=>learningRequest<SharedSource>('learning/sources/'+encodeURIComponent(id)),
 path:(id:string,signal?:AbortSignal)=>learningRequest<ReleasedPath>('learning/paths/'+encodeURIComponent(id),'GET',undefined,signal),
 personal:(signal?:AbortSignal)=>learningRequest<PersonalLearning>('me/learning','GET',undefined,signal),
 note:(content:string)=>learningRequest<LearningNote>('me/learning/notes','POST',{content}),
 removeNote:(id:string)=>learningRequest<void>('me/learning/notes/'+id,'DELETE'),
 progress:(id:string,stepIndex:number,completeStep?:string)=>learningRequest<{stepIndex:number;completedSteps:string[]}>('me/learning/progress/'+id,'PUT',{stepIndex,completeStep}),
 eraseProgress:(id:string)=>learningRequest<void>('me/learning/progress/'+id,'DELETE'),
 access:(signal?:AbortSignal)=>learningRequest<StudioAccess>('studio/access','GET',undefined,signal),
 drafts:(signal?:AbortSignal)=>learningRequest<{drafts:StudioDraft[]}>('studio/drafts','GET',undefined,signal),
 draft:(id:string)=>learningRequest<{draft:StudioDraft;tests:StudioTest[];releases:{id:string;revision:number;withdrawn_at:string|null}[]}>('studio/drafts/'+id),
 save:(input:Partial<StudioDraft>)=>learningRequest<StudioDraft>('studio/drafts'+(input.id?'/'+input.id:''),input.id?'PUT':'POST',input),
 submit:(draft:StudioDraft)=>learningRequest<StudioDraft>('studio/drafts/'+draft.id+'/submit','POST',{revision:draft.revision}),
 review:(draft:StudioDraft,publish:boolean,note:string)=>learningRequest<StudioDraft>('studio/drafts/'+draft.id+'/review','POST',{revision:draft.revision,publish,note}),
 test:(draft:StudioDraft,question:string,signal?:AbortSignal)=>learningRequest<StudioTest>('studio/drafts/'+draft.id+'/test','POST',{revision:draft.revision,question},signal),
 withdraw:(id:string,reason:string)=>learningRequest<{ok:boolean}>('studio/releases/'+id+'/withdraw','POST',{reason}),
};
