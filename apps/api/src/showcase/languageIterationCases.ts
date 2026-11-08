import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_PACK_DIR, getRegistry, runWithPack } from "../pack/active.js";
import { loadPack } from "../pack/load.js";
import type { CommunityPack } from "../pack/types.js";
import { buildPrompt } from "../prompt/promptBuilder.js";
import { buildCompactPrompt, buildServePrompt } from "../prompt/compactPrompt.js";
import { previewLanguagePack, languageFixtureInput, prepareLanguageIteration, type LanguageProposal, type LanguageSuite } from "./languageIteration.js";
import { hash } from "./protocol.js";
import { REPOSITORY_ROOT, revisionIdentity } from "./revision.js";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";

const trial = new TrialRecord(TRIAL_DIRECTORY, "community-language-iteration-preflight", "pnpm --filter @afribit/api test:language-iteration");
const dir = join(REPOSITORY_ROOT, "output/language-iteration", trial.id); mkdirSync(dir, { recursive: true });
const save = (name: string, value: unknown) => writeFileSync(join(dir, name), JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
const checks: { name: string; passed: boolean }[] = [];
async function check(name: string, work: () => unknown | Promise<unknown>) {
  try { await work(); checks.push({ name, passed: true }); trial.event("check", { name, passed: true }); }
  catch (error) { checks.push({ name, passed: false }); trial.event("check", { name, passed: false }); throw error; }
  finally { save("checks.json", checks); }
}
try {
  const revision = revisionIdentity(); trial.event("revision", revision);
  const proposal = JSON.parse(readFileSync(join(REPOSITORY_ROOT, "docs/evaluation/community-language-proposal-v1.json"), "utf8")) as LanguageProposal;
  const suite = JSON.parse(readFileSync(join(REPOSITORY_ROOT, "docs/evaluation/language-iteration-synthetic-v1.json"), "utf8")) as LanguageSuite;
  save("proposal.json", proposal); save("synthetic-suite.json", suite);
  const loaded = loadPack(DEFAULT_PACK_DIR); assert.ok(loaded.ok && loaded.pack);
  const packs: CommunityPack[] = ["language-pilot-a", "language-control-b"].map(id => ({ ...loaded.pack!, id }));
  const before = hash(packs), registry = getRegistry(), base = packs[0]!, candidate = previewLanguagePack(base, proposal);
  const style = "PILOT LANGUAGE CANDIDATE V1", task = "PILOT SCHEDULE TASK V1";
  const sample = languageFixtureInput(suite.cases[0]!);
  const builders = (pack: CommunityPack, mode = "sheng") => [buildPrompt({ ...sample, languageMode: mode }, pack),
    buildCompactPrompt({ ...sample, languageMode: mode }, pack), buildServePrompt({ ...sample, languageMode: mode, facts: suite.cases[0]!.passage.text }, pack)];
  await check("candidate appears in real full, compact and serve prompts without changing factual passage", () => {
    for (const messages of builders(candidate)) { assert.ok(messages[0]!.content.includes(style)); assert.ok(messages[0]!.content.includes(task)); assert.ok(messages[0]!.content.includes(suite.cases[0]!.passage.text)); }
  });
  await check("Sheng and mixed modes receive scoped guidance while English and Kiswahili do not", () => {
    for (const mode of ["sheng", "mixed_ke", "simple_en", "swahili"]) for (const messages of builders(candidate, mode))
      assert.equal(messages[0]!.content.includes(style), ["sheng", "mixed_ke"].includes(mode));
  });
  await check("another community keeps byte-identical full, compact and serve prompts", () => {
    const control = packs[1]!, controlBefore = builders(control); previewLanguagePack(base, proposal);
    assert.deepEqual(builders(control), controlBefore); assert.ok(!JSON.stringify(controlBefore).includes(style) && !JSON.stringify(controlBefore).includes(task));
    assert.throws(() => previewLanguagePack(control, proposal));
  });
  await check("safety, knowledge, few-shots, postprocessing and nonselected mode policies are preserved", () => {
    for (const key of ["safetyFull", "safetyCompact", "serveSafety", "fewShots"] as const) assert.deepEqual(candidate.prompts[key], base.prompts[key]);
    assert.deepEqual(candidate.knowledge, base.knowledge); assert.deepEqual(candidate.postprocess, base.postprocess);
    for (const mode of ["simple_en", "swahili"]) assert.deepEqual(candidate.modes.find(m => m.id === mode), base.modes.find(m => m.id === mode));
    for (let i = 0; i < 3; i++) assert.ok(builders(candidate)[i]![0]!.content.includes([base.prompts.safetyFull, base.prompts.safetyCompact, base.prompts.serveSafety][i]!));
  });
  await check("preview refuses false approval, wrong scope, missing guidance and non-code-switched modes", () => {
    for (const change of [{ status: "approved" }, { communityApprovals: ["unverified"] }, { scope: "production" }, { modeIds: ["simple_en"] }, { modeIds: ["unknown"] }, { modeIds: ["sheng", "sheng"] }, { taskGuidance: "" }])
      assert.throws(() => previewLanguagePack(base, { ...proposal, ...change } as unknown as LanguageProposal));
  });
  await check("async request-local candidate never changes simultaneous control or baseline defaults", async () => {
    const scoped = await Promise.all([candidate, packs[1]!, base].map(pack => runWithPack(pack, async () => { await new Promise<void>(r => setTimeout(r, 5)); return buildCompactPrompt(sample); })));
    assert.ok(scoped[0]![0]!.content.includes(style)); assert.ok(!scoped[1]![0]!.content.includes(style)); assert.ok(!scoped[2]![0]!.content.includes(style)); assert.equal(getRegistry(), registry);
  });
  const prepared = prepareLanguageIteration(packs, proposal, suite); save("prepared-prompts.json", prepared);
  await check("eight development probes prepare paired target prompts plus unchanged other-community control", () => {
    assert.equal(suite.cases.length, 8); assert.equal(prepared.prompts.length, 15); assert.equal(prepared.heldOutBenchmark, false); assert.equal(prepared.modelCalls, 0);
    for (const c of suite.cases) { const prompts = prepared.prompts.filter(p => p.caseId === c.id); assert.equal(prompts.length, c.packId === base.id ? 2 : 1); for (const p of prompts) assert.ok(p.messages[0]!.content.includes(c.passage.text)); }
  });
  await check("assessor fields and raw review markers cannot enter prepared baseline or candidate prompts", () => {
    const poisoned = { ...suite, cases: suite.cases.map(c => ({ ...c, assess: { requiredFacts: [suite.assessorOnlyCanary], reject: ["ASSESSOR_INSTRUCTION_SECRET"], mustAcknowledgeUnknown: [] }, rawReview: "RAW_REVIEW_NOT_FOR_PROMPT" })) };
    const other = prepareLanguageIteration(packs, proposal, poisoned);
    assert.deepEqual(other.prompts, prepared.prompts); assert.notEqual(other.suiteHash, prepared.suiteHash);
    assert.ok(!JSON.stringify(other.prompts).includes("RAW_REVIEW_NOT_FOR_PROMPT"));
  });
  await check("compact previews reserve all300 output tokens inside8192 with conservative estimates", () => {
    for (const p of prepared.prompts) { assert.equal(p.context.reservedOutputTokens, 300); assert.equal(p.context.exactTokenizer, false); assert.ok(p.context.remainingEstimate >= 0); }
    assert.throws(() => prepareLanguageIteration(packs, proposal, suite, 512, 300));
    assert.throws(() => prepareLanguageIteration(packs, proposal, suite, 8192, 8192));
  });
  await check("updated supplied record changes facts without changing model weights or language recipe", () => {
    const updated = { ...suite, cases: [{ ...suite.cases[0]!, passage: { id: "pilot-a.schedule", text: "Updated fictional record: Sunday 13:00 to 14:00; each session costs KSh 15." } }] };
    const other = prepareLanguageIteration(packs, proposal, updated), beforeCandidate = prepared.prompts.find(p => p.caseId === suite.cases[0]!.id && p.variant === "candidate")!, afterCandidate = other.prompts.find(p => p.variant === "candidate")!;
    assert.equal(beforeCandidate.proposalHash, afterCandidate.proposalHash); assert.notEqual(beforeCandidate.passageHash, afterCandidate.passageHash); assert.notEqual(beforeCandidate.promptHash, afterCandidate.promptHash);
    assert.ok(afterCandidate.messages[0]!.content.includes(updated.cases[0]!.passage.text)); assert.ok(!afterCandidate.messages[0]!.content.includes(suite.cases[0]!.passage.text));
  });
  await check("history and question remain unchanged across baseline and candidate builders", () => {
    const history = [{ role: "user" as const, content: "HISTORY-CANARY-OWN" }, { role: "assistant" as const, content: "OWN-ASSISTANT-HISTORY" }];
    for (const builder of [buildPrompt, buildCompactPrompt]) { const messages = builder({ ...sample, conversationHistory: history }, candidate); assert.deepEqual(messages.slice(-3), [...history, { role: "user", content: sample.userMessage }]); }
  });
  await check("unknown communities, duplicate cases, duplicate packs and undeclared modes refuse preparation", () => {
    for (const changed of [{ ...suite, cases: [suite.cases[0]!, suite.cases[0]!] }, { ...suite, cases: [{ ...suite.cases[0]!, packId: "foreign" }] }, { ...suite, cases: [{ ...suite.cases[0]!, mode: "undeclared" }] }]) assert.throws(() => prepareLanguageIteration(packs, proposal, changed));
    assert.throws(() => prepareLanguageIteration([base, base], proposal, suite));
  });
  await check("all candidate transformations leave base packs and active registry unchanged", () => { assert.equal(hash(packs), before); assert.equal(getRegistry(), registry); assert.deepEqual(builders(base), builders(packs[0]!)); });
  const summary = { trial: trial.id, revision, checks, cases: suite.cases.length, preparedPrompts: prepared.prompts.length, proposalHash: prepared.proposalHash, suiteHash: prepared.suiteHash,
    minimumRemainingEstimate: Math.min(...prepared.prompts.map(p => p.context.remainingEstimate)), modelCalls: 0, networkRequests: 0, paidComputeUsd: 0,
    communityApproved: false, productionActivated: false, heldOutBenchmark: false, humanImprovementMeasured: false };
  save("summary.json", summary); trial.finish("completed", 0, { artifacts: dir, checks: checks.length, cases: 8, preparedPrompts: 15, modelCalls: 0, networkRequests: 0, communityApproved: false });
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  trial.finish("failed", 0, { artifacts: dir, reason: "language-iteration-preflight-failed", checks: checks.length, modelCalls: 0, networkRequests: 0 });
  console.error(error instanceof assert.AssertionError ? error.message.split("\n")[0] : "Inspect retained language-iteration checks"); process.exitCode = 1;
}
