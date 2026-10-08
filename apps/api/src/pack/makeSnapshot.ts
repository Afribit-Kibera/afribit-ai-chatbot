import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCompactPrompt, buildServePrompt } from "../prompt/compactPrompt.js";
import { buildPrompt } from "../prompt/promptBuilder.js";
import { getPack } from "./active.js";
import { FIXTURE_CARDS, FIXTURE_EXAMPLES, FIXTURE_FACTS, FIXTURE_HISTORY, FIXTURE_LEVELS, FIXTURE_MODES, FIXTURE_USER_MESSAGE } from "./promptFixtures.js";

/**
 * Writes kibera-prompts.snapshot.json: every prompt the system produces for the bundled Kibera pack, for every
 * language mode and explanation level. Run it ONLY to deliberately accept an intended prompt change:
 *   pnpm --filter @afribit/api exec tsx src/pack/makeSnapshot.ts
 * The snapshot test (test:pack) fails if the output ever differs from this file.
 */
export function buildAllPrompts(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const mode of FIXTURE_MODES) {
    for (const level of FIXTURE_LEVELS) {
      const input = { languageMode: mode, explanationLevel: level, retrieval: FIXTURE_CARDS, languageExamples: FIXTURE_EXAMPLES, conversationHistory: FIXTURE_HISTORY, userMessage: FIXTURE_USER_MESSAGE };
      out[`full/${mode}/${level}`] = buildPrompt(input);
      out[`compact/${mode}/${level}`] = buildCompactPrompt(input);
      out[`serve/${mode}/${level}`] = buildServePrompt({ languageMode: mode, explanationLevel: level, facts: FIXTURE_FACTS, languageExamples: FIXTURE_EXAMPLES, conversationHistory: FIXTURE_HISTORY, userMessage: FIXTURE_USER_MESSAGE });
    }
  }
  const noCards = { languageMode: "sheng" as const, explanationLevel: "normal" as const, retrieval: [], conversationHistory: [], userMessage: "x" };
  out["full/no-cards"] = buildPrompt(noCards);
  out["compact/no-cards"] = buildCompactPrompt(noCards);
  out["ticket"] = getPack().prompts.ticket;
  out["chef"] = getPack().prompts.chef;
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "kibera-prompts.snapshot.json");
  fs.writeFileSync(file, JSON.stringify(buildAllPrompts(), null, 2) + "\n");
  console.log(`wrote ${file}`);
}
