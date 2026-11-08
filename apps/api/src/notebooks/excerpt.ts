/** Bounded lexical baseline: find a useful window without embedding or model calls.
 * Does not claim semantic understanding, comprehensive book coverage, or source verification. */
export function sourceExcerpt(text:string,question:string,limit:number):string{
 if(text.length<=limit)return text;
 const stop=new Set(['the','and','what','how','is','in','to','of','about','explain','me','ni','na','ya','kwa','hii','nini','please','can','you','this','that','my']);
 const terms=[...new Set((question.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)??[]).filter(t=>!stop.has(t)))].slice(0,24);
 const lower=text.toLowerCase();let best=0,score=0;
 for(const term of terms){let offset=0;for(let hit=0;hit<8;hit++){
  const at=lower.indexOf(term,offset);if(at<0)break;offset=at+term.length;
  const start=Math.max(0,Math.min(at-Math.floor(limit/2),text.length-limit));
  const window=lower.slice(start,start+limit);const rank=terms.reduce((n,t)=>n+(window.includes(t)?1:0),0);
  if(rank>score){best=start;score=rank;}
 }}
 return text.slice(best,best+limit);
}
