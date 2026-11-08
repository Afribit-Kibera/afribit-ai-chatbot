import { detectSecret } from '../safety/secretDetector.js';
import { getPack } from '../pack/active.js';

export class LearningError extends Error {
  constructor(public statusCode:number,message:string){super(message);}
}
export interface LearningStep {
  id:string; title:string; explanation:string; example:string; sourceIds:string[];
  question?:string; options?:string[]; correctIndex?:number;
}
export interface LearningPath { summary:string; steps:LearningStep[] }
export type StudioKind='path'|'language'|'source';
export function text(value:unknown,max:number,label:string):string {
  if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new LearningError(400,`${label} must contain 1–${max} characters`);
  if(detectSecret(value).detected)throw new LearningError(400,'Remove recovery words, private keys and passwords before saving.');
  return value.trim();
}
export function revision(value:unknown):number {
  if(typeof value!=='number'||!Number.isInteger(value)||value<1)throw new LearningError(400,'A current revision is required. Refresh and try again.');
  return value;
}
export function content(kind:unknown,mode:unknown,raw:unknown){
  if(!['path','language','source'].includes(String(kind)))throw new LearningError(400,'Choose a supported draft type.');
  if(!getPack().modes.some(m=>m.id===mode))throw new LearningError(400,'Choose a language offered by this community.');
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new LearningError(400,'Draft content is required.');
  const body=raw as Record<string,unknown>;
  if(kind==='language')return {instructions:text(body.instructions,4000,'Language guidance')};
  if(kind==='source'){
    if(body.permissionToUse!==true)throw new LearningError(400,'Confirm permission to use this community source.');
    return {text:text(body.text,20000,'Source text'),provenance:text(body.provenance,1000,'Source provenance'),permissionToUse:true};
  }
  if(!Array.isArray(body.steps)||body.steps.length<1||body.steps.length>30)throw new LearningError(400,'A study path needs 1–30 short steps.');
  const ids=new Set<string>();
  const steps=body.steps.map((rawStep:unknown):LearningStep=>{
    if(!rawStep||typeof rawStep!=='object')throw new LearningError(400,'Each step needs content.');
    const s=rawStep as Record<string,unknown>,id=text(s.id,70,'Step ID');
    if(!/^[a-z0-9_-]+$/.test(id)||ids.has(id))throw new LearningError(400,'Step IDs must be unique, using letters, numbers, dashes or underscores.');ids.add(id);
    if(!Array.isArray(s.sourceIds)||!s.sourceIds.length||s.sourceIds.length>5||s.sourceIds.some(x=>typeof x!=='string'||x.length>160))throw new LearningError(400,'Each step needs 1–5 community source references.');
    const step:LearningStep={id,title:text(s.title,160,'Step title'),explanation:text(s.explanation,3000,'Explanation'),example:text(s.example,2000,'Example'),sourceIds:[...new Set(s.sourceIds as string[])]};
    if(s.question!==undefined&&s.question!==''){
      if(!Array.isArray(s.options)||s.options.length<2||s.options.length>4||typeof s.correctIndex!=='number'||!Number.isInteger(s.correctIndex)||s.correctIndex<0||s.correctIndex>=s.options.length)throw new LearningError(400,'Practice needs 2–4 choices and a valid answer.');
      step.question=text(s.question,500,'Practice question');step.options=s.options.map(x=>text(x,500,'Practice choice'));step.correctIndex=s.correctIndex;
    }
    return step;
  });
  const result={summary:text(body.summary,1000,'Path summary'),steps};
  if(JSON.stringify(result).length>60000)throw new LearningError(400,'This study path is too large. Split it into shorter chapters.');
  return result;
}
