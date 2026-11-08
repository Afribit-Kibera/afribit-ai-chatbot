import { useEffect, useState } from 'react';
import { studyApi, type StudySource } from '../lib/notebooks.js';
export function NotebookSources({notebookId}:{notebookId:string}){
 const [sources,setSources]=useState<StudySource[]>([]),[selected,setSelected]=useState<StudySource|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const abort=new AbortController();studyApi.sources(notebookId,abort.signal).then(r=>{if(!abort.signal.aborted)setSources(r.sources);}).catch(()=>{if(!abort.signal.aborted)setFailed(true);});return()=>abort.abort();},[notebookId]);
 return <details className="notebook-chat-sources"><summary>Your notebook sources · local-only</summary><p>Answers currently use bounded excerpts from up to six sources. Check supporting text; an AI citation is not a verified fact.</p>{failed&&<p role="status">Sources could not be loaded. Return to your notebook and try again.</p>}{sources.map(s=><button key={s.id} className="button button-ghost" onClick={()=>void studyApi.read(notebookId,s.id).then(setSelected).catch(()=>setFailed(true))}>{s.title}</button>)}{selected&&<article><h3>{selected.title}</h3><p style={{whiteSpace:'pre-wrap'}}>{selected.full_text}</p></article>}</details>;
}
