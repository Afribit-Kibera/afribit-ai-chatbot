/** Open Notebook REST contract inspected at 5e285b7a2e435895c4ee99ad7e4b8d2af64c3239.
 * Only plain text, no transforms/embeddings/provider calls; never a general reverse proxy. */
export class NotebookError extends Error { constructor(readonly statusCode:number,message:string){super(message);} }
export interface NotebookSource { id:string; title:string|null; full_text?:string|null; notebooks?:string[] }
export class OpenNotebookClient {
  readonly base:string;
  constructor(url:string,private password:string,private transport:typeof fetch=fetch){
    let parsed:URL; try { parsed=new URL(url); } catch { throw new NotebookError(503,'Source service is not configured'); }
    if(!['http:','https:'].includes(parsed.protocol) || !['127.0.0.1','localhost','[::1]'].includes(parsed.hostname)
      || parsed.username || parsed.password || parsed.search || parsed.hash || !['','/'].includes(parsed.pathname) || !password)
      throw new NotebookError(503,'Source service requires a password and a loopback endpoint');
    this.base=parsed.origin;
  }
  private async request<T>(path:string,method='GET',body?:unknown):Promise<T>{
    try {
      const response=await this.transport(this.base+'/api'+path,{method,headers:{Authorization:`Bearer ${this.password}`,'Content-Type':'application/json'},
        body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(20000)});
      if(!response.ok){await response.body?.cancel();throw new NotebookError(503,'Source service is unavailable. Please try again.');}
      if(response.status===204)return undefined as T;
      // Bound reads even when the upstream omits Content-Length.
      const reader=response.body?.getReader(); if(!reader)throw new Error('Missing body');
      const chunks:Uint8Array[]=[];let bytes=0;
      try{while(true){const value=await reader.read();if(value.done)break;bytes+=value.value.length;if(bytes>2000000){await reader.cancel();throw new Error('Source response too large');}chunks.push(value.value);}}
      finally{reader.releaseLock();}
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
    }catch(error){if(error instanceof NotebookError)throw error;throw new NotebookError(503,'Source service is unavailable. Please try again.');}
  }
  create(title:string){return this.request<{id:string}>('/notebooks','POST',{name:title,description:'Private Afribit learning notebook'});}
  remove(id:string){return this.request('/notebooks/'+encodeURIComponent(id)+'?delete_exclusive_sources=true','DELETE');}
  sources(id:string){return this.request<NotebookSource[]>('/sources?notebook_id='+encodeURIComponent(id));}
  source(id:string){return this.request<NotebookSource>('/sources/'+encodeURIComponent(id));}
  addText(id:string,title:string,content:string){return this.request<NotebookSource>('/sources/json','POST',{
    type:'text',notebooks:[id],title,content,embed:false,transformations:[],async_processing:false,
  });}
}
export function configuredNotebookClient(){
  if(!process.env.OPEN_NOTEBOOK_API_URL)return null;
  return new OpenNotebookClient(process.env.OPEN_NOTEBOOK_API_URL,process.env.OPEN_NOTEBOOK_PASSWORD??'');
}
