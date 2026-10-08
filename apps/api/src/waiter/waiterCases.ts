import type { AfribitAIGateway } from "../gateway/gateway.js";
import { env } from "../config/env.js";
import { makeTicket, parseTicket, waiterProfile } from "./ticket.js";

/**
 * Checks for the waiter's ticket. No model or network: parsing is tested on the messy
 * output real models produce, and makeTicket against a fake gateway.
 *
 * Run with: pnpm --filter @afribit/api test:waiter
 */

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name} ${detail}`);
  }
};

const good = { question_en: "Is it safe to give my seed phrase to someone claiming to be support?", keywords_en: ["seed phrase", "scam"], intent: "safety_check", register: "sheng", contains_secret: false };

console.log("parseTicket:");
check("plain JSON", parseTicket(JSON.stringify(good))?.question_en === good.question_en);
check("JSON inside a code fence with chatter around it", parseTicket("Sure!\n```json\n" + JSON.stringify(good) + "\n```\nHope that helps")?.intent === "safety_check");
check("keeps keywords", parseTicket(JSON.stringify(good))?.keywords_en.join() === "seed phrase,scam");
check("unknown intent becomes 'other'", parseTicket(JSON.stringify({ ...good, intent: "banana" }))?.intent === "other");
check("unknown register becomes 'mixed'", parseTicket(JSON.stringify({ ...good, register: "klingon" }))?.register === "mixed");
check("contains_secret only true when exactly true", parseTicket(JSON.stringify({ ...good, contains_secret: "yes" }))?.contains_secret === false && parseTicket(JSON.stringify({ ...good, contains_secret: true }))?.contains_secret === true);
check("missing keywords is fine", parseTicket(JSON.stringify({ question_en: "What is a wallet?" }))?.keywords_en.length === 0);
check("keywords are cleaned and capped", (parseTicket(JSON.stringify({ ...good, keywords_en: ["a", "", 5, "b", "c", "d", "e", "f", "g", "h", "i", "j"] }))?.keywords_en.length ?? 0) <= 8);
check("not JSON -> null", parseTicket("I cannot help with that") === null);
check("broken JSON -> null", parseTicket('{"question_en": "oops"') === null);
check("empty question -> null", parseTicket(JSON.stringify({ ...good, question_en: "  " })) === null);
check("absurdly long question -> null", parseTicket(JSON.stringify({ ...good, question_en: "x".repeat(500) })) === null);
check("array instead of object -> null", parseTicket("[1,2,3]") === null);

console.log("\nwaiterProfile (follows the inference mode):");
const mutable = env as unknown as Record<string, unknown>;
mutable.inferenceMode = "cloud";
check("cloud mode uses the hosted waiter", waiterProfile() === "waiter_cloud");
mutable.inferenceMode = "node";
check("node mode uses the local waiter (nothing leaves the network)", waiterProfile() === "waiter_local");
mutable.inferenceMode = "hybrid";
check("hybrid mode tries the local waiter", waiterProfile() === "waiter_local");

console.log("\nmakeTicket against a fake gateway:");
{
  let seen: { modelProfile?: string; messages?: { role: string; content: string }[] } = {};
  const ok = { chat: async (req: typeof seen) => ((seen = req), { content: JSON.stringify(good) }) } as unknown as AfribitAIGateway;
  const t = await makeTicket(ok, "msee ananiuliza seed phrase yangu", "sheng");
  check("returns the parsed ticket", t?.intent === "safety_check");
  check("sends the customer's words to the waiter model", seen.messages?.[1]?.content === "msee ananiuliza seed phrase yangu" && seen.modelProfile === waiterProfile());
  const long = await makeTicket(ok, "y".repeat(5000), "sheng");
  check("very long messages are truncated before being sent", (seen.messages?.[1]?.content.length ?? 0) <= 1200 && long !== null);

  const throwing = { chat: async () => { throw new Error("upstream down"); } } as unknown as AfribitAIGateway;
  const silent = console.warn;
  console.warn = () => {};
  const failed = await makeTicket(throwing, "x", "sheng");
  console.warn = silent;
  check("a failing waiter returns null instead of breaking chat", failed === null);

  const garbage = { chat: async () => ({ content: "no json here" }) } as unknown as AfribitAIGateway;
  check("unusable output returns null (callers fall back to the customer's words)", (await makeTicket(garbage, "x", "sheng")) === null);
}

console.log(`\n${failures === 0 ? "All waiter checks pass." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
