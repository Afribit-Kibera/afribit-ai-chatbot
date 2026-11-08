import { detectSecret } from "../safety/secretDetector.js";

/**
 * The gap list's rules (docs/features/F-004-gap-list.md). Pure functions; gapCases.ts tests them.
 */
export const MIN_SHOWN = 5;
export const GAP_STATUSES = ["open", "card_written", "out_of_scope"] as const;
export type GapStatus = (typeof GAP_STATUSES)[number];

/**
 * A gap: the best card's meaning-match score is under the threshold, or meaning search ran and found no card.
 * Nothing is judged (no gap) when meaning search did not run: the legacy confidence cannot tell (F-004).
 */
export function isGap(meaningScore: number | null, judged: boolean, threshold: number): boolean {
  if (!judged) return false;
  return meaningScore === null || meaningScore < threshold;
}

/** Rounded to one decimal, so a gap cannot be matched back to a stored chat by its exact score. */
export const roundConfidence = (c: number | null): number | null => (c === null ? null : Math.round(Math.min(1, Math.max(0, c)) * 10) / 10);

/** The labeller's instructions. It sorts; it never answers. */
export function labelPrompt(existing: string[]): string {
  const list = existing.length ? existing.map((t) => `- ${t}`).join("\n") : "(none yet)";
  return `You sort questions that a community assistant's knowledge cards could not answer into topics, so its reviewers know which cards to write next. You do NOT answer the question.

Existing topics:
${list}

Return JSON only: {"topic": "..."}
If the question is about the same subject as an existing topic, even when it asks something narrower or uses different words, use that topic, written exactly as above. Otherwise write a new, broad topic: 2 to 6 words, in English, naming the subject rather than the detail, so that other people's questions on the same subject fit it too (for example "Bitcoin tax in Kenya", not "Capital gains tax on selling bitcoin"; "Buying Bitcoin with M-Pesa"; "Lightning payment failed"). Never include names, phone numbers, amounts, dates, places smaller than a city, or anything else that could identify who asked.`;
}

const PHONE = /(\+?\d[\d\s-]{6,}\d)/;

/** A label we are willing to store and show, or null (the gap is then counted as unlabelled). */
export function sanitizeTopic(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const label = raw
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'`*\-\s]+|["'`*.\s]+$/g, "");
  if (label.length < 2 || label.length > 60) return null;
  const words = label.split(" ").filter(Boolean);
  if (words.length < 1 || words.length > 6) return null;
  if (/\d/.test(label) || PHONE.test(label)) return null; // numbers: amounts, dates, phone numbers, ids
  if (/@|https?:|www\.|\.com\b/i.test(label)) return null;
  if (/[{}[\]<>|\\]/.test(label)) return null;
  if (detectSecret(label).detected) return null;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Pull {"topic": "..."} out of a model reply (tolerates prose and code fences), then sanitise it. */
export function parseTopic(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return sanitizeTopic((JSON.parse(match[0]) as { topic?: unknown }).topic);
  } catch {
    return null;
  }
}

/** Same topic whatever the case or spacing. */
export const topicKey = (label: string): string => label.toLowerCase().replace(/\s+/g, " ").trim();

export interface GapRow {
  topicId: string | null;
  label: string | null;
  status: GapStatus | null;
  cardId: string | null;
  cardTitle: string | null;
  note: string | null;
  languageMode: string | null;
  nearestCard: string | null;
  nearestTitle: string | null;
  count: number;
  firstDay: string;
  lastDay: string;
}

export interface GapTopic {
  id: string | null; // null: the unlabelled line
  label: string;
  status: GapStatus;
  count: number;
  firstDay: string;
  lastDay: string;
  languages: { mode: string; count: number }[]; // only those with MIN_SHOWN or more
  nearestCards: { id: string; title: string | null; count: number }[];
  cardId: string | null;
  cardTitle: string | null;
  note: string | null;
}

/**
 * Rows grouped by (topic, language, nearest card) → topics with at least MIN_SHOWN questions; everything smaller
 * is summed into `hidden`. Languages are named only with MIN_SHOWN or more.
 */
export function summarise(rows: GapRow[], minShown = MIN_SHOWN): { topics: GapTopic[]; hidden: { topics: number; questions: number }; total: number } {
  const byTopic = new Map<string, { rows: GapRow[]; count: number }>();
  for (const r of rows) {
    const key = r.topicId ?? "__unlabelled__";
    const t = byTopic.get(key) ?? { rows: [], count: 0 };
    t.rows.push(r);
    t.count += r.count;
    byTopic.set(key, t);
  }
  const topics: GapTopic[] = [];
  let hiddenTopics = 0;
  let hiddenQuestions = 0;
  let total = 0;
  for (const [key, t] of byTopic) {
    total += t.count;
    if (t.count < minShown) {
      hiddenTopics += 1;
      hiddenQuestions += t.count;
      continue;
    }
    const first = t.rows[0]!;
    const sumBy = <K extends string>(pick: (r: GapRow) => K | null) => {
      const m = new Map<K, number>();
      for (const r of t.rows) {
        const k = pick(r);
        if (k !== null) m.set(k, (m.get(k) ?? 0) + r.count);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const titles = new Map(t.rows.filter((r) => r.nearestCard).map((r) => [r.nearestCard!, r.nearestTitle]));
    topics.push({
      id: key === "__unlabelled__" ? null : key,
      label: first.label ?? "Unlabelled",
      status: first.status ?? "open",
      count: t.count,
      firstDay: t.rows.map((r) => r.firstDay).sort()[0]!,
      lastDay: t.rows.map((r) => r.lastDay).sort().at(-1)!,
      languages: sumBy((r) => r.languageMode)
        .filter(([, c]) => c >= minShown)
        .map(([mode, count]) => ({ mode, count })),
      nearestCards: sumBy((r) => r.nearestCard)
        .slice(0, 3)
        .map(([id, count]) => ({ id, title: titles.get(id) ?? null, count })),
      cardId: first.cardId,
      cardTitle: first.cardTitle,
      note: first.note,
    });
  }
  topics.sort((a, b) => Number(a.status !== "open") - Number(b.status !== "open") || b.count - a.count);
  return { topics, hidden: { topics: hiddenTopics, questions: hiddenQuestions }, total };
}

export function parseDecision(body: unknown): { ok: true; status: GapStatus; cardId: string | null; note: string | null } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (!(GAP_STATUSES as readonly unknown[]).includes(b.status)) return { ok: false, error: `status must be one of ${GAP_STATUSES.join(", ")}` };
  const cardId = typeof b.cardId === "string" && b.cardId.trim() ? b.cardId.trim().slice(0, 120) : null;
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 500) : null;
  if (note && detectSecret(note).detected) return { ok: false, error: "The note contains something that looks like a secret" };
  return { ok: true, status: b.status as GapStatus, cardId: b.status === "card_written" ? cardId : null, note };
}
