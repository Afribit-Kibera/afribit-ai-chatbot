/**
 * Secret detection on incoming chat messages.
 *
 * What this is for: if someone pastes a recovery phrase, key, PIN or password
 * into the chat, we warn them, refuse to store the message, and never forward it
 * to a model provider.
 *
 * What this is NOT for: stopping people from *talking about* seed phrases, PINs
 * and passwords. Those are the most important topics in beginner Bitcoin
 * education ("what is a seed phrase?", "should I give my seed phrase to someone
 * who says they're Afribit support?"), and a keyword match here would refuse to
 * answer exactly the questions that keep people safe. So detection looks at the
 * *content* of a secret -- a real 12/24-word BIP39 phrase, key material, a PIN or
 * password with an actual value -- never at the mere presence of the word.
 *
 * It is still a heuristic: it favours not blocking education over catching every
 * possible secret. A secret that slips through is handled by the model-level
 * safety rules, which never ask for or repeat secrets.
 */

import { BIP39_ENGLISH } from "./bip39English.js";

export interface SecretDetectionResult {
  detected: boolean;
  kind: "seed_phrase" | "private_key" | "pin_or_otp" | "password" | null;
  redacted: string;
}

const WITHHELD = "[message withheld — appeared to contain sensitive account information]";

// ── Recovery phrase ─────────────────────────────────────────────────────────

/** Mentions of the concept, used only to lower the bar for a *partial* phrase. */
const SEED_PHRASE_KEYWORDS = /(seed phrase|recovery phrase|mnemonic|backup phrase|24 words|12 words)/i;

/** Length of the longest run of consecutive BIP39 words (digits/punctuation between words ignored). */
function longestBip39Run(text: string): number {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  let run = 0;
  let best = 0;
  for (const w of words) {
    if (BIP39_ENGLISH.has(w)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

function containsRecoveryPhrase(text: string): boolean {
  const run = longestBip39Run(text);
  // A real phrase is 12-24 words. Twelve consecutive dictionary words in ordinary
  // prose is vanishingly unlikely; with an explicit "my seed phrase is ..." lead-in
  // we accept a shorter run so a partly-typed phrase is still caught.
  return run >= 12 || (run >= 6 && SEED_PHRASE_KEYWORDS.test(text));
}

// ── Private key material ────────────────────────────────────────────────────

const BASE58 = "[1-9A-HJ-NP-Za-km-z]";
const PRIVATE_KEY_PATTERNS: readonly RegExp[] = [
  new RegExp(`\\b[xyz]prv${BASE58}{100,115}\\b`), // BIP32 extended private key
  /\bnsec1[02-9ac-hj-np-z]{50,}\b/i, // Nostr secret key
  new RegExp(`\\b(?:5${BASE58}{50}|[KL]${BASE58}{51})\\b`), // WIF private key
  // A bare 64-hex string is also a transaction id, so only flag it when labelled as a key.
  /\b(?:private|secret|priv)\s*key\b[^0-9a-f\n]{0,30}\b[0-9a-f]{64}\b/i,
];

// ── PIN / one-time codes ────────────────────────────────────────────────────

const PIN_OTP_LABEL =
  "(?:pin|otp|verification code|auth(?:entication)? code|2fa code|one[- ]time (?:pin|code|password)|nambari ya siri|namba ya siri)";
const PIN_OTP_VALUE_AFTER = new RegExp(`\\b${PIN_OTP_LABEL}\\b[^\\d\\n]{0,25}\\b\\d{4,8}\\b`, "i");
const PIN_OTP_VALUE_BEFORE = /\b\d{4,8}\b[^\d\n]{0,20}\b(?:my\s+(?:pin|otp)|pin\s+yangu)\b/i;

// ── Passwords ───────────────────────────────────────────────────────────────

const PASSWORD_LABEL = "(?:password|passcode|passphrase|nenosiri)";
/** "password: Tr0ub4dor" / "password = ..." -- an assigned value. */
const PASSWORD_ASSIGNED = new RegExp(`\\b${PASSWORD_LABEL}\\b\\s*[:=]\\s*["'“]?\\S{8,}`, "i");
/**
 * "my password is hunter2" -- but not "my password is too short". The value must
 * contain a digit or symbol, which separates a real password from an English word.
 */
const PASSWORD_STATED = new RegExp(
  `\\b${PASSWORD_LABEL}(?:\\s+yangu)?\\s+(?:is|ni)\\s+["'“]?(?=\\S*[\\d!@#$%^&*_\\-])\\S{6,}`,
  "i",
);

// ── Public API ──────────────────────────────────────────────────────────────

export function detectSecret(message: string): SecretDetectionResult {
  const trimmed = message.trim();

  if (containsRecoveryPhrase(trimmed)) {
    return { detected: true, kind: "seed_phrase", redacted: "[seed phrase removed]" };
  }
  if (PRIVATE_KEY_PATTERNS.some((re) => re.test(trimmed))) {
    return { detected: true, kind: "private_key", redacted: WITHHELD };
  }
  if (PIN_OTP_VALUE_AFTER.test(trimmed) || PIN_OTP_VALUE_BEFORE.test(trimmed)) {
    return { detected: true, kind: "pin_or_otp", redacted: trimmed.replace(/\d{4,8}/g, "[redacted]") };
  }
  if (PASSWORD_ASSIGNED.test(trimmed) || PASSWORD_STATED.test(trimmed)) {
    return { detected: true, kind: "password", redacted: WITHHELD };
  }

  return { detected: false, kind: null, redacted: trimmed };
}

/**
 * Loose keyword match: true if the text merely *mentions* a secret-related term.
 *
 * Deliberately NOT used on live chat input (that would block education -- see the
 * file header). It exists for the Dataset Lab's quality gate, which has always
 * rejected generated candidates that mention these terms; keeping that policy
 * unchanged is a separate decision from fixing live chat.
 */
export function mentionsSecretTerms(text: string): boolean {
  return (
    detectSecret(text).detected ||
    SEED_PHRASE_KEYWORDS.test(text) ||
    /(private key|xprv|nsec1[a-z0-9]{20,})/i.test(text) ||
    (/(\bpin\b|\botp\b|verification code|auth code|2fa code)/i.test(text) && /\d{4,8}/.test(text)) ||
    /\bpassword\b/i.test(text)
  );
}

// The warning shown instead of an answer is the community's, in its language: pack prompts/secret-warning.md.

