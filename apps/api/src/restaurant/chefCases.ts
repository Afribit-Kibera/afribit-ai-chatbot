import type { RetrievalResult } from "@afribit/shared";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { buildServePrompt } from "../prompt/compactPrompt.js";
import type { OrderTicket } from "../waiter/ticket.js";
import { CHEF_PROFILE, parseChefFacts, runChef, scrubTicketText } from "./chef.js";

/**
 * Checks for the chef side of the restaurant pipeline. No model or network.
 * The privacy probe that motivated the scrubber: a six-message test found the waiter alone dropped most
 * personal details but leaked a first name and a full Lightning invoice. These cases pin the backstop.
 *
 * Run with: pnpm --filter @afribit/api test:chef
 */

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name} ${detail}`);
  }
};

console.log("scrubTicketText (privacy backstop):");
{
  const inv = "lnbc1500n1pj9x7hmpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsd9hhgetpd3skuefqwdshgdpjxgmnzd3j";
  const a = scrubTicketText(`Can a Lightning invoice (${inv}) be paid via M-Pesa?`, `Msee ananiuliza nimtumie ${inv} kwa M-Pesa`);
  check("a pasted Lightning invoice is removed", !a.text.includes("lnbc1500n1") && a.removed.identifiers === 1, a.text);
  check("the rest of the question survives", a.text.includes("Lightning invoice") && a.text.includes("M-Pesa"));

  const b = scrubTicketText("Is it safe to buy all my Bitcoin as suggested by someone named Grace?", "Nina KES 80,000 nataka kununua Bitcoin yote leo, Grace anasema ni sawa. Ni salama?");
  check("a first name that echoes the customer's message is removed", !b.text.includes("Grace") && b.removed.names === 1, b.text);

  const c = scrubTicketText("Call me on 0712 345 678 about my wallet", "namba yangu 0712 345 678");
  check("a phone number is removed", !c.text.includes("0712") && c.removed.phones === 1, c.text);
  const c2 = scrubTicketText("Reach me at +254 722-111-222", "x");
  check("an international number is removed", !c2.text.includes("722") && c2.removed.phones === 1, c2.text);

  const d = scrubTicketText("Email amina@example.org if the transaction fails", "x");
  check("an email address is removed", !d.text.includes("amina@") && d.removed.emails === 1);

  const e = scrubTicketText("Is a 12 word seed phrase needed after 3 confirmations in Nairobi?", "Niaje, je seed phrase ya words 12 inahitajika baada ya confirmations 3 Nairobi?");
  check("short numbers and place names are left alone", e.text.includes("12 word") && e.text.includes("3 confirmations") && e.text.includes("Nairobi") && e.removed.phones === 0, e.text);

  const f = scrubTicketText("Does Bitcoin work with M-Pesa and Lightning in Kibera?", "Bitcoin inawork na M-Pesa na Lightning Kibera?");
  check("Bitcoin, Lightning, M-Pesa, Kibera are never mistaken for names", f.removed.names === 0 && f.text.includes("Kibera") && f.text.includes("Lightning"), f.text);

  const g = scrubTicketText("What is a wallet?", "What is a wallet?");
  check("a clean ticket passes through unchanged", g.text === "What is a wallet?");
}

console.log("\nparseChefFacts:");
{
  const facts = { points: ["Fees are paid by the sender.", "Miners receive them."], example: "Like paying a matatu fare.", warnings: [], not_covered: false, check_topic: "who pays" };
  check("plain JSON", parseChefFacts(JSON.stringify(facts))?.points.length === 2);
  check("JSON wrapped in prose and a code fence", parseChefFacts("Here you go:\n```json\n" + JSON.stringify(facts) + "\n```")?.example === "Like paying a matatu fare.");
  check("not_covered with no points is valid (the waiter says it is not sure)", parseChefFacts(JSON.stringify({ points: [], not_covered: true }))?.not_covered === true);
  check("no points and covered -> null", parseChefFacts(JSON.stringify({ points: [], not_covered: false })) === null);
  check("not JSON -> null", parseChefFacts("sorry I cannot") === null);
  check("non-string points are dropped", parseChefFacts(JSON.stringify({ points: ["ok", 5, null, ""], not_covered: false }))?.points.join() === "ok");
}

console.log("\nrunChef against a fake gateway:");
{
  const card: RetrievalResult = { conceptId: "c1", authoritativeContent: "Fees are paid by the sender.", approvedExamples: [], languageGuidance: null, safetyWarnings: ["Never share a seed phrase."], sourceVersion: 1, freshnessDate: "2026-09-24", relatedConcepts: [], confidence: 1 };
  const ticket: OrderTicket = { question_en: "Who pays the on-chain fee, Grace asks?", keywords_en: [], intent: "explain", register: "sheng", contains_secret: false };
  let sent: { modelProfile?: string; messages?: { role: string; content: string }[] } = {};
  const gw = { chat: async (req: typeof sent) => ((sent = req), { content: JSON.stringify({ points: ["The sender pays."], not_covered: false }) }) } as unknown as AfribitAIGateway;
  const facts = await runChef(gw, ticket, "Grace anauliza nani analipa fee?", [card]);
  check("returns the chef's fact sheet", facts?.points[0] === "The sender pays.");
  check("uses the hosted chef profile", sent.modelProfile === CHEF_PROFILE);
  const all = (sent.messages ?? []).map((m) => m.content).join("\n");
  check("the chef sees the scrubbed question and the cards", all.includes("Who pays the on-chain fee") && all.includes("Fees are paid by the sender.") && all.includes("Never share a seed phrase."));
  check("the chef NEVER sees the customer's own words or the name", !all.includes("Grace") && !all.includes("anauliza"));

  const down = { chat: async () => { throw new Error("chef offline"); } } as unknown as AfribitAIGateway;
  const silent = console.warn;
  console.warn = () => {};
  check("a failing chef returns null so the caller answers from the cards", (await runChef(down, ticket, "x", [card])) === null);
  console.warn = silent;
}

console.log("\nbuildServePrompt:");
{
  const msgs = buildServePrompt({ languageMode: "sheng", explanationLevel: "normal", facts: '{"points":["The sender pays."]}', conversationHistory: [{ role: "user", content: "hi" }], userMessage: "kwani fee ni nani analipa?" });
  const sys = msgs[0]?.content ?? "";
  check("fact sheet is the only source of facts", sys.includes("your only source of facts") && sys.includes("The sender pays."));
  check("safety floor kept", /Never ask for or repeat a seed phrase/.test(sys));
  check("Sheng rules present for Sheng", sys.includes("COMMUNITY TEACHING SHENG"));
  check("customer's own message last, history kept", msgs.at(-1)?.content === "kwani fee ni nani analipa?" && msgs[1]?.content === "hi");
  check("no Sheng rules for English", !(buildServePrompt({ languageMode: "simple_en", explanationLevel: "normal", facts: "{}", conversationHistory: [], userMessage: "x" })[0]?.content ?? "").includes("COMMUNITY TEACHING SHENG"));
}

console.log(`\n${failures === 0 ? "All chef checks pass." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
