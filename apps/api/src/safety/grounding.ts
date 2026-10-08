import type { AfribitChatMessage } from "@afribit/shared";

/**
 * Did the answer bring in specifics that appear nowhere in what the model was given?
 *
 * The assistant must answer only from the knowledge cards. The prompt says so, and the model mostly
 * complies, but not always: asked who won the 2022 World Cup it answered from its own memory
 * (docs/evaluation/methodology.md, "Off-topic questions"). A retrieval-confidence cut-off cannot catch
 * this (an off-topic question scored 1.00 on a shared word), so we check the answer itself.
 *
 * The check is deliberately simple and language-neutral, so it works for any community's pack:
 * a name-like word (capitalised, not at the start of a sentence) or a figure of two or more digits is
 * "ungrounded" if it appears nowhere in the whole prompt (instructions, knowledge cards, vocabulary,
 * conversation, and the user's own message). Everything the model was legitimately handed is allowed
 * to be repeated; anything new and specific is flagged.
 *
 * What it cannot do: judge reasoning, translations, or a wrong claim made with ordinary words, and it
 * cannot see an invented name that opens a sentence. It is a net for invented names and numbers, not
 * a fact-checker. It can also flag a legitimate answer (for
 * example a sum the model computed), which is why a pack starts in "log" mode and only "enforce"s once
 * its false-positive rate on real questions has been looked at.
 */

const TOKEN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const SENTENCE_START = /(^|[.!?:\n])[\s*_#>"“”'()[\]•\-–—\d.]*$/u;

function parts(token: string): string[] {
  return token.toLowerCase().split(/['’-]/).filter(Boolean);
}

function allowedSet(messages: AfribitChatMessage[]): Set<string> {
  const allowed = new Set<string>();
  for (const m of messages) {
    for (const match of m.content.matchAll(TOKEN)) {
      const whole = match[0].toLowerCase();
      allowed.add(whole);
      for (const p of parts(match[0])) allowed.add(p);
    }
  }
  return allowed;
}

export interface GroundingReport {
  /** Name-like words in mid-sentence and figures of two or more digits that appear nowhere in the prompt. */
  specifics: string[];
}

export function inspectAnswer(answer: string, prompt: AfribitChatMessage[]): GroundingReport {
  const allowed = allowedSet(prompt);
  const specifics = new Set<string>();
  for (const match of answer.matchAll(TOKEN)) {
    const word = match[0];
    const index = match.index ?? 0;
    const known = allowed.has(word.toLowerCase()) || parts(word).every((p) => allowed.has(p));

    if (/^\d[\d,.]*$/.test(word)) {
      const digits = word.replace(/[^\d]/g, "");
      if (digits.length >= 2 && !allowed.has(word) && !allowed.has(digits)) specifics.add(word);
      continue;
    }
    if (known || word.length < 3) continue;
    if (!/^\p{Lu}/u.test(word)) continue;
    // A capital at the start of a sentence says nothing (every sentence has one, and ordinary words
    // the prompt never used are common). Only mid-sentence capitals look like names.
    if (!SENTENCE_START.test(answer.slice(0, index))) specifics.add(word);
  }
  return { specifics: [...specifics] };
}

/** Name-like words and figures in the answer that appear nowhere in the prompt. Empty means grounded. */
export function findUngrounded(answer: string, prompt: AfribitChatMessage[]): string[] {
  return inspectAnswer(answer, prompt).specifics;
}

export type GroundingMode = "off" | "log" | "enforce";
