import type { AfribitChatMessage } from "@afribit/shared";
import { findUngrounded } from "./grounding.js";

/** pnpm --filter @afribit/api test:grounding */

let failed = 0;
let passed = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed++;
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name} ${detail}`);
  }
}

const prompt = (cards: string, user: string, extra = ""): AfribitChatMessage[] => [
  { role: "system", content: `You are Afribit AI for Kibera and Nairobi. Knowledge:\n${cards}\n${extra}` },
  { role: "user", content: user },
];

const cards = "A wallet manages the keys that control bitcoin. A seed phrase is 12 or 24 words. Lightning is for small fast payments. M-Pesa is run by Safaricom.";

// the case that motivated this: answered from the model's own memory
{
  const u = findUngrounded("Hilo sio swali kuhusu Bitcoin, lakini ni Argentina iliyoshinda Kombe la Dunia 2022.", prompt(cards, "Nani alishinda Kombe la Dunia 2022?"));
  check("an invented proper noun is flagged (Argentina)", u.includes("Argentina"), JSON.stringify(u));
  check("a figure that is in the user's own question is allowed (2022)", !u.includes("2022"), JSON.stringify(u));
}
check("a grounded answer is clean", findUngrounded("A seed phrase is 12 or 24 words. Keep it safe; Safaricom runs M-Pesa, Bitcoin is different.", prompt(cards, "seed phrase ni nini?")).length === 0);
check("capital letters at the start of sentences are not names", findUngrounded("Hii ni wallet. Wallet inahold keys. Sasa unaelewa?", prompt(cards, "wallet ni nini")).length === 0);
check("capitals after a list marker or newline are not names", findUngrounded("Hatua:\n1. Fungua app\n2. Bonyeza kitufe\n- Weka kiasi", prompt(cards, "nitume vipi")).length === 0);
check("an invented product name mid-sentence is flagged", findUngrounded("Unaweza kutumia Trust Wallet kwa hilo.", prompt(cards, "wallet gani?")).includes("Trust"));
check("an invented figure is flagged", findUngrounded("Fee ni 450 sats kila wakati.", prompt(cards, "fee ni ngapi?")).includes("450"));
check("small numbers (list counts) are ignored", findUngrounded("Kuna njia 3 na hatua 2.", prompt(cards, "njia gani?")).length === 0);
check("a number from the cards is allowed", findUngrounded("Seed phrase ina maneno 24.", prompt(cards, "seed")).length === 0);
check("hyphenated terms made of known parts are allowed", findUngrounded("M-Pesa ina Safaricom nyuma yake.", prompt(cards, "mpesa")).length === 0);
check("words in the conversation history count as given", findUngrounded("Kama ulivyosema, Grace, wallet ni salama.", [...prompt(cards, "wallet"), { role: "user", content: "Naitwa Grace" }]).length === 0);
check("an empty answer is clean", findUngrounded("", prompt(cards, "x")).length === 0);
check("Swahili capitalised mid-sentence terms from the cards are fine", findUngrounded("Tumia Lightning kwa malipo madogo, si on-chain.", prompt(cards, "malipo madogo")).length === 0);

console.log(`\ngrounding: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
