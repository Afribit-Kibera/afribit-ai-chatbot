import {spawnSync} from "node:child_process";
import {mkdirSync,writeFileSync,readFileSync} from "node:fs";
import {join} from "node:path";
import {TrialRecord,TRIAL_DIRECTORY} from "./trials.js";
import {REPOSITORY_ROOT,revisionIdentity} from "./revision.js";
import {hash} from "./protocol.js";
const trial=new TrialRecord(TRIAL_DIRECTORY,"offline-human-review-tool-fixtures","pnpm --filter @afribit/api test:review-tool");
try{
  trial.event("revision",revisionIdentity());
  const run=spawnSync(process.execPath,["--test","tools/blind-review/build.test.mjs"],{cwd:REPOSITORY_ROOT,encoding:"utf8",timeout:30000,windowsHide:true,maxBuffer:65536});
  const output=(run.stdout??"")+(run.stderr??""),checks=Number(output.match(/(?:#|ℹ) tests (\d+)/)?.[1]??0),passed=run.status===0&&checks===6;
  const dir=join(REPOSITORY_ROOT,"output/review-tool",trial.id);mkdirSync(dir,{recursive:true});
  writeFileSync(join(dir,"fixtures.txt"),output,{mode:0o600});
  const helperHash=hash(["build.mjs","review-template.html","score.mjs","build.test.mjs"].map(name=>[name,readFileSync(join(REPOSITORY_ROOT,"tools/blind-review",name),"utf8")]));
  trial.finish(passed?"completed":"failed",0,{artifacts:dir,helperHash,checks,humanReviews:0,modelCalls:0,networkRequests:0});console.log(output.trim());console.log(JSON.stringify({trial:trial.id,checks,passed,humanReviews:0}));if(!passed)process.exitCode=1;
}catch{trial.finish("failed",0,{reason:"review-tool-fixtures-failed",humanReviews:0,modelCalls:0});process.exitCode=1;}
