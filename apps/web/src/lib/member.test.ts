import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLearnerIdentity, sameLearnerIdentity, setLearnerIdentity } from "./learnerSession.js";
import { loadDraft, loadHistory, saveDraft, saveHistory, type Conversation } from "./history.js";
import { createChatAccess } from "./chatAccess.js";
import { getSession, sendChatMessage, streamChatMessage } from "./api.js";
import { joinCommunity, memberSignIn } from "./member.js";

const A = { id:"account-a", token:"token-a", label:"Member A" };
const B = { id:"account-b", token:"token-b", label:"Member B" };
const SA = "account:account-a:api:community", SB = "account:account-b:api:community";
let disk: Map<string,string>;
beforeEach(() => {
  setLearnerIdentity(null);
  disk = new Map();
  const storage = (map: Map<string,string>) => ({ getItem:(key:string)=>map.get(key)??null, setItem:(key:string,value:string)=>map.set(key,value), removeItem:(key:string)=>map.delete(key) });
  vi.stubGlobal("localStorage",storage(disk));
  vi.stubGlobal("sessionStorage",storage(new Map()));
});
afterEach(() => { setLearnerIdentity(null); vi.unstubAllGlobals(); });
const conversation = (content:string): Conversation => ({ localId:content, sessionId:content, title:content, updatedAt:1, messages:[{clientId:content,id:content,role:"user",content}] });

describe("learner identity and shared-device privacy", () => {
  it("isolates account/guest history and drafts and never persists account text to localStorage", () => {
    saveHistory([conversation("guest text")],"guest");
    saveDraft("guest","guest draft");
    setLearnerIdentity(A);
    saveHistory([conversation("A private text")],SA);
    saveDraft(SA,"A private draft");
    expect(loadHistory(SA)[0]!.title).toBe("A private text");
    expect(loadHistory(SB)).toEqual([]);
    expect(loadDraft(SB)).toBe("");
    expect(loadHistory("guest")[0]!.title).toBe("guest text");
    expect(JSON.stringify([...disk.values()])).not.toContain("A private");
    setLearnerIdentity(B);
    expect(loadHistory(SA)).toEqual([]);
    expect(loadDraft(SA)).toBe("");
    saveHistory([conversation("B private text")],SB);
    saveDraft(SB,"B private draft");
    setLearnerIdentity(null);
    expect(loadHistory(SB)).toEqual([]);
    expect(loadDraft(SB)).toBe("");
    expect(loadDraft("guest")).toBe("guest draft");
    expect(JSON.stringify([...disk.values()])).not.toContain("B private");
  });
  it("scopes guest text by an explicitly selected community and does not treat it as account history", () => {
    saveHistory([conversation("community one")],"guest:api:one");
    saveDraft("guest:api:one","one draft");
    expect(loadHistory("guest:api:two")).toEqual([]);
    expect(loadDraft("guest:api:two")).toBe("");
    setLearnerIdentity(A);
    expect(loadHistory(SA)).toEqual([]);
  });
  it("keeps learner sign-in separate from contributor sign-in and verifies the returned profile", async () => {
    disk.set("afribit.authToken",JSON.stringify("contributor-token"));
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({token:A.token,role:"learner"})).mockResolvedValueOnce(Response.json({id:A.id,email:A.label,displayName:null}));
    vi.stubGlobal("fetch",fetcher);
    await memberSignIn("a@example.test","long-password","community-code");
    expect(fetcher.mock.calls[0]![0]).toContain("/api/v1/member/register");
    expect(JSON.parse(fetcher.mock.calls[0]![1].body).invitationCode).toBe("community-code");
    expect(fetcher.mock.calls[1]![1].headers.Authorization).toBe(`Bearer ${A.token}`);
    expect(getLearnerIdentity()).toEqual(A);
    expect(JSON.parse(disk.get("afribit.authToken")!)).toBe("contributor-token");
    expect(sessionStorage.getItem("afribit.learnerSession.v1")).toContain(A.token);
  });
  it("uses only the account bearer on chat/history instead of combining it with guest capabilities", async () => {
    createChatAccess("").remember("guest-id","a".repeat(64),["guest-message"]);
    setLearnerIdentity(A);
    const fetcher=vi.fn().mockImplementation(async (url:string) => Response.json(url.endsWith("/chat") ? {sessionId:"account-id",messageId:"account-message",content:"answer"} : {sessionId:"account-id",messages:[]}));
    vi.stubGlobal("fetch",fetcher);
    await sendChatMessage({sessionId:"guest-id",message:"question",languageMode:"sheng",explanationLevel:"simple"});
    await getSession("account-id");
    for (const [,request] of fetcher.mock.calls) {
      expect(request.headers.Authorization).toBe(`Bearer ${A.token}`);
      expect(request.headers).not.toHaveProperty("x-chat-token");
    }
  });
  it("an in-flight sign-in cannot replace an account selected after it started", async () => {
    let finish!: (response:Response)=>void;
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({token:A.token})).mockImplementationOnce(()=>new Promise<Response>((resolve)=>{finish=resolve;}));
    vi.stubGlobal("fetch",fetcher);
    const pending=memberSignIn("a@example.test","long-password");
    await vi.waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));
    setLearnerIdentity(B);
    finish(Response.json({id:A.id,email:A.label,displayName:null}));
    await expect(pending).rejects.toThrow("Account changed");
    expect(getLearnerIdentity()).toEqual(B);
    expect(sameLearnerIdentity(A.token)).toBe(false);
  });
  it("stream fallback cannot resend A's question under B's credentials", async () => {
    let finish!: (response:Response)=>void;
    const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>((resolve)=>{finish=resolve;}));
    vi.stubGlobal("fetch",fetcher);
    setLearnerIdentity(A);
    const pending=streamChatMessage({sessionId:null,message:"A private question",languageMode:"sheng",explanationLevel:"simple"},()=>{});
    setLearnerIdentity(B);
    finish(new Response(null,{status:405}));
    await expect(pending).rejects.toThrow("Account changed");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]![1].headers.Authorization).toBe(`Bearer ${A.token}`);
  });
  it("joining uses the signed-in learner identity, never a submitted user ID", async () => {
    setLearnerIdentity(A);
    const fetcher=vi.fn().mockResolvedValue(Response.json({joined:true}));
    vi.stubGlobal("fetch",fetcher);
    await joinCommunity("one-use-code");
    expect(fetcher.mock.calls[0]![1].headers.Authorization).toBe(`Bearer ${A.token}`);
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({invitationCode:"one-use-code"});
  });
});
