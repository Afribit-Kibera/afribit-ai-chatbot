import type { AfribitChatMessage } from "@afribit/shared";

/**
 * A Community Pack is everything that makes this engine one community's AI: its languages and how
 * they should be spoken, who the assistant is, what must never be said, and the reviewed knowledge
 * it answers from. The engine (retrieval, the model gateway, review gates, evaluation, the node kit)
 * is the same for every community. See docs/guides/community-pack-guide.md.
 */

export const PACK_SCHEMA = "afribit-community-pack/0.1";

export const CARD_STATUSES = ["draft", "needs_factual_review", "needs_language_review", "approved", "published", "deprecated", "archived"] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

/** A way of speaking: "sheng", "swahili", "plain_en", "pidgin", ... Chosen by the learner, never inferred. */
export interface PackModeSpec {
  id: string;
  label: string;
  description: string;
  /** True for mixed, code-switched registers: they also get the pack's few-shot examples and reviewed vocabulary. */
  codeSwitched: boolean;
}

export interface PackMode extends PackModeSpec {
  /** Full-prompt guidance for this mode. */
  policyFull: string;
  /** Compact-prompt guidance for this mode. */
  rulesCompact: string;
}

/** Every text the engine puts in front of the model that belongs to a community, not to the engine. */
export interface PackPrompts {
  identityFull: string;
  safetyFull: string;
  /** Cross-cutting guidance on register and response shape (optional; empty is fine). */
  communicationGuide: string;
  vocabIntroFull: string;
  noKnowledgeFull: string;
  identityCompact: string;
  safetyCompact: string;
  /** Extra rules appended for code-switched modes in the compact prompt. */
  codeSwitchedRulesCompact: string;
  shapeCompact: string;
  vocabIntroCompact: string;
  serveIdentity: string;
  serveSafety: string;
  /** The waiter's order-ticket instructions. */
  ticket: string;
  /** The chef's instructions (restaurant pipeline). */
  chef: string;
  /** Shown when an answer brings in specifics found nowhere in the knowledge it was given (replaces the answer, or is appended to a streamed one). */
  ungroundedNote: string;
  /** Shown instead of an answer when the learner pasted a password, PIN, recovery phrase or key. */
  secretWarning: string;
  /** Shown instead of an answer the output safety check withheld (a requested secret or a guaranteed-return claim). */
  outputWithheld: string;
  /** Shown when the model could not be reached and no saved card matched. */
  serviceUnavailable: string;
  /** Push notification shown when an answer is ready. */
  notificationTitle: string;
  notificationBody: string;
  /** Demonstrated conversation turns for code-switched modes. */
  fewShots: AfribitChatMessage[];
}

export interface PackTopic {
  id: string;
  title: string;
  domain: string;
}

export interface PackCard {
  id: string;
  topic: string | null;
  title: string;
  domain: string;
  canonical_answer: string;
  beginner_answer: string;
  safety_notes: string[];
  status: CardStatus;
}

/** Real questions, and the cards that should answer them: how a community checks its pack's retrieval. */
export interface PackEval {
  cases: { id: string; query: string; expected: string[] }[];
  /** Questions the pack should NOT be able to answer (off-topic). Used to see how confident retrieval is when it should be unsure. */
  notCovered: { id: string; query: string }[];
}

/** One deterministic clean-up rule applied to every answer after the model writes it. */
export interface PostprocessRule {
  find: RegExp;
  replace: string;
}

/** White-label presentation (pack.json "branding"), resolved with defaults. Never enters a prompt. See branding.ts. */
export interface PackBranding {
  /** Shown in the app header and the page title. Defaults to the pack's name. */
  shortName: string;
  tagline: string | null;
  /** Lower-case #rrggbb, or null to keep the app's own colour. */
  accentColor: string | null;
  /** The text colour to use on the accent (white or near-black, whichever reaches WCAG AA); null when there is no accent. */
  accentInk: string | null;
  /** A validated image kept in memory, so what is served is what was checked. */
  logo: { rel: string; contentType: string; bytes: Buffer; etag: string } | null;
  /** Optional wording for the first screen, in the community's own language. null = the app's built-in text. */
  welcomeTitle: string | null;
  welcomeText: string | null;
  composerPlaceholder: string | null;
  poweredBy: { show: boolean; label: string; url: string };
}

export interface CommunityPack {
  schema: typeof PACK_SCHEMA;
  id: string;
  /** What the assistant is called, e.g. "Afribit AI". */
  name: string;
  version: string;
  description: string;
  license: string;
  maintainers: { name: string; contact: string }[];
  community: { name: string; country?: string };
  domain: { id: string; label: string; retrievalDomains: string[] };
  defaultMode: string;
  modes: PackMode[];
  /** Used in "Retrieved <label> knowledge:" in the full prompt. */
  knowledgeLabel: string;
  knowledge: { topics: PackTopic[]; entries: PackCard[] };
  safety: { secretDetection: boolean; grounding: "off" | "log" | "enforce" };
  prompts: PackPrompts;
  /** From language/postprocess.json: clean-up rules applied to every answer. */
  postprocess: PostprocessRule[];
  /** From retrieval/synonyms.json: extra search words for words people type (lower case). */
  synonyms: Record<string, string[]>;
  /** Product, place and protocol words that look like names but are not (the privacy scrubber must not remove them). */
  knownTerms: string[];
  /** From eval/retrieval.json, if the pack has one. */
  eval: PackEval | null;
  starterQuestions: { reviewed: boolean; byMode: Record<string, string[]> } | null;
  disclaimers: string[];
  branding: PackBranding;
  /** Absolute directory the pack was loaded from. */
  dir: string;
}

export interface PackReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  pack?: CommunityPack;
}
