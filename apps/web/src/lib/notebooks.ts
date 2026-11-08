import { API_BASE, readResponse } from './api.js';
import { communityHeaders } from './communityScope.js';
import { learnerHeaders } from './learnerSession.js';
export interface StudyNotebook {id:string;title:string}
export interface StudySource {id:string;title:string;full_text?:string|null}
async function request<T>(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>{
  const result=await fetch(API_BASE+'/api/v1/notebooks'+path,{method,headers:{...communityHeaders(),...learnerHeaders(),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal,cache:'no-store'});
 if(result.status===204)return undefined as T;
 return readResponse<T>(result);
}
export const studyApi={
 status:(signal?:AbortSignal)=>request<{configured:boolean;processing:string}>('/status','GET',undefined,signal),
 list:(signal?:AbortSignal)=>request<{notebooks:StudyNotebook[]}>('','GET',undefined,signal),
 create:(title:string)=>request<StudyNotebook>('','POST',{title}),
 sources:(id:string,signal?:AbortSignal)=>request<{sources:StudySource[]}>('/'+encodeURIComponent(id)+'/sources','GET',undefined,signal),
 add:(id:string,title:string,content:string,permissionToUse:boolean)=>request<StudySource>('/'+encodeURIComponent(id)+'/sources','POST',{title,content,permissionToUse}),
 read:(id:string,source:string)=>request<StudySource>('/'+encodeURIComponent(id)+'/sources/'+encodeURIComponent(source)),
 remove:(id:string)=>request<void>('/'+encodeURIComponent(id),'DELETE'),
};
