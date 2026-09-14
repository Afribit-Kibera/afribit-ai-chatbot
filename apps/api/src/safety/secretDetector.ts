/**
 * PRD §21.1 — Secret Detection. Heuristic MVP detector: good enough to
 * trigger the safety UX (warn, redact, avoid forwarding to OpenRouter), but
 * not a substitute for a properly maintained BIP39 wordlist matcher before
 * production use. Revisit before Phase 4 pilot.
 */

export interface SecretDetectionResult {
  detected: boolean;
  kind: "seed_phrase" | "private_key" | "pin_or_otp" | "password" | null;
  redacted: string;
}

const BIP39_HINT_WORDS = new Set([
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
  "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
  "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual",
]);

const SEED_PHRASE_KEYWORDS = /(seed phrase|recovery phrase|mnemonic|backup phrase|24 words|12 words)/i;
const PRIVATE_KEY_KEYWORDS = /(private key|xprv|nsec1[a-z0-9]{20,})/i;
const PIN_OTP_KEYWORDS = /(\bpin\b|\botp\b|verification code|auth code|2fa code)/i;
const PASSWORD_KEYWORDS = /\bpassword\b/i;
/** 12 or 24 space-separated lowercase words — a plausible raw mnemonic. */
const RAW_MNEMONIC_SHAPE = /^(?:[a-z]{3,8}\s+){11}[a-z]{3,8}$|^(?:[a-z]{3,8}\s+){23}[a-z]{3,8}$/i;

export function detectSecret(message: string): SecretDetectionResult {
  const trimmed = message.trim();

  if (RAW_MNEMONIC_SHAPE.test(trimmed)) {
    const words = trimmed.split(/\s+/);
    const bip39Hits = words.filter((w) => BIP39_HINT_WORDS.has(w.toLowerCase())).length;
    if (bip39Hits > 0 || SEED_PHRASE_KEYWORDS.test(trimmed)) {
      return { detected: true, kind: "seed_phrase", redacted: "[seed phrase removed]" };
    }
  }

  if (SEED_PHRASE_KEYWORDS.test(trimmed)) {
    return { detected: true, kind: "seed_phrase", redacted: redact(trimmed, SEED_PHRASE_KEYWORDS) };
  }
  if (PRIVATE_KEY_KEYWORDS.test(trimmed)) {
    return { detected: true, kind: "private_key", redacted: redact(trimmed, PRIVATE_KEY_KEYWORDS) };
  }
  if (PIN_OTP_KEYWORDS.test(trimmed) && /\d{4,8}/.test(trimmed)) {
    return { detected: true, kind: "pin_or_otp", redacted: trimmed.replace(/\d{4,8}/g, "[redacted]") };
  }
  if (PASSWORD_KEYWORDS.test(trimmed)) {
    return { detected: true, kind: "password", redacted: redact(trimmed, PASSWORD_KEYWORDS) };
  }

  return { detected: false, kind: null, redacted: trimmed };
}

function redact(text: string, _matcher: RegExp): string {
  return "[message withheld — appeared to contain sensitive account information]";
}

export const SECRET_WARNING_MESSAGE =
  "I noticed this looks like it might contain a seed phrase, private key, password, or code. " +
  "I never need that information, and no legitimate Afribit support agent will ever ask for it either. " +
  "Please don't share it here — not with me, and not with anyone claiming to help you.";
