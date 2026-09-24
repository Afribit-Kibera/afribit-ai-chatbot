import { buildPrompt } from "../prompt/promptBuilder.js";
import { COMMUNICATION_EVAL_CASES, type CommunicationEvalCase } from "./communicationEvalCases.js";

/**
 * Static prompt-construction regression check -- no DB or OPENROUTER_API_KEY
 * required, so it can run in any environment. Calls the REAL buildPrompt()
 * against the shared test cases in communicationEvalCases.ts, so what it
 * prints is exactly the system prompt production chat would send for that
 * (languageMode, retrieval) pair.
 *
 * What this does NOT test: actual model output. It only proves the prompt
 * *construction* code does what's intended -- e.g. that
 * COMMUNICATION_STYLE_GUIDE and the shengStyleGuide.ts "Je" fix both
 * actually appear in the rendered prompt for the relevant cases. For a
 * live model + rubric-judged run against the same cases, see
 * runCommunicationEval.ts (needs Docker Postgres + OPENROUTER_API_KEY).
 * See docs/COMMUNICATION_STYLE_EVAL.md for the manual critique this
 * fixture was built to reproduce/prevent regressing.
 *
 * Run with: pnpm --filter @afribit/api test:prompt-golden
 */

/**
 * Regression checks found by the 2026-09-23 manual critique
 * (docs/COMMUNICATION_STYLE_EVAL.md) -- each check names the finding it
 * guards against, so a future failure points straight at the relevant
 * writeup instead of just failing silently.
 */
function checkCase(tc: CommunicationEvalCase, systemPrompt: string): string[] {
  const failures: string[] = [];

  if (!systemPrompt.includes("RESPONSE SHAPE AND REGISTER")) {
    failures.push("COMMUNICATION_STYLE_GUIDE missing from system prompt (expected in every language mode)");
  }

  const isShengLike = tc.languageMode === "sheng" || tc.languageMode === "mixed_ke";
  if (isShengLike && !systemPrompt.includes('never "Je, ...?"')) {
    failures.push('Finding 1 regression: the "Je" check-question ban is missing from SHENG_STYLE_GUIDE for a sheng/mixed_ke case');
  }
  if (!isShengLike && systemPrompt.includes("SHENG STYLE")) {
    failures.push(`SHENG_STYLE_GUIDE leaked into a non-Sheng language mode (${tc.languageMode})`);
  }

  if (tc.languageMode === "swahili" && !systemPrompt.includes("genuinely formal register")) {
    failures.push("Finding 2 regression: the swahili-mode formal-register mirroring carve-out is missing");
  }

  return failures;
}

let totalFailures = 0;
for (const tc of COMMUNICATION_EVAL_CASES) {
  const messages = buildPrompt({
    languageMode: tc.languageMode,
    explanationLevel: "normal",
    retrieval: tc.retrieval,
    conversationHistory: [],
    userMessage: tc.userMessage,
  });
  const systemPrompt = messages[0]?.content ?? "";
  console.log(`\n${"=".repeat(80)}\nCASE ${tc.id} (mode=${tc.languageMode})\n${"=".repeat(80)}`);
  console.log(`USER MESSAGE: ${tc.userMessage}\n`);
  console.log(`--- SYSTEM PROMPT ---\n${systemPrompt}\n`);

  const failures = checkCase(tc, systemPrompt);
  if (failures.length === 0) {
    console.log(`  PASS`);
  } else {
    totalFailures += failures.length;
    for (const f of failures) console.log(`  FAIL: ${f}`);
  }
}

console.log(`\n${"=".repeat(80)}\n${totalFailures === 0 ? `All ${COMMUNICATION_EVAL_CASES.length} golden cases pass.` : `${totalFailures} check(s) FAILED across ${COMMUNICATION_EVAL_CASES.length} cases.`}\n${"=".repeat(80)}`);
if (totalFailures > 0) process.exit(1);
