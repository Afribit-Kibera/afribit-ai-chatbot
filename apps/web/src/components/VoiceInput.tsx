import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
interface Recognition {
 lang:string;interimResults:boolean;continuous:boolean;
 onresult:((event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null;
 onerror:(()=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void;
}
type VoiceWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export function VoiceInput({disabled,localOnly,language,onTranscript}:{disabled:boolean;localOnly:boolean;language:string;onTranscript:(text:string)=>void}){
 const [consent,setConsent]=useState(false),[recording,setRecording]=useState(false),[notice,setNotice]=useState('');
 const recognition=useRef<Recognition|null>(null),latest=useRef(onTranscript);latest.current=onTranscript;
 useEffect(()=>()=>{const active=recognition.current;if(active){active.onresult=null;active.onerror=null;active.onend=null;active.abort();}},[]);
 useEffect(()=>{if(disabled||localOnly){recognition.current?.abort();setRecording(false);setConsent(false);}},[disabled,localOnly]);
 function start(){
  if(disabled||localOnly)return;const Constructor=(window as VoiceWindow).SpeechRecognition??(window as VoiceWindow).webkitSpeechRecognition;
  if(!Constructor){setNotice('Voice dictation is unavailable in this browser. You can type, paste, or use your keyboard’s dictation settings.');setConsent(false);return;}
  const active=new Constructor();recognition.current=active;active.lang=language==='swahili'?'sw-KE':'en-KE';active.interimResults=false;active.continuous=false;
  active.onresult=event=>{const text=Array.from(event.results).map(result=>result[0]?.transcript??'').join(' ');latest.current(text);};
  active.onerror=()=>{setRecording(false);setNotice('Dictation stopped or permission was denied. Your question was not sent.');};
  active.onend=()=>setRecording(false);
  setConsent(false);setNotice('Listening. Your transcript will be placed in the question box for you to review.');
  try{active.start();setRecording(true);}catch{setNotice('Microphone could not start. Try typing instead.');}
 }
 return <div className="voice-input"><button type="button" className="icon-button" disabled={disabled} aria-label={recording?'Stop voice input':'Voice input'} aria-pressed={recording} onClick={()=>{
  if(recording){recognition.current?.stop();setRecording(false);return;}if(localOnly){setNotice('Voice input may use your browser’s online speech service. It is unavailable while local-only processing is selected.');return;}setConsent(p=>!p);
 }}>{recording?<Square size={16}/>:<Mic size={18}/>}</button>
 {consent&&<div className="voice-consent" role="region" aria-label="Voice permission"><p>Your browser may send audio to its speech provider. This is separate from Afribit’s text processing. Sheng transcription may need correction. No audio is saved by this app.</p><button type="button" className="button button-outline" onClick={start}>Allow browser dictation</button><button type="button" className="button button-ghost" onClick={()=>setConsent(false)}>Cancel</button></div>}
 {notice&&<p className="composer-tool-note" role="status">{notice}</p>}</div>;
}
