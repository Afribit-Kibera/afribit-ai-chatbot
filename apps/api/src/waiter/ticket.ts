import { randomUUID } from "node:crypto";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { env } from "../config/env.js";
import { getPack } from "../pack/active.js";
import { localOnlyProcessing } from "../privacy/contextPolicy.js";

/**
 * The waiter's order ticket.
 *
 * A customer writes in Sheng, Kiswahili, English or a mix. Before the kitchen
 * (retrieval, the answering model) sees it, a small model writes a clean English
 * ticket: the question, search keywords, intent, register. In testing, searching
 * by the ticket's question instead of the raw message put the right knowledge
 * card in the top 3 for 40 of 40 benchmark questions, against 33 of 40 for the
 * raw words (docs/evaluation/methodology.md).
 *
 * The ticket is used for SEARCH only. The answer is still written for the
 * customer's own message and register. If the waiter fails or returns something
 * unusable, retrieval falls back to the customer's own words, so a waiter outage
 * never takes chat down.
 */

export interface OrderTicket {
  question_en: string;
  keywords_en: string[];
  intent: "explain" | "how_to" | "safety_check" | "compare" | "troubleshoot" | "other";
  register: "sheng" | "swahili" | "english" | "mixed";
  contains_secret: boolean;
}

const INTENTS = ["explain", "how_to", "safety_check", "compare", "troubleshoot", "other"] as const;
const REGISTERS = ["sheng", "swahili", "english", "mixed"] as const;

/** The original Kibera wording; the live prompt is the active pack's prompts/ticket.md (see src/pack/packCases.ts). */
export const WAITER_TICKET_PROMPT = `You are the waiter for Afribit AI, a Bitcoin education service in Nairobi, Kenya. Customers write in Sheng, Kiswahili, English, or a mix. Your job is to write the order ticket for the kitchen (the main AI). You do NOT answer the question.

Return JSON only, no other text:
{
  "question_en": "one clear English question that keeps the customer's exact meaning and any specific terms (Bitcoin, Lightning, wallet, seed phrase, fee, M-Pesa, ...)",
  "keywords_en": ["3 to 6 English keywords or short phrases a Bitcoin textbook index would use for this question"],
  "intent": "explain | how_to | safety_check | compare | troubleshoot | other",
  "register": "sheng | swahili | english | mixed",
  "contains_secret": true or false  (true only if the message actually contains a seed phrase, private key, PIN or password)
}
Remove every personal detail from question_en and keywords_en: names, phone numbers, account or wallet or transaction identifiers, addresses, and exact amounts of the customer's own money (say "an amount" instead). The kitchen must not learn who is asking.
Never invent facts. If the customer asks whether something is safe, true or a scam, keep that framing in question_en.`;

/** Pull a valid ticket out of a model's reply, or return null. Tolerates prose and code fences around the JSON. */
export function parseTicket(text: string): OrderTicket | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const question = typeof r.question_en === "string" ? r.question_en.trim() : "";
  if (question.length < 3 || question.length > 400) return null;

  const keywords = Array.isArray(r.keywords_en)
    ? r.keywords_en.filter((k): k is string => typeof k === "string").map((k) => k.trim()).filter((k) => k.length > 0 && k.length <= 60).slice(0, 8)
    : [];
  const intent = (INTENTS as readonly string[]).includes(r.intent as string) ? (r.intent as OrderTicket["intent"]) : "other";
  const register = (REGISTERS as readonly string[]).includes(r.register as string) ? (r.register as OrderTicket["register"]) : "mixed";
  return { question_en: question, keywords_en: keywords, intent, register, contains_secret: r.contains_secret === true };
}

/** Which waiter model to use: the node's own in node/hybrid mode, the hosted one in cloud mode. */
export function waiterProfile(): string {
  if (localOnlyProcessing()) return "waiter_local";
  return env.inferenceMode === "cloud" ? "waiter_cloud" : "waiter_local";
}

/**
 * Ask the waiter for a ticket. Returns null on any failure (timeout, bad output); callers must fall
 * back to the customer's own words.
 */
export async function makeTicket(gateway: AfribitAIGateway, message: string, languageMode: string): Promise<OrderTicket | null> {
  try {
    const response = await gateway.chat({
      requestId: randomUUID(),
      messages: [
        { role: "system", content: getPack().prompts.ticket },
        { role: "user", content: message.slice(0, 1200) },
      ],
      languageMode,
      explanationLevel: "simple",
      modelProfile: waiterProfile(),
      maxOutputTokens: 250,
      temperature: 0.1,
      privacyProfile: "strict",
    });
    return parseTicket(response.content);
  } catch (err) {
    console.warn(`[waiter] ticket failed, searching with the customer's own words: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
