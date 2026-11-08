import assert from "node:assert/strict";
import Fastify from "fastify";
import type { PGlite } from "@electric-sql/pglite";
import { authPlugin } from "../auth/plugin.js";
import { hashCode } from "../auth/invitations.js";
import { env } from "../config/env.js";
import { getPack, getRegistry, runWithPack, setRegistry } from "../pack/active.js";
import { buildRegistry } from "../pack/registry.js";
import { registerPackRoutes } from "../routes/pack.js";
import { registerAuthRoutes } from "../routes/auth.js";
import { registerCommunityRoutes } from "../routes/community.js";
import { registerCommunityGuard } from "./guard.js";
import { communityStore, CommunityAccessError } from "./store.js";
import { registerMicrotaskRoutes } from "../routes/microtasks.js";
import { registerChatRoutes, type ChatService } from "../routes/chat.js";
import { registerPrivacyRoutes } from "../routes/privacy.js";
import { sessionPackId, sendMessage, type SendMessageOutput } from "../chat/chatService.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { hashGuestToken } from "../chat/access.js";

export async function runCommunityCases(db: PGlite, ok: (name: string, fn: () => Promise<void>) => Promise<void>) {
  const original = getRegistry(), base = getPack(), registration = env.registration;
  const privatePack = { ...base, id: "members-test", description: "PRIVATE-DESCRIPTION", domain: { ...base.domain, id: "members-test", retrievalDomains: ["members-test"] }, knowledge: { topics: [], entries: [] }, starterQuestions: { reviewed: true, byMode: { sheng: ["PRIVATE-STARTER"] } } };
  setRegistry(buildRegistry([base, privatePack], base.id).registry!);
  (env as { registration: string }).registration = "invite";
  const ADMIN = "31000000-0000-4000-8000-000000000001", EXISTING = "31000000-0000-4000-8000-000000000002";
  await db.query(`INSERT INTO users (id,email,role,created_via) VALUES ($1,'membership-admin@x','admin','registered'),($2,'membership-existing@x','contributor','registered')`,[ADMIN,EXISTING]);
  const app = Fastify();
  let generations = 0, reads = 0;
  const gateway = {} as AfribitAIGateway;
  const service: ChatService = { sessionPackId,
    async sendMessage(_g,input) { generations++; return { sessionId: input.sessionId ?? "new", content: "allowed" } as SendMessageOutput; },
    async streamMessage(_g,input,emit) { generations++; emit({ type: "meta", sessionId: input.sessionId ?? "new", safetyFlag: null }); emit({ type: "done",messageId:"new",usedFallback:false }); },
  };
  try {
    await app.register(authPlugin);
    registerPackRoutes(app,communityStore);
    registerCommunityGuard(app);
    registerAuthRoutes(app);
    registerCommunityRoutes(app);
    registerChatRoutes(app,gateway,service);
    registerPrivacyRoutes(app);
    registerMicrotaskRoutes(app);
    app.get("/api/v1/knowledge/search",async () => { reads++; return { content: "MEMBERS-CONTENT" }; });
    await app.ready();
    const auth = (id: string, role: "admin" | "learner" | "contributor" = "learner") => ({ authorization: `Bearer ${app.jwt.sign({id,role})}` });
    const headers = (extra: Record<string,string> = {}) => ({ "x-pack":privatePack.id,...extra });
    const invite = async (pack = privatePack.id) => {
      const res = await app.inject({ method:"POST",url:"/api/v1/admin/community/invitations",headers:{...auth(ADMIN,"admin"),"x-pack":pack} });
      assert.equal(res.statusCode,201,res.body);
      return res.json() as {id:string;code:string};
    };
    let learnerId = "", learnerToken = "", accountSession = "";

    await ok("membership: policies are opt-in; private AI/knowledge requires enrollment before handler/model work",async () => {
      assert.equal((await app.inject({method:"POST",url:"/api/v1/chat",payload:{message:"hello"}})).statusCode,200);
      assert.equal((await app.inject({method:"PUT",url:"/api/v1/admin/community/access",headers:headers(auth(ADMIN,"admin")),payload:{membersOnly:true}})).statusCode,200);
      const before = [generations,reads];
      for (const request of [
        {method:"GET" as const,url:"/api/v1/knowledge/search?q=private"},
        {method:"POST" as const,url:"/api/v1/chat",payload:{message:"private"}},
        {method:"POST" as const,url:"/api/v1/chat/stream",payload:{message:"private"}},
      ]) {
        assert.equal((await app.inject({...request,headers:headers()})).statusCode,401);
        assert.equal((await app.inject({...request,headers:headers(auth(EXISTING,"contributor"))})).statusCode,403);
      }
      assert.deepEqual([generations,reads],before);
      const guestId="32000000-0000-4000-8000-000000000099", guestToken="e".repeat(64);
      await db.query(`INSERT INTO chat_sessions (id,pack_id,language_mode,explanation_level,guest_access_hash,guest_access_expires_at)
        VALUES ($1,$2,'sheng','normal',$3,now()+interval '1 day')`,[guestId,privatePack.id,hashGuestToken(guestToken)]);
      assert.equal((await app.inject({method:"POST",url:"/api/v1/chat",headers:{"x-chat-token":guestToken},payload:{sessionId:guestId,message:"private"}})).statusCode,401);
      assert.equal(generations,before[0]);
    });
    await ok("membership: private pack discovery omits knowledge/examples and uses no-store",async () => {
      const res = await app.inject({method:"GET",url:"/api/v1/pack",headers:headers()});
      assert.equal(res.statusCode,200);
      assert.equal(res.headers["cache-control"],"no-store");
      assert.equal(res.json().membershipRequired,true);
      assert.ok(!res.body.includes("PRIVATE-"));
      assert.deepEqual(res.json().knowledge,{topics:0,publishedCards:0});
    });
    await ok("membership: scoped invitations register a learner atomically and only the hash is stored",async () => {
      const code = await invite();
      const stored = (await db.query<{code_hash:string}>(`SELECT code_hash FROM community_invitations WHERE id=$1`,[code.id])).rows[0]!;
      assert.equal(stored.code_hash,hashCode(code.code));
      assert.notEqual(stored.code_hash,code.code);
      const payload = {email:"membership-learner@x",password:"a-long-test-password",invitationCode:code.code};
      const wrongPack = await app.inject({method:"POST",url:"/api/v1/member/register",payload});
      assert.equal(wrongPack.statusCode,409);
      assert.equal((await db.query(`SELECT id FROM users WHERE email=$1`,[payload.email])).rows.length,0);
      const res = await app.inject({method:"POST",url:"/api/v1/member/register",headers:headers(),payload});
      assert.equal(res.statusCode,201,res.body);
      learnerToken = res.json().token;
      const decoded = app.jwt.verify<{id:string;role:string}>(learnerToken);
      learnerId = decoded.id;
      assert.equal(decoded.role,"learner");
      assert.equal((await communityStore.state(privatePack.id,learnerId)).member,true);
      assert.equal((await app.inject({method:"POST",url:"/api/v1/member/register",headers:headers(),payload:{...payload,email:"membership-reused@x"}})).statusCode,409);
      assert.equal((await db.query(`SELECT id FROM users WHERE email='membership-reused@x'`)).rows.length,0);
      const login = await app.inject({method:"POST",url:"/api/v1/auth/login",payload:{email:payload.email,password:payload.password}});
      assert.equal(login.statusCode,200);
      assert.equal(login.json().role,"learner");
    });
    await ok("membership: learners can use AI but cannot contribute, review or administer",async () => {
      const own = headers({authorization:`Bearer ${learnerToken}`});
      assert.equal((await app.inject({method:"POST",url:"/api/v1/chat",headers:own,payload:{message:"hello"}})).statusCode,200);
      assert.equal((await app.inject({method:"GET",url:"/api/v1/knowledge/search?q=hello",headers:own})).statusCode,200);
      assert.equal((await app.inject({method:"GET",url:"/api/v1/microtasks/queue",headers:own})).statusCode,403);
      assert.equal((await app.inject({method:"POST",url:"/api/v1/admin/community/invitations",headers:own})).statusCode,403);
      assert.equal((await app.inject({method:"PUT",url:"/api/v1/admin/community/access",headers:own,payload:{membersOnly:false}})).statusCode,403);
      const res = await app.inject({method:"GET",url:"/api/v1/community/access",headers:own});
      assert.deepEqual(res.json(),{packId:privatePack.id,membersOnly:true,member:true,authenticated:true});
    });
    await ok("membership: expired/revoked codes and duplicate-email failures do not consume valid invitations",async () => {
      for (const state of ["expired","revoked"] as const) {
        const code = await invite();
        await db.query(state === "expired" ? `UPDATE community_invitations SET expires_at=now()-interval '1 day' WHERE id=$1` : `UPDATE community_invitations SET revoked_at=now() WHERE id=$1`,[code.id]);
        await assert.rejects(() => communityStore.redeem(privatePack.id,code.code,{userId:EXISTING}),e => e instanceof CommunityAccessError && e.statusCode===409);
      }
      const code = await invite();
      const res = await app.inject({method:"POST",url:"/api/v1/member/register",headers:headers(),payload:{email:"membership-existing@x",password:"a-long-test-password",invitationCode:code.code}});
      assert.equal(res.statusCode,409);
      assert.equal((await db.query<{used_at:Date|null}>(`SELECT used_at FROM community_invitations WHERE id=$1`,[code.id])).rows[0]!.used_at,null);
      await communityStore.redeem(privatePack.id,code.code,{userId:EXISTING});
      assert.equal((await db.query<{role:string}>(`SELECT role FROM users WHERE id=$1`,[EXISTING])).rows[0]!.role,"contributor");
    });
    await ok("membership: only one's own conversations appear in the selected community",async () => {
      accountSession = "32000000-0000-4000-8000-000000000001";
      for (const [id,owner,pack] of [[accountSession,learnerId,privatePack.id],["32000000-0000-4000-8000-000000000002",EXISTING,privatePack.id],["32000000-0000-4000-8000-000000000003",learnerId,base.id]] as const) {
        await db.query(`INSERT INTO chat_sessions (id,user_id,pack_id,language_mode,explanation_level) VALUES ($1,$2,$3,'sheng','normal')`,[id,owner,pack]);
        await db.query(`INSERT INTO chat_messages (session_id,role,content) VALUES ($1,'user','private title')`,[id]);
      }
      const res = await app.inject({method:"GET",url:"/api/v1/me/conversations",headers:headers(auth(learnerId))});
      assert.equal(res.statusCode,200,res.body);
      assert.deepEqual(res.json().conversations.map((s:{sessionId:string})=>s.sessionId),[accountSession]);
      assert.equal((await app.inject({method:"GET",url:`/api/v1/chat/${accountSession}`,headers:headers(auth(EXISTING,"contributor"))})).statusCode,404);
    });
    await ok("membership: revocation defeats a live JWT and implicit cross-pack continuation; erasure remains possible",async () => {
      const res = await app.inject({method:"DELETE",url:`/api/v1/admin/community/members/${learnerId}`,headers:headers(auth(ADMIN,"admin"))});
      assert.equal(res.statusCode,204);
      const before=generations;
      for (const url of ["/api/v1/chat","/api/v1/chat/stream"])
        assert.equal((await app.inject({method:"POST",url,headers:auth(learnerId),payload:{sessionId:accountSession,message:"private"}})).statusCode,403);
      assert.equal((await app.inject({method:"GET",url:`/api/v1/chat/${accountSession}`,headers:headers(auth(learnerId))})).statusCode,403);
      assert.equal((await app.inject({method:"GET",url:"/api/v1/knowledge/search?q=private",headers:headers(auth(learnerId))})).statusCode,403);
      assert.equal(generations,before);
      await assert.rejects(() => runWithPack(privatePack,() => sendMessage(gateway,{sessionId:accountSession,userId:learnerId,message:"private"})),e => e instanceof CommunityAccessError);
      assert.equal((await app.inject({method:"DELETE",url:`/api/v1/chat/${accountSession}`,headers:headers(auth(learnerId))})).statusCode,204);
      assert.equal((await db.query(`SELECT id FROM chat_sessions WHERE id=$1`,[accountSession])).rows.length,0);
    });
    await ok("membership: invalid bearer tokens cannot silently become public guest requests",async () => {
      const before=generations;
      assert.equal((await app.inject({method:"POST",url:"/api/v1/chat",headers:{authorization:"Bearer invalid"},payload:{message:"hello"}})).statusCode,401);
      assert.equal(generations,before);
    });
    await ok("membership: admin bootstrap checks current role, and invite revocation is scoped",async () => {
      const code=await invite();
      await app.inject({method:"DELETE",url:`/api/v1/admin/community/invitations/${code.id}`,headers:auth(ADMIN,"admin")});
      assert.equal((await db.query<{revoked_at:Date|null}>(`SELECT revoked_at FROM community_invitations WHERE id=$1`,[code.id])).rows[0]!.revoked_at,null);
      await app.inject({method:"DELETE",url:`/api/v1/admin/community/invitations/${code.id}`,headers:headers(auth(ADMIN,"admin"))});
      await assert.rejects(()=>communityStore.redeem(privatePack.id,code.code,{userId:EXISTING}));
      const oldToken=auth(ADMIN,"admin");
      await db.query(`UPDATE users SET role='contributor' WHERE id=$1`,[ADMIN]);
      assert.equal((await app.inject({method:"POST",url:"/api/v1/admin/community/invitations",headers:headers(oldToken)})).statusCode,403);
    });
    await ok("membership: contribution references cannot cross pack boundaries through a public route",async () => {
      const inserted=await db.query<{id:string}>(`INSERT INTO language_entries (utterance,style,pack_id,corpus_layer) VALUES ('private phrase','sheng',$1,'L2_community_collected') RETURNING id`,[privatePack.id]);
      const id=inserted.rows[0]!.id;
      for (const [path,payload] of [["vote",{naturalness:3}],["review",{decision:"approve"}]] as const)
        assert.equal((await app.inject({method:"POST",url:`/api/v1/microtasks/language-entries/${id}/${path}`,headers:auth(EXISTING,"contributor"),payload})).statusCode,404);
    });
  } finally {
    await app.close(); setRegistry(original); (env as {registration:string}).registration=registration;
  }
}
