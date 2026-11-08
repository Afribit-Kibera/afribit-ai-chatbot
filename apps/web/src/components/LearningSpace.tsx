import {useState} from 'react';
import {ArrowRight,BookOpen,Plus,Trash2} from 'lucide-react';
import {learningApi,type PersonalLearning} from '../lib/learning.js';
import {getLearnerIdentity,sameLearnerIdentity} from '../lib/learnerSession.js';
import {LearnerAccount} from './LearnerAccount.js';
import {Dialog} from './ui/Dialog.js';

export function LearningSpace({data,refresh,openPath,onFocus,onSetup}:{
 data:PersonalLearning|null;refresh:()=>void;openPath:(id:string)=>void;onFocus:()=>void;onSetup:()=>void;
}){
 const token=getLearnerIdentity()?.token??null;
 const [note,setNote]=useState(''),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function perform(work:()=>Promise<unknown>){
  if(busy)return;setBusy(true);setError('');
  try{await work();if(sameLearnerIdentity(token))refresh();}
  catch(e){if(sameLearnerIdentity(token))setError(e instanceof Error?e.message:'Please try again.');}
  finally{if(sameLearnerIdentity(token))setBusy(false);}
 }
 return <>
  <div className="page-heading"><div><h1>My space</h1><p className="intro-copy">Your notes and where you left off.</p></div></div>
  {token&&<div className="space-columns">
   <section className="panel"><h2>Continue learning</h2>
    {data?.progress.length?data.progress.map(p=><div className="source-row" key={p.release_id}><BookOpen/><div><strong>{p.title}</strong><small>{p.withdrawn_at?'Withdrawn for review':`Step ${p.step_index+1} of ${p.steps}`}</small></div>{!p.withdrawn_at&&<button aria-label={'Continue '+p.title} onClick={()=>openPath(p.release_id)}><ArrowRight/></button>}<button aria-label={'Remove saved place in '+p.title} disabled={busy} onClick={()=>void perform(()=>learningApi.eraseProgress(p.release_id))}><Trash2/></button></div>):<p className="space-empty">Your place appears here when you explore a chapter.</p>}
   </section>
   <section className="panel"><div className="section-heading hub-zero-top"><h2>My notes</h2><button className="text-button" onClick={()=>setEditing(true)}>Write a note <Plus/></button></div>
    {data?.notes.length?data.notes.map(n=><article className="saved-note" key={n.id}><p>{n.content}</p><button className="text-button delete-link" disabled={busy} onClick={()=>void perform(()=>learningApi.removeNote(n.id))}>Remove note</button></article>):<p className="space-empty">Keep something that helped an idea click. Notes are optional.</p>}
   </section>
  </div>}
  {error&&!editing&&<p className="hub-error" role="alert">{error}</p>}
  <section className="panel hub-account"><h2>{token?'Account & choices':'Sign in to save your learning'}</h2><LearnerAccount onAccess={refresh}/><div className="space-settings"><button className="text-button" onClick={onSetup}>Language & learning preferences <ArrowRight/></button><button className="text-button" onClick={onFocus}>All spaces <ArrowRight/></button></div></section>
  <details className="space-privacy"><summary>About your notes and privacy</summary><p>Study notes are saved to your account. They are not sent to the AI or added to shared knowledge. Optional AI memory has separate controls in your account.</p><p>Your account keeps members separate inside the app. The box operator can still access plaintext. Passkey-protected vaults are not active.</p><p>Steps explored are not a score or a measure of understanding.</p></details>
  <Dialog open={editing} onOpenChange={setEditing} title="Keep what helped." description="A personal study note. It will not become a shared source or model context." className="learning-workspace workspace-dialog">
   <form onSubmit={e=>{e.preventDefault();void perform(async()=>{await learningApi.note(note);if(sameLearnerIdentity(token)){setNote('');setEditing(false);}});}}><label className="form-field">Your note<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={4000} required/></label>{error&&<p className="hub-error" role="alert">{error}</p>}<footer className="modal-actions"><button className="primary" disabled={busy}>{busy?'Saving…':'Save note'}</button></footer></form>
  </Dialog>
 </>;
}
