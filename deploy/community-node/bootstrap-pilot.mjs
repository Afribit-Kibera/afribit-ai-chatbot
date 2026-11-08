/** Run manually inside the dedicated API container, once, against an empty user database.
 * Writes staging credentials to a private file; never prints passwords or tokens.
 * These .invalid identities are for operator smoke tests, not participant invitations. */
import {randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {pool} from '/app/apps/api/dist/db/pool.js';
import {hashPassword} from '/app/apps/api/dist/auth/passwords.js';
import {computeStore} from '/app/apps/api/dist/compute/store.js';
const filename='/tmp/afribit-stage-accounts.json',pack='kibera-bitcoin';
try{
 if(Number((await pool.query('SELECT count(*) AS count FROM users')).rows[0].count)!==0)throw Error('Bootstrap requires an empty user database; existing accounts were preserved.');
 const accounts=[];
 for(const role of ['admin','reviewer','learner']){
  const email=`pilot-${role}@afribit.invalid`,password=randomBytes(24).toString('base64url');
  const {rows}=await pool.query(`INSERT INTO users(email,password_hash,display_name,role,created_via) VALUES($1,$2,$3,$4,'registered') RETURNING id`,[email,await hashPassword(password),`Staging ${role}`,role]);
  await pool.query('INSERT INTO community_memberships(pack_id,user_id) VALUES($1,$2)',[pack,rows[0].id]);accounts.push({id:rows[0].id,email,password,role});
 }
 await pool.query(`INSERT INTO community_access_policies(pack_id,members_only) VALUES($1,true) ON CONFLICT(pack_id) DO UPDATE SET members_only=true`,[pack]);
 await computeStore.save(pack,accounts[0].id,0,true,{dailyBudgetMicrousd:0,dailyAttemptLimit:20,routes:[{kind:'chat',provider:'local',model:'qwen3:8b',baseUrl:'http://model:11434',region:'community',maxInputBytes:100000,maxOutputTokens:600,reservationMicrousd:0,billingBoundConfirmed:true,upstreams:[],promptPriceMicrousdPerMillion:0,completionPriceMicrousdPerMillion:0}]});
 writeFileSync(filename,JSON.stringify({purpose:'Private staging-only credentials; no participant invitation issued',accounts},null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log('Created three private staging identities; membership gate enabled; local-only compute limited to 20 attempts/day.');
}finally{await pool.end();}
