import type { LanguageMode, RetrievalResult } from "@afribit/shared";
import { buildCompactPrompt } from "./compactPrompt.js";
import { buildPrompt } from "./promptBuilder.js";

/**
 * Structural checks for the compact ("waiter") prompt. No model, database or network.
 * What they protect: the rules the evaluation showed matter -- the safety floor, the
 * known misconceptions, the Sheng composition rules only for Sheng, the cards as the
 * only source of facts -- survive condensing, and the prompt stays far smaller than
 * the full one (that size is the point: speed on modest hardware).
 *
 * Run with: pnpm --filter @afribit/api test:compact-prompt
 */

const card = (id: string, text: string, warnings: string[] = []): RetrievalResult => ({
  conceptId: id,
  authoritativeContent: text,
  approvedExamples: [],
  languageGuidance: null,
  safetyWarnings: warnings,
  sourceVersion: 1,
  freshnessDate: "2026-09-24",
  relatedConcepts: [],
  confidence: 0.8,
});

const retrieval = [
  card("btc.fees", "On-chain fees are paid by the sender to the miner who includes the transaction in a block. Fees depend on transaction size and how busy the network is. ".repeat(4)),
  card("btc.scams", "No legitimate Afribit support agent will ever ask for a seed phrase, private key, PIN or password. ".repeat(4), ["Never share a seed phrase."]),
  card("btc.wallet", "A wallet manages the keys that control bitcoin; it does not hold coins like a physical wallet. ".repeat(4)),
];

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name} ${detail}`);
  }
};

const modes: LanguageMode[] = ["simple_en", "swahili", "sheng", "mixed_ke"];
for (const mode of modes) {
  console.log(`\nmode = ${mode}`);
  const input = {
    languageMode: mode,
    explanationLevel: "normal" as const,
    retrieval,
    languageExamples: [{ utterance: "ina-run", meaning: "is running", intent: null, style: "sheng" } as never],
    conversationHistory: [
      { role: "user" as const, content: "earlier question" },
      { role: "assistant" as const, content: "earlier answer" },
    ],
    userMessage: "Niaje, kwani fee inatoka wapi?",
  };
  const msgs = buildCompactPrompt(input);
  const system = msgs[0]?.content ?? "";
  const full = (buildPrompt(input)[0]?.content ?? "") + buildPrompt(input).slice(1).map((m) => m.content).join("");
  const isSheng = mode === "sheng" || mode === "mixed_ke";

  check("system message first, customer message last", msgs[0]?.role === "system" && msgs.at(-1)?.content === input.userMessage);
  check("conversation history kept, in order", msgs[1]?.content === "earlier question" && msgs[2]?.content === "earlier answer");
  check("all three cards present as the only source of facts", system.includes("[Card 1]") && system.includes("[Card 3]") && system.includes("only source of facts"));
  check("card safety notes carried through", system.includes("Never share a seed phrase."));
  check("safety floor: never ask for a seed phrase, key, PIN, password or code", /Never ask for or repeat a seed phrase, private key, wallet password, PIN or one-time code/.test(system));
  check("no guaranteed returns", /Never promise returns/.test(system));
  check("known misconceptions kept (M-Pesa, wallet, fast/cheap, irreversibility)", ["not \"M-Pesa but online\"", "does not hold coins", "not always fast or cheap", "do not say \"impossible\""].every((t) => system.includes(t)));
  check("Sheng composition rules only for sheng/mixed_ke", system.includes("COMMUNITY TEACHING SHENG") === isSheng);
  check("the 'never open the question with Je' rule present for Sheng", !isSheng || system.includes('Never start the closing question with "Je"'));
  check("reviewed vocabulary shown only for sheng/mixed_ke", system.includes('"ina-run"') === isSheng);
  check("far smaller than the full prompt (at least 2x)", full.length > system.length * 2, `compact=${system.length} full=${full.length}`);
  check("small in absolute terms (about 900 tokens of rules + cards)", system.length < 9500, `chars=${system.length}`);
}

console.log("\nEdge cases:");
{
  const none = buildCompactPrompt({ languageMode: "sheng", explanationLevel: "simple", retrieval: [], conversationHistory: [], userMessage: "x" });
  check("no cards: tells the model nothing matched", (none[0]?.content ?? "").includes("no approved knowledge matched"));
  check("explanation level changes the instruction", (buildCompactPrompt({ languageMode: "simple_en", explanationLevel: "deep", retrieval: [], conversationHistory: [], userMessage: "x" })[0]?.content ?? "").includes("Deep dive"));
}

console.log(`\n${failures === 0 ? "All compact-prompt checks pass." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
