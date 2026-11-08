import assert from "node:assert/strict";
import type { RetrievalResult } from "@afribit/shared";
import type { CommunityPack } from "../pack/types.js";
import { buildCompactPrompt } from "../prompt/compactPrompt.js";
import { contextHeadroom } from "../prompt/contextBudget.js";
import { hash } from "./protocol.js";

/** Operator-only preview. This module has no provider, install, registry mutation or activation path. */
export interface LanguageProposal {
  schema: "afribit-language-preview/1";
  id: string;
  status: "draft";
  scope: "operator-synthetic-preview-only";
  targetPackId: string;
  modeIds: string[];
  communityApprovals: never[];
  feedbackReport: string;
  languageGuidance: string;
  taskGuidance: string;
  activation: string;
}
export interface LanguageFixture {
  id: string;
  packId: string;
  mode: string;
  question: string;
  passage: { id: string; text: string };
  assess: { requiredFacts: string[]; mustAcknowledgeUnknown: string[]; reject: string[] };
}
export interface LanguageSuite {
  schema: "afribit-language-fixtures/1";
  id: string;
  provenance: string;
  modelExposure: string;
  assessorOnlyCanary: string;
  cases: LanguageFixture[];
}

export function previewLanguagePack(base: CommunityPack, proposal: LanguageProposal): CommunityPack {
  assert.equal(proposal.schema, "afribit-language-preview/1");
  assert.equal(proposal.status, "draft");
  assert.equal(proposal.scope, "operator-synthetic-preview-only");
  assert.ok(Array.isArray(proposal.communityApprovals) && proposal.communityApprovals.length === 0);
  assert.equal(base.id, proposal.targetPackId, "Language proposal belongs to a different community");
  assert.ok(Array.isArray(proposal.modeIds) && proposal.modeIds.length > 0 && new Set(proposal.modeIds).size === proposal.modeIds.length);
  for (const mode of proposal.modeIds) assert.ok(base.modes.some(m => m.id === mode && m.codeSwitched), "Only declared code-switched modes may receive this proposal");
  for (const text of [proposal.id, proposal.feedbackReport, proposal.languageGuidance, proposal.taskGuidance, proposal.activation])
    assert.ok(typeof text === "string" && text.length > 0 && Buffer.byteLength(text) <= 4096);
  return {
    ...base,
    modes: base.modes.map(m => proposal.modeIds.includes(m.id)
      ? { ...m, policyFull: `${m.policyFull}\n\n${proposal.languageGuidance}`, rulesCompact: `${m.rulesCompact}\n\n${proposal.languageGuidance}` }
      : { ...m }),
    prompts: { ...base.prompts, communicationGuide: `${base.prompts.communicationGuide}\n\n${proposal.taskGuidance}`,
      shapeCompact: `${base.prompts.shapeCompact}\n\n${proposal.taskGuidance}` },
  };
}

export function languageFixtureInput(c: LanguageFixture) {
  // Whitelist factual passage/question only. Neither assessor metadata nor reviewer notes enter here.
  const retrieval: RetrievalResult[] = [{ conceptId: c.passage.id, authoritativeContent: c.passage.text,
    approvedExamples: [], languageGuidance: null, safetyWarnings: [], sourceVersion: 1,
    freshnessDate: "synthetic-development-v1", relatedConcepts: [], confidence: 1 }];
  return { languageMode: c.mode, explanationLevel: "simple" as const, conversationHistory: [], userMessage: c.question, retrieval };
}

export function prepareLanguageIteration(packs: CommunityPack[], proposal: LanguageProposal, suite: LanguageSuite,
  windowTokens = 8192, maxOutputTokens = 300) {
  assert.equal(suite.schema, "afribit-language-fixtures/1");
  assert.ok(Array.isArray(suite.cases) && suite.cases.length > 0 && suite.cases.length <= 32);
  assert.equal(new Set(suite.cases.map(c => c.id)).size, suite.cases.length, "Duplicate evaluation case");
  assert.equal(new Set(packs.map(p => p.id)).size, packs.length, "Duplicate community pack");
  assert.ok(Number.isSafeInteger(windowTokens) && windowTokens > 0 && Number.isSafeInteger(maxOutputTokens) && maxOutputTokens > 0);
  const target = packs.find(p => p.id === proposal.targetPackId); assert.ok(target);
  const candidate = previewLanguagePack(target, proposal);
  const prompts = suite.cases.flatMap(c => {
    const base = packs.find(p => p.id === c.packId); assert.ok(base, "Case community is missing");
    assert.ok(/^[a-zA-Z0-9_-]{1,64}$/.test(c.id) && typeof c.question === "string" && c.question.length > 0);
    assert.ok(base.modes.some(m => m.id === c.mode), "Undeclared language mode");
    assert.ok(typeof c.passage?.id === "string" && typeof c.passage.text === "string" && c.passage.text.length > 0);
    const variants = base.id === target.id ? [{ variant: "baseline", pack: base }, { variant: "candidate", pack: candidate }]
      : [{ variant: "other-community-control", pack: base }];
    return variants.map(({ variant, pack }) => {
      const messages = buildCompactPrompt(languageFixtureInput(c), pack), context = contextHeadroom(messages, maxOutputTokens, windowTokens);
      assert.ok(context.remainingEstimate >= 0, "Candidate exceeds reserved-output context headroom");
      assert.ok(!JSON.stringify(messages).includes(suite.assessorOnlyCanary), "Assessor metadata entered a prompt");
      return { caseId: c.id, packId: c.packId, languageMode: c.mode, variant, messages, context,
        promptHash: hash(messages), passageHash: hash(c.passage), proposalHash: variant === "candidate" ? hash(proposal) : null };
    });
  });
  return { schema: 1, previewOnly: true, communityApproved: false, modelCalls: 0, syntheticDevelopmentFixtures: true,
    heldOutBenchmark: false, suiteHash: hash(suite), proposalHash: hash(proposal), windowTokens, maxOutputTokens, prompts };
}
