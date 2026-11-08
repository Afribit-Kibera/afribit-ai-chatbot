import { pool } from '../db/pool.js';
import { detectSecret } from '../safety/secretDetector.js';
import { isUuid } from '../pilot/rules.js';
import { configuredNotebookClient, NotebookError, type OpenNotebookClient, type NotebookSource } from './client.js';
import { sourceExcerpt } from './excerpt.js';
export interface StudyNotebook {id:string;title:string;upstream_id:string}
export interface NotebookStore {
 list(user:string,pack:string):Promise<StudyNotebook[]>;
 own(user:string,pack:string,id:string):Promise<StudyNotebook|null>;
 create(user:string,pack:string,title:string,upstream:string):Promise<StudyNotebook>;
 remove(user:string,pack:string,id:string):Promise<void>;
}
export const notebookStore:NotebookStore={
 async list(user,pack){return (await pool.query<StudyNotebook>('SELECT id,title,upstream_id FROM study_notebooks WHERE user_id=$1 AND pack_id=$2 ORDER BY created_at DESC',[user,pack])).rows;},
 async own(user,pack,id){return (await pool.query<StudyNotebook>('SELECT id,title,upstream_id FROM study_notebooks WHERE id=$1 AND user_id=$2 AND pack_id=$3',[id,user,pack])).rows[0]??null;},
 async create(user,pack,title,upstream){return (await pool.query<StudyNotebook>('INSERT INTO study_notebooks(user_id,pack_id,title,upstream_id) VALUES ($1,$2,$3,$4) RETURNING id,title,upstream_id',[user,pack,title,upstream])).rows[0]!;},
 async remove(user,pack,id){await pool.query('DELETE FROM study_notebooks WHERE id=$1 AND user_id=$2 AND pack_id=$3',[id,user,pack]);},
};
export function studyText(value:unknown,max:number,label:string):string {
 if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new NotebookError(400,`${label} must contain 1–${max} characters`);
 if(detectSecret(value).detected)throw new NotebookError(400,'Remove passwords, recovery phrases and private keys before importing');
 return value.trim();
}
export class NotebookService {
 constructor(private store:NotebookStore=notebookStore,private connect:()=>OpenNotebookClient|null=configuredNotebookClient){}
 private client(){const c=this.connect();if(!c)throw new NotebookError(503,'Your community source service is not connected yet');return c;}
 async owned(user:string|null,pack:string,id:string){
   if(!user || typeof id!=='string'||!isUuid(id))throw new NotebookError(404,'Notebook not found');
   const notebook=await this.store.own(user,pack,id);if(!notebook)throw new NotebookError(404,'Notebook not found');return notebook;
 }
 status(){try{return {configured:!!this.connect(),processing:'local-only',imports:['text'],encryption:'server-access-controlled'};}catch{return {configured:false,processing:'local-only',imports:['text'],encryption:'server-access-controlled'};}}
 async list(user:string,pack:string){return (await this.store.list(user,pack)).map(({id,title})=>({id,title}));}
 async create(user:string,pack:string,title:unknown){
  const name=studyText(title,120,'Notebook title'),client=this.client();const created=await client.create(name);
  if(typeof created.id!=='string'||!created.id.startsWith('notebook:'))throw new NotebookError(503,'Source service returned an invalid notebook');
  try{const {id,title:label}=await this.store.create(user,pack,name,created.id);return {id,title:label};}
  catch(error){await client.remove(created.id).catch(()=>{});throw error;}
 }
 async sources(user:string,pack:string,id:string){
  const notebook=await this.owned(user,pack,id);const sources=await this.client().sources(notebook.upstream_id);
  return sources.map(s=>({id:s.id,title:s.title??'Untitled source'}));
 }
 async add(user:string,pack:string,id:string,title:unknown,content:unknown){
  const notebook=await this.owned(user,pack,id);const name=studyText(title,120,'Source title'),text=studyText(content,20000,'Source text');
  const source=await this.client().addText(notebook.upstream_id,name,text);return {id:source.id,title:source.title??name};
 }
 async read(user:string,pack:string,id:string,sourceId:string):Promise<NotebookSource>{
  const notebook=await this.owned(user,pack,id),client=this.client();
  const list=await client.sources(notebook.upstream_id);
  if(!list.some(s=>s.id===sourceId))throw new NotebookError(404,'Source not found');
  const source=await client.source(sourceId);
  if(!source.notebooks?.includes(notebook.upstream_id))throw new NotebookError(404,'Source not found');
  return {id:source.id,title:source.title,full_text:(source.full_text??'').slice(0,20000)};
 }
 async context(user:string|null,pack:string,id:string,question=''){
  const notebook=await this.owned(user,pack,id),client=this.client();const list=await client.sources(notebook.upstream_id);
  // Deliberately bounded, deterministic excerpt baseline. No remote embeddings/search/LLM here.
  let remaining=12000;const result:{content:string}[]=[];
  for(const item of list.slice(0,6)){
   if(remaining<=0)break;const source=await client.source(item.id);
   if(!source.notebooks?.includes(notebook.upstream_id))throw new NotebookError(503,'Source scope could not be verified');
   const text=sourceExcerpt((source.full_text??'').slice(0,20000),question,Math.min(remaining,4000));if(!text)continue;
   remaining-=text.length;result.push({content:`[Source ${result.length+1}: ${source.title??'Untitled'}; excerpt, not necessarily the full resource]\n${text}`});
  }
  return result;
 }
 async remove(user:string,pack:string,id:string){const notebook=await this.owned(user,pack,id);await this.client().remove(notebook.upstream_id);await this.store.remove(user,pack,id);}
}
export const notebooks=new NotebookService();
