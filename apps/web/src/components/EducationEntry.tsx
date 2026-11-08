import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, Code2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { BrandMark } from './BrandMark.js';
import { LearnerAccount } from './LearnerAccount.js';
import { LearningHub } from './LearningHub.js';
import { usePack, resolveMode } from '../lib/pack.js';
import { getLearnerIdentity } from '../lib/learnerSession.js';
import { readStorage, writeStorage } from '../lib/storage.js';
import { PREFERENCES_KEY, validatePreferences, type Preferences } from '../lib/preferences.js';
import './education.css';
type Screen='intro'|'setup'|'focus'|'education'|'sources'|'chat';
export function EducationEntry({preferences,update,children}:{preferences:Preferences;update:(p:Partial<Preferences>)=>void;children:(notebookId?:string,question?:string)=>ReactNode}){
 const identity=getLearnerIdentity(),pack=usePack();
 const scope=identity?.id??'guest',setupKey=`afribit.learning-setup.v2:${scope}:${pack.id??'default'}`;
 const chatKey=`afribit.learning-chat.v2:${scope}:${pack.id??'default'}`;
 const sessionKey=`afribit.learning-session.v2:${scope}:${pack.id??'default'}`;
 const sessionChoices=()=>{try{return JSON.parse(sessionStorage.getItem(sessionKey)??'null') as Record<string,unknown>|null;}catch{return null;}};
 const hasSetup=()=>!!(sessionChoices()||readStorage(setupKey,false));
 const [screen,setScreen]=useState<Screen>(()=>{
  if(window.location.pathname.includes('/settings')||window.location.pathname.includes('/contribute'))return 'chat';
  try{if(sessionStorage.getItem(chatKey)==='true')return 'chat';}catch{/* A blocked storage API must not block learning. */}
  if(!readStorage('afribit.intro-seen.v2',false))return 'intro';
  return hasSetup()?'focus':'setup';
 });
 const [step,setStep]=useState(1),[language,setLanguage]=useState(resolveMode(pack,preferences.languageMode));
 const [level,setLevel]=useState(preferences.explanationLevel),[goal,setGoal]=useState('bitcoin');
 const [remote,setRemote]=useState(false),[understood,setUnderstood]=useState(false),[remember,setRemember]=useState(false);
 const [videoFailed,setVideoFailed]=useState(false),[reduced,setReduced]=useState(true);
 const [restored,setRestored]=useState(false);
 const accountAccess=useCallback(()=>{},[]);
 useEffect(()=>{try{if(screen==='chat')sessionStorage.setItem(chatKey,'true');else sessionStorage.removeItem(chatKey);}catch{/* Navigation remains available in memory. */}},[screen,chatKey]);
 useEffect(()=>{
  const saved=sessionChoices()??readStorage<unknown>(setupKey,null);
  if(saved && typeof saved==='object'){
   const record=saved as Record<string,unknown>;
   if(record.version===2){const checked=validatePreferences({...preferences,languageMode:record.language,explanationLevel:record.level,remoteProcessingAllowed:record.remoteProcessingAllowed});update(checked);setLanguage(resolveMode(pack,checked.languageMode));setLevel(checked.explanationLevel);setRemote(checked.remoteProcessingAllowed===true);if(record.goal==='sources')setGoal('sources');}
  }
  setRestored(true);
 // Restore only at the account/community boundary; active edits must not be overwritten.
 },[setupKey]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');setReduced(media.matches);const changed=()=>setReduced(media.matches);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);},[]);
 const continueIntro=()=>{writeStorage('afribit.intro-seen.v2',true);setScreen(hasSetup()?'focus':'setup');};
 function finish(){
  writeStorage('afribit.remember-learning-preferences.v2',remember);
  if(!remember)writeStorage(PREFERENCES_KEY,null);
  update({languageMode:language,explanationLevel:level,remoteProcessingAllowed:remote});
  const choices={version:2,goal,language,level,remoteProcessingAllowed:remote,acknowledgedAt:new Date().toISOString()};
  try{sessionStorage.setItem(sessionKey,JSON.stringify(choices));}catch{/* Preferences remain in memory. */}
  if(remember)writeStorage(setupKey,choices);
  else writeStorage(setupKey,null);
  // Existing in-chat setup is superseded by this explicit onboarding; no personal context is stored.
  writeStorage('afribit.onboarded',true);setScreen('focus');
 }
 if(['chat','education','sources'].includes(screen)){
  if(!restored)return <main className="education-entry" role="status">Opening your learning space…</main>;
  return <LearningHub preferences={preferences} update={update} initialChat={screen==='chat'} initialLibrary={screen==='sources'} onFocus={()=>setScreen('focus')} onSetup={()=>{setStep(1);setScreen('setup');}}>{children}</LearningHub>;
 }
 return <main className="education-entry">
  <header className="learning-header"><BrandMark size="sm" brand={pack.branding}/><span className="learning-community">{pack.name} · Learning together</span></header>
  {screen==='intro'?<section className="learning-intro">
   <div className="learning-intro-art"><img className="learning-motion" src="/brand/afribit-learning-motion.svg" alt="A book becomes a conversation"/>{!reduced&&!videoFailed&&<video className="learning-intro-video" src="/brand/afribit-intro-green.mp4" muted playsInline autoPlay preload="none" onError={()=>setVideoFailed(true)} aria-label="Optional Afribit learning introduction"/>}</div>
   <span className="learning-eyebrow">Your community. Your curiosity.</span><h1>A little curiosity.<br/>A world of understanding.</h1><p>Meet Afribit AI. Learn from sources you trust, ask in your own words, and take one small step at a time.</p>
   <button className="learning-primary" onClick={continueIntro}>Continue <ArrowRight size={19}/></button><p className="learning-fine">English, Kiswahili and your community’s Sheng. No video or sound required to continue.</p>
  </section>:screen==='setup'?<section className="learning-setup">
   <span className="learning-eyebrow">Make yourself at home · Step {step} of 3</span><h1>{step===1?'How do you like to learn?':step===2?'What brings you here?':'Your choices, clearly.'}</h1>
   <div className="setup-dots" role="progressbar" aria-label="Workspace setup" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step}>{[1,2,3].map(n=><span key={n} className={n<=step?'done':''}/>)}</div>
   {step===1?<><p>Choose how the AI explains things. You can change this later.</p><fieldset><legend>Answer language</legend><div className="learning-options">{pack.modes.map(m=><button key={m.id} className="learning-option" aria-pressed={language===m.id} onClick={()=>setLanguage(m.id)}>{m.label}</button>)}</div></fieldset><fieldset><legend>Explanation style</legend><div className="learning-options">{(['simple','normal','deep'] as const).map(v=><button key={v} className="learning-option" aria-pressed={level===v} onClick={()=>setLevel(v)}>{v==='simple'?'Small, simple steps':v==='normal'?'Everyday detail':'Go deeper'}</button>)}</div></fieldset></>:step===2?<><p>We’ll help you find a starting point. You’re free to explore both.</p><div className="learning-options">{[{id:'bitcoin',title:'Understand Bitcoin',text:'Start with community-reviewed basics.'},{id:'sources',title:'Learn from my own sources',text:'Bring permitted text and organize your subjects.'}].map(o=><button key={o.id} className="learning-option goal-option" aria-pressed={goal===o.id} onClick={()=>setGoal(o.id)}><BookOpen/><strong>{o.title}</strong><span>{o.text}</span></button>)}</div><LearnerAccount onAccess={accountAccess}/><p className="learning-fine">An account keeps your notebooks and history separate. You can explore the introduction without one.</p></>:<>
    <div className="learning-privacy"><ShieldCheck/><p>Personal source notebooks are stored on the community box and use local-only AI processing. Account access keeps members separate; it does not hide plaintext from the machine’s operator.</p></div>
    <label className="learning-check"><input type="checkbox" checked={remote} onChange={e=>setRemote(e.target.checked)}/> Allow Bitcoin questions to use the community’s configured AI route, which may send them to an outside provider. Personal notebooks remain local-only.</label>
    <label className="learning-check"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Remember my learning preferences on this browser. Avoid this on a shared phone.</label>
    <label className="learning-check"><input type="checkbox" checked={understood} onChange={e=>setUnderstood(e.target.checked)}/> I understand where my information is processed.</label>
    <p className="learning-fine">Microphone and clipboard access are requested only when you use those features. Passkey sign-in and a passkey-encrypted personal vault are not available in this build.</p><a href="/privacy" target="_blank" rel="noopener">Read the privacy notice</a>
   </>}
   <div className="learning-setup-actions">{step>1&&<button className="button button-ghost" onClick={()=>setStep(s=>s-1)}><ArrowLeft size={16}/> Back</button>}<button className="learning-primary" disabled={step===3&&!understood} onClick={()=>step<3?setStep(s=>s+1):finish()}>{step===3?'Open my workspace':'Continue'}<ArrowRight size={18}/></button></div>
  </section>:screen==='focus'?<section className="learning-focus"><span className="learning-eyebrow">Make room for what matters.</span><h1>What’s your focus?</h1><p>Afribit AI grows with your community. Start with learning.</p><div className="learning-card-grid focus-grid"><button className="learning-card active" onClick={()=>setScreen(goal==='sources'?'sources':'education')}><BookOpen size={32}/><h2>Education</h2><p>Understand something new. On your terms.</p><span>Let’s learn <ArrowRight size={18}/></span></button>{[{label:'Work',Icon:BriefcaseBusiness},{label:'Development',Icon:Code2}].map(({label,Icon})=><div className="learning-card locked" aria-disabled="true" key={label}><Icon size={32}/><h2>{label}</h2><p>A future space to do more with your AI.</p><span><LockKeyhole size={15}/> Coming later</span></div>)}</div><button className="button button-ghost" onClick={()=>{setStep(1);setScreen('setup');}}>Learning preferences & privacy</button></section>:null}

  <footer className="learning-footer">Smarter communities. Brighter futures.</footer>
 </main>;
}
