/**
 * Deterministic hard-stop for the two most severe SAFETY_POLICY violations
 * (promptBuilder.ts) reaching a live user: the model itself requesting a
 * secret, or making a guaranteed-returns promise. This is an output-side
 * check -- secretDetector.ts already covers the input side (a user pasting
 * a secret into chat).
 *
 * Added 2026-09-24 following an external audit of this project's approach:
 * the prompt-level SAFETY_POLICY instructs the model never to do either of
 * these, and the model reliably complies in practice, but there was no
 * real-time verification catching the rare case where it doesn't -- unlike
 * postProcess.ts's "Kwa hivyo" fix, which only guards style, nothing
 * guarded safety-critical content before this. Same reasoning as that
 * fix: cheap, deterministic, no extra model call, applied as a genuine
 * hard stop rather than a style nudge, given the higher stakes.
 *
 * Deliberately conservative on negation to avoid false-positiving on
 * legitimate safety education, which talks ABOUT seed phrases and scam
 * guarantees constantly ("never share your seed phrase," "no one can
 * guarantee tomorrow's price") -- every SHENG_FEW_SHOT_EXAMPLES turn that
 * discusses these topics is used as a regression case for this exact
 * reason (see the eval/test file). Favors under-flagging a borderline
 * sentence over blocking a real, safe answer.
 *
 * Negation window widened to 3 sentences (2026-09-30, found live during a
 * local demo run): the natural, correct way to debunk a scam claim is
 * often two separate sentences -- "Watu wanasema utapata guaranteed
 * profit. Hiyo si kweli." -- and a same-sentence-only negation check
 * blocked that real, safe refutation on every single run of the exact
 * scam question this feature exists to handle safely (3/3 in a row, not
 * stochastic noise). Checking the sentence before and after the match
 * catches both "claim, then refutation" and "refutation, then claim"
 * orderings without losing the original narrow-scope intent -- still
 * bounded to nearby sentences, not the whole message.
 */

export interface OutputSafetyResult {
  violated: boolean;
  kind: "requested_secret" | "guaranteed_returns" | null;
}

const NEGATION_WORDS =
  /\b(usi\w*|kamwe|never|hakuna|hakika hakuna|hawezi|siwezi|hataki|\bsi\b|si\s+kweli|no legitimate|won'?t|will not|cannot|can'?t|not\s+\w*\s*(will|can))\b/i;

// An imperative verb directed at the user, asking them to hand a secret
// TO the assistant -- not the model warning that a scammer might ask.
const SECRET_REQUEST =
  /\b(tuma|nipe|niletee|niambie|nionyeshe|type in|share|send me|give me|tell me)\b[^.!?\n]{0,40}\b(seed phrase|recovery phrase|private key|maneno (ya )?12|maneno (ya )?24|\bPIN\b|\bOTP\b|password|passwordi)\b/i;

// No leading \b before "hakikish": Swahili tense/subject prefixes attach
// directly to the stem with no word boundary (e.g. "umehakikishiwa"), so a
// \b anchor there silently never matches -- caught by _manualCheck.ts.
const GUARANTEE_CLAIM =
  /guarantees?[^.!?\n]{0,30}\b(profit|return|money|double|increase)\b|guaranteed\s+to\s+(double|increase|grow|multiply)|hakikish\w+[^.!?\n]{0,25}(faida|utapata|itapanda)|will\s+definitely\s+(make|earn)|bila shaka utapata\s+faida/i;

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

export function checkOutputSafety(text: string): OutputSafetyResult {
  const sentences = splitSentences(text);
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if (sentence === undefined) continue;
    if (!SECRET_REQUEST.test(sentence) && !GUARANTEE_CLAIM.test(sentence)) continue;

    // Check this sentence plus its immediate neighbors -- a real claim
    // restated for the purpose of debunking it is often negated in an
    // adjacent sentence, not the same one.
    const window = [sentences[i - 1], sentence, sentences[i + 1]].filter((s): s is string => Boolean(s)).join(" ");
    if (NEGATION_WORDS.test(window)) continue;

    if (SECRET_REQUEST.test(sentence)) return { violated: true, kind: "requested_secret" };
    if (GUARANTEE_CLAIM.test(sentence)) return { violated: true, kind: "guaranteed_returns" };
  }
  return { violated: false, kind: null };
}

// The message shown instead of a withheld answer is the community's, in its language: pack prompts/output-withheld.md.
