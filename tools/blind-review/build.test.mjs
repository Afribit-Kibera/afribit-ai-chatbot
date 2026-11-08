import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
function build(input,seed="fixture-seed"){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"afribit-review-fixture-"));
  const file=path.join(dir,"input.json"),out=path.join(dir,"pack");fs.writeFileSync(file,JSON.stringify(input));
  const run=spawnSync(process.execPath,[path.join(root,"tools/blind-review/build.mjs"),file,out,seed],{encoding:"utf8",timeout:5000});
  const html=run.status===0?fs.readFileSync(path.join(out,"review.html"),"utf8"):null;
  const pack=html?JSON.parse(html.match(/const PACK = (.*);/)[1]):null;
  return {run,html,pack,key:run.status===0?JSON.parse(fs.readFileSync(path.join(out,"key.json"),"utf8")):null,dir,out};
}
const base={title:"Synthetic review",items:[{id:"case-one",mode:"sheng",question:"Synthetic question",answers:[{variant:"hidden-candidate-one",text:"Unchanged answer one"},{variant:"hidden-candidate-two",text:"Unchanged answer two"}]}]};
test("legacy comparison preserves both answers and keeps variant identity only in its key",()=>{
  const r=build(base);assert.equal(r.run.status,0);assert.equal(r.pack.reviewMode,"comparison");assert.equal(r.pack.items[0].answers.length,2);
  assert.equal(r.html.includes("hidden-candidate-one"),false);assert.equal(r.key.pack,r.pack.id);
  assert.deepEqual(new Set(Object.values(r.key.items["case-one"])),new Set(["hidden-candidate-one","hidden-candidate-two"]));
});
test("single review retains reference/criteria and exact output while excluding operator metadata",()=>{
  const input={...base,reviewMode:"single",operatorSecret:"synthetic-hidden",items:[{...base.items[0],reference:"Approved fictional facts",criteria:["Use reference"],memberId:"synthetic-hidden",answers:[base.items[0].answers[0]]}]};
  const a=build(input),b=build(input);assert.equal(a.run.status,0);assert.equal(a.pack.id,b.pack.id);
  assert.equal(a.pack.reviewMode,"single");assert.equal(a.pack.items[0].reference,"Approved fictional facts");assert.equal(a.pack.items[0].answers[0].text,"Unchanged answer one");assert.equal(a.html.includes("synthetic-hidden"),false);
});
test("reference or review mode changes the pack fingerprint and script-closing input is escaped",()=>{
  const input={...base,reviewMode:"single",items:[{...base.items[0],reference:"</script><script>syntheticAttack()</script>",criteria:["<img src=x>"],answers:[base.items[0].answers[0]]}]};
  const a=build(input),b=build({...input,items:[{...input.items[0],reference:"different"}]});
  assert.notEqual(a.pack.id,b.pack.id);assert.ok(a.html.includes("\\u003c/script>"));assert.equal(a.html.includes("<script>syntheticAttack()"),false);
});
test("invalid IDs, duplicate cases, malformed references and single-mode comparisons are refused",()=>{
  for(const input of [{...base,items:[]},{...base,items:[base.items[0],base.items[0]]},{...base,reviewMode:"single"},{...base,items:[{...base.items[0],reference:{bad:true}}]},{...base,items:[{...base.items[0],id:'bad"id'}]}])assert.notEqual(build(input).run.status,0);
});
test("scoring refuses a returned review from a different pack instead of silently aggregating",()=>{
  const r=build(base),file=path.join(r.dir,"wrong-pack.json");fs.writeFileSync(file,JSON.stringify({pack:"wrong",reviewMode:"comparison",ratings:{}}));
  const result=spawnSync(process.execPath,[path.join(root,"tools/blind-review/score.mjs"),path.join(r.out,"key.json"),file],{encoding:"utf8",timeout:5000});assert.notEqual(result.status,0);
});
test("automated browser fixture exports cannot be counted as human reviews",()=>{
  const r=build(base),file=path.join(r.dir,"automated.json");fs.writeFileSync(file,JSON.stringify({pack:r.pack.id,reviewMode:"comparison",reviewer:{name:"AUTOMATED-FIXTURE-NOT-HUMAN"},ratings:{}}));
  const result=spawnSync(process.execPath,[path.join(root,"tools/blind-review/score.mjs"),path.join(r.out,"key.json"),file],{encoding:"utf8",timeout:5000});assert.notEqual(result.status,0);
});
