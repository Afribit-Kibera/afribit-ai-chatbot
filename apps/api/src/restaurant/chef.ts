import { randomUUID } from "node:crypto";
import type { RetrievalResult } from "@afribit/shared";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { getPack } from "../pack/active.js";
import type { OrderTicket } from "../waiter/ticket.js";

/**
 * The chef.
 *
 * The restaurant model: the customer talks to a waiter (a small model that speaks the customer's
 * language), the waiter writes a neutral order ticket, the chef (a larger, hosted model) cooks
 * from that ticket and the community's reviewed knowledge cards, and the waiter serves the result
 * back in the customer's own words. The chef never sees the customer's message, name, number or
 * dialect -- only the neutral English question.
 *
 * In testing (docs/evaluation/methodology.md) this passed 14 of 15 on the language rubric and was
 * factually accurate on 13 of 15 with none clearly wrong, using about 1,400 prompt tokens across the
 * three calls. The chef earns its keep on questions the knowledge cards do not fully cover, where a
 * larger model's reasoning matters; on questions the cards answer, the single compact prompt is as
 * good with one call.
 *
 * Limits, stated plainly:
 *  - The scrubber below removes phone numbers, long identifiers (invoices, addresses) and names that
 *    echo the customer's own words. It is a safety net, not a guarantee: in a six-message probe the
 *    waiter alone dropped most personal details but leaked a first name and an invoice.
 *  - The chef sees one question, not the conversation, so follow-ups that depend on earlier turns lose
 *    context.
 */

/** The original Kibera wording; the live prompt is the active pack's prompts/chef.md (see src/pack/packCases.ts). */
export const CHEF_SYSTEM = `You are the chef for Afribit AI, a Bitcoin education service for Kibera and Nairobi. A waiter will turn your fact sheet into the customer's own language, so write plainly in simple English. You do NOT speak to the customer, and you do not know who they are.
Use ONLY the knowledge cards you are given. Never invent facts, prices, fees, laws, wallet steps or office hours. If the cards do not cover the question, set "not_covered": true.
Never ask for or repeat a seed phrase, private key, PIN, password or one-time code. Never promise returns or say Bitcoin is simply "easy, fast and secure".
Get these right even if a card is loosely worded: Bitcoin is not "M-Pesa but online" (no single company approves transactions; many independent nodes check the rules). A wallet does not hold coins; it manages the keys that control them. On-chain speed and fees vary; Lightning is the fast, cheap path for small payments. A confirmed transaction is very hard to reverse and customer care cannot undo it, but do not say "impossible". Custodians and governments can still restrict access in some situations; the network itself has no single administrator.
Return JSON only: {"points": ["2 to 5 short, accurate sentences that answer the question"], "example": "one concrete everyday Kenyan example, or null", "warnings": ["safety notes that apply, or empty"], "not_covered": false, "check_topic": "what one short question could check the customer understood"}`;

/** Words that look like names but are not: product, place and protocol terms the ticket legitimately contains. */
const GENERIC_NOT_NAMES = new Set("telegram whatsapp facebook google android iphone what how why who when where which can could should would is are do does did will if the i a an my it".split(" "));

/** Generic English words plus the active community's product, place and protocol words (pack.json "knownTerms"). */
const NOT_NAMES = {
  has(word: string): boolean {
    return GENERIC_NOT_NAMES.has(word) || getPack().knownTerms.includes(word);
  },
};

export interface ScrubResult {
  text: string;
  /** What was removed, for logging counts only (never the values). */
  removed: { phones: number; identifiers: number; emails: number; names: number };
}

/**
 * Deterministic backstop for the waiter's own attempt to drop personal details. `original` is the
 * customer's message: any capitalised word in the ticket that also appears capitalised, mid-sentence,
 * in the original and is not a known product/place term is treated as a possible name and removed.
 */
export function scrubTicketText(text: string, original: string): ScrubResult {
  const removed = { phones: 0, identifiers: 0, emails: 0, names: 0 };
  let out = text;

  out = out.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, () => (removed.emails++, "[removed]"));
  // Long opaque tokens: Lightning invoices, addresses, keys, transaction ids, API keys.
  out = out.replace(/\b[A-Za-z0-9]{24,}\b/g, () => (removed.identifiers++, "[removed]"));
  // Phone-like or ID-like digit runs (7+ digits, allowing spaces, dashes, dots, a leading +).
  out = out.replace(/\+?\d[\d\s().-]{5,}\d/g, (m) => (m.replace(/\D/g, "").length >= 7 ? (removed.phones++, "[removed]") : m));

  // Names: capitalised words the customer typed, which are not known terms.
  //  - Mid-sentence in the original: removed wherever they appear in the ticket.
  //  - As the very first word of the original (a name can open a message): removed only where they appear
  //    mid-sentence in the ticket, so ordinary question openers ("Does", "Can") are never mangled.
  const anywhere = new Set<string>();
  for (const m of original.matchAll(/(?<![.!?]\s)(?<!^)(?<!-)\b([A-Z][a-z]{2,})\b/g)) {
    const w = m[1]!;
    if (!NOT_NAMES.has(w.toLowerCase())) anywhere.add(w);
  }
  const first = original.match(/^\s*([A-Z][a-z]{2,})\b/)?.[1];
  const midOnly = first && !NOT_NAMES.has(first.toLowerCase()) && !anywhere.has(first) ? first : undefined;

  for (const name of anywhere) {
    out = out.replace(new RegExp(`(?<!-)\\b${name}\\b`, "g"), () => (removed.names++, "someone"));
  }
  if (midOnly) {
    out = out.replace(new RegExp(`(?<=[^.!?\\s]\\s+)(?<!-)\\b${midOnly}\\b`, "g"), () => (removed.names++, "someone"));
  }
  return { text: out.replace(/\s{2,}/g, " ").trim(), removed };
}

export interface ChefFacts {
  points: string[];
  example: string | null;
  warnings: string[];
  not_covered: boolean;
  check_topic: string | null;
}

/** Pull a usable fact sheet out of the chef's reply, or null. */
export function parseChefFacts(text: string): ChefFacts | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(m[0]);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const points = Array.isArray(r.points) ? r.points.filter((p): p is string => typeof p === "string" && p.trim().length > 0).slice(0, 8) : [];
  const notCovered = r.not_covered === true;
  if (points.length === 0 && !notCovered) return null;
  return {
    points,
    example: typeof r.example === "string" && r.example.trim() ? r.example.trim() : null,
    warnings: Array.isArray(r.warnings) ? r.warnings.filter((w): w is string => typeof w === "string").slice(0, 5) : [],
    not_covered: notCovered,
    check_topic: typeof r.check_topic === "string" && r.check_topic.trim() ? r.check_topic.trim() : null,
  };
}

export const CHEF_PROFILE = "chef_cloud";

/**
 * Ask the chef. The chef receives ONLY the scrubbed English question and the public knowledge cards.
 * Returns null on any failure so the caller can fall back to answering directly from the cards.
 */
export async function runChef(gateway: AfribitAIGateway, ticket: OrderTicket, original: string, retrieval: RetrievalResult[]): Promise<ChefFacts | null> {
  const question = scrubTicketText(ticket.question_en, original).text;
  const cards =
    retrieval.length > 0
      ? retrieval
          .map((r, i) => `[Card ${i + 1}] ${r.authoritativeContent}${r.safetyWarnings.length ? `\nSafety notes: ${r.safetyWarnings.join("; ")}` : ""}`)
          .join("\n\n")
      : "(no cards matched)";
  try {
    const response = await gateway.chat({
      requestId: randomUUID(),
      messages: [
        { role: "system", content: getPack().prompts.chef },
        { role: "user", content: `Question: ${question}\n\nKnowledge cards:\n${cards}` },
      ],
      languageMode: getPack().defaultMode,
      explanationLevel: "normal",
      modelProfile: CHEF_PROFILE,
      maxOutputTokens: 700,
      temperature: 0.2,
      privacyProfile: "strict",
    });
    return parseChefFacts(response.content);
  } catch (err) {
    console.warn(`[chef] failed, answering directly from the cards: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
