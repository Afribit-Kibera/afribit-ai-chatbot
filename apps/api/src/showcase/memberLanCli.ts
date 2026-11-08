import {mkdirSync,writeFileSync,existsSync} from "node:fs";
import {join} from "node:path";
import {networkInterfaces} from "node:os";
import {createMemberLanNode} from "./memberLanNode.js";
import {TrialRecord,TRIAL_DIRECTORY} from "./trials.js";
import {revisionIdentity,REPOSITORY_ROOT} from "./revision.js";

const trial=new TrialRecord(TRIAL_DIRECTORY,"running-synthetic-member-lan-node","pnpm --filter @afribit/api showcase:member-lan WIFI_IPV4");
const dir=join(REPOSITORY_ROOT,"output/member-lan-node",trial.id);mkdirSync(dir,{recursive:true});
let node:Awaited<ReturnType<typeof createMemberLanNode>>|undefined,timer:ReturnType<typeof setTimeout>|undefined,stopPoll:ReturnType<typeof setInterval>|undefined,ending=false;
const save=(name:string,value:unknown)=>writeFileSync(join(dir,name),JSON.stringify(value,null,2)+"\n",{mode:0o600});
try{
 const bind=process.argv[2];if(process.argv.length!==3||!/^192\.168\.\d{1,3}\.\d{1,3}$/.test(bind??"")||!Object.values(networkInterfaces()).flat().some(n=>!!n&&n.address===bind&&!n.internal))throw new Error("Expected an owned private LAN IPv4");
 const revision=revisionIdentity();trial.event("revision",revision);
 const admittedAt=new Date().toISOString(),expiresAt=new Date(Date.now()+120*60000).toISOString();
 node=await createMemberLanNode();await node.app.listen({host:bind,port:4189});const origin=`http://${bind}:4189`;node.setOrigin(origin);
 save("private-accounts.json",{warning:"Disposable synthetic LAN accounts only. Do not publish, reuse or serve this file.",accounts:node.accounts});
 writeFileSync(join(dir,"TEST-ACCOUNTS.md"),"# Temporary synthetic test accounts\n\nUse fictional inputs only. All model calls are disabled; saved approved answers only.\nData lives in memory and disappears when this node closes. Share only an assigned test account.\nA1/B1 are for phone use; A2/B2 may contain automated verification history.\n\n| Account | Community link | Email | Temporary password |\n|---|---|---|---|\n"+node.accounts.map(a=>`| ${a.label} | ${origin}/app/?pack=${a.packId} | ${a.email} | ${a.password} |`).join("\n")+`\n\nExpires ${expiresAt} UTC. No admin user or registration. These are intentionally disposable test identities.\n`,{mode:0o600});
 const info={trial:trial.id,pid:process.pid,state:"active",origin,admittedAt,expiresAt,revision,urls:node.packs.map(id=>`${origin}/app/?pack=${id}`),reviewedOnly:true,modelCalls:0,paidComputeUsd:0,
  physicalPhoneSignInConfirmed:false,physicalPhoneChatConfirmed:false,uplinkLossConfirmed:false,storage:"ephemeral PGlite in this process; lost at shutdown",staticAssetCount:node.staticAssetCount};
 save("server.json",info);writeFileSync(join(REPOSITORY_ROOT,"output/member-lan-latest.json"),JSON.stringify({trial:trial.id,serverFile:join(dir,"server.json"),privateAccountsFile:join(dir,"private-accounts.json")},null,2)+"\n",{mode:0o600});
 const stop=async(reason:string)=>{if(ending)return;ending=true;if(timer)clearTimeout(timer);if(stopPoll)clearInterval(stopPoll);try{save("shutdown-metadata.json",await node!.close());info.state="closed";save("server.json",info);trial.finish("completed",0,{artifacts:dir,reason,modelCalls:0,physicalPhoneChatConfirmed:false});}catch{info.state="cleanup-failed";save("server.json",info);trial.finish("needs-attention",0,{artifacts:dir,reason:"member-node-cleanup-failed",modelCalls:0});process.exitCode=1;}};
 process.on("SIGINT",()=>void stop("operator-stop"));process.on("SIGTERM",()=>void stop("operator-stop"));
 timer=setTimeout(()=>void stop("absolute-two-hour-expiry"),Math.max(0,Date.parse(expiresAt)-Date.now()));
 stopPoll=setInterval(()=>{if(existsSync(join(dir,"stop-request.json")))void stop("operator-local-stop-request");},500);
 trial.event("listener-ready",{origin,expiresAt,pid:process.pid,accounts:4,reviewedOnly:true});
 console.log(JSON.stringify({trial:trial.id,origin,urls:info.urls,expiresAt,credentialsFile:join(dir,"TEST-ACCOUNTS.md"),modelCalls:0}));
}catch{if(node)try{await node.close();}catch{}trial.finish("failed",0,{artifacts:dir,reason:"member-node-startup-failed",modelCalls:0});process.exitCode=1;}
