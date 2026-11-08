import { detectSecret, mentionsSecretTerms, type SecretDetectionResult } from "./secretDetector.js";

/**
 * Regression suite for the live-chat secret detector. No DB, network or API key.
 *
 * The rule under test: flag a secret's *content*, never the mere mention of the
 * topic. Production once refused to answer "Seed phrase ni nini?" because a
 * keyword match treated every question about seed phrases as a leaked one -- the
 * single most important beginner-safety topic. The first group below locks that
 * out; the second proves real secrets are still caught.
 *
 * All "secrets" here are public test vectors or obviously fake values.
 *
 * Run with: pnpm --filter @afribit/api test:secret-detector
 */

const hex64 = "0123456789abcdef".repeat(4);

/** Education, scam questions, transaction ids -- must reach the model untouched. */
const MUST_PASS_THROUGH: readonly string[] = [
  "Seed phrase ni nini?",
  "What is a recovery phrase and why does it matter?",
  "Why is my wallet password different from my recovery phrase?",
  "Mtu amenipigia simu anasema ako Afribit, anataka seed phrase yangu ili anisaidie. Nimpe?",
  "Niaje, msee amenitumia DM ananiuliza nimtumie seed phrase yangu ndio anisaidie na payment iko stuck. Nifanye aje?",
  "Should I write my 12 words on paper or keep a photo of them on my phone?",
  "How long is a 24 word seed phrase, and is it case sensitive?",
  "My PIN is 4 digits, is that safe for my wallet?",
  "Is it safe to use the same password for my wallet and my email?",
  "What does an xprv key mean, and should I ever share it?",
  "Nenosiri na seed phrase ni vitu tofauti?",
  "Someone says Afribit support needs my private key to fix my payment. Is that real?",
  `Has transaction ${hex64} confirmed yet?`,
  "Naweza kutuma kwa bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?",
  "OTP expires in 10 minutes, so how do I use it with a Lightning wallet?",
];

interface MustDetect {
  message: string;
  kind: NonNullable<SecretDetectionResult["kind"]>;
}

/** Actual secrets -- must be caught. Public BIP39/BIP32 vectors, fake values otherwise. */
const MUST_DETECT: readonly MustDetect[] = [
  // Recovery phrases (BIP39 test vector: public, funds nothing)
  { message: "legal winner thank year wave sausage worth useful legal winner thank yellow", kind: "seed_phrase" },
  { message: "LEGAL, Winner, Thank, Year, Wave, Sausage, Worth, Useful, Legal, Winner, Thank, Yellow", kind: "seed_phrase" },
  {
    message: "1 legal 2 winner 3 thank 4 year 5 wave 6 sausage 7 worth 8 useful 9 legal 10 winner 11 thank 12 yellow",
    kind: "seed_phrase",
  },
  { message: "my seed phrase is legal winner thank year wave sausage worth useful", kind: "seed_phrase" },
  // Key material (BIP32 test vector 1 xprv; fake nsec; well-known public WIF example)
  {
    message: "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi",
    kind: "private_key",
  },
  { message: `nsec1${"q".repeat(58)}`, kind: "private_key" },
  { message: "5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ", kind: "private_key" },
  { message: `my private key is ${hex64}`, kind: "private_key" },
  // PINs and one-time codes (including the M-Pesa-style phrasing)
  { message: "my M-Pesa PIN is 4321", kind: "pin_or_otp" },
  { message: "OTP 482913", kind: "pin_or_otp" },
  { message: "verification code: 482913, please confirm", kind: "pin_or_otp" },
  { message: "namba ya siri yangu ni 4821", kind: "pin_or_otp" },
  { message: "4321 is my PIN", kind: "pin_or_otp" },
  // Passwords with an actual value
  { message: "my password is Hunter2024!", kind: "password" },
  { message: "nenosiri yangu ni Mombasa2026", kind: "password" },
  { message: "wallet password: correcthorsebatterystaple", kind: "password" },
];

let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  console.log(`  FAIL: ${msg}`);
};

console.log("Must pass through (education, scam questions, txids):");
for (const message of MUST_PASS_THROUGH) {
  const r = detectSecret(message);
  if (r.detected) fail(`wrongly flagged as ${r.kind}: ${message.slice(0, 90)}`);
  else console.log(`  ok   ${message.slice(0, 90)}`);
}

console.log("\nMust detect (real secret content):");
for (const { message, kind } of MUST_DETECT) {
  const r = detectSecret(message);
  if (!r.detected) fail(`missed ${kind}: ${message.slice(0, 90)}`);
  else if (r.kind !== kind) fail(`expected ${kind}, got ${r.kind}: ${message.slice(0, 90)}`);
  else if (r.redacted.includes("legal winner") || r.redacted.includes("4321") || r.redacted.includes("Hunter2024")) {
    fail(`redacted output still contains the secret: ${r.redacted.slice(0, 90)}`);
  } else console.log(`  ok   ${kind.padEnd(11)} ${message.slice(0, 70)}`);
}

console.log("\nDataset Lab gate (loose keyword policy, unchanged):");
for (const text of ["Usiwahi kushare seed phrase yako na mtu yeyote", "Weka password ndefu kwa wallet yako"]) {
  if (!mentionsSecretTerms(text)) fail(`mentionsSecretTerms should reject: ${text}`);
  else console.log(`  ok   rejects: ${text}`);
}
if (mentionsSecretTerms("Bitcoin ni pesa ya digital")) fail("mentionsSecretTerms wrongly rejected plain text");

const total = MUST_PASS_THROUGH.length + MUST_DETECT.length + 3;
console.log(`\n${failures === 0 ? `All ${total} secret-detector checks pass.` : `${failures} check(s) FAILED.`}`);
if (failures > 0) process.exit(1);
