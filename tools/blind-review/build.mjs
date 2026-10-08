#!/usr/bin/env node
// Build a blind review pack: one self-contained HTML page for reviewers, plus a secret key.
//
//   node build.mjs input.json [outDir] [seed]
//
// input.json: { "title": "...", "items": [ { "id": "T1", "mode": "sheng", "question": "...",
//                "answers": [ { "variant": "current", "text": "..." }, ... ] } ] }
//
// Writes outDir/review.html (send this to reviewers) and outDir/key.json (keep it private: it maps
// each anonymous answer letter back to the model/prompt that wrote it). Answer order is shuffled per
// question with a seeded generator, so a reviewer cannot learn "A is always the same model".
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [inputPath, outDir = "out", seedArg] = process.argv.slice(2);
if (!inputPath) {
  console.error("usage: node build.mjs input.json [outDir] [seed]");
  process.exit(1);
}
const input = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
const seed = seedArg ?? crypto.randomBytes(4).toString("hex");

// Small seeded PRNG (mulberry32) so a pack can be rebuilt identically from its seed.
function rng(s) {
  let a = [...String(s)].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(seed);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const LETTERS = "ABCDEFGH";

const items = [];
const key = { seed, title: input.title, items: {} };
for (const it of shuffle(input.items)) {
  const order = shuffle(it.answers);
  key.items[it.id] = {};
  items.push({
    id: it.id,
    mode: it.mode,
    question: it.question,
    answers: order.map((a, i) => {
      key.items[it.id][LETTERS[i]] = a.variant;
      return { letter: LETTERS[i], text: a.text };
    }),
  });
}
const pack = { id: crypto.createHash("sha1").update(JSON.stringify(items)).digest("hex").slice(0, 10), title: input.title ?? "Answer review", items };

const template = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "review-template.html"), "utf-8");
const html = template.replace("/*__PACK__*/null", JSON.stringify(pack).replace(/</g, "\\u003c"));

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "review.html"), html);
fs.writeFileSync(path.join(outDir, "key.json"), JSON.stringify(key, null, 2));
console.log(`built ${items.length} questions, ${items.reduce((n, i) => n + i.answers.length, 0)} answers, pack ${pack.id}, seed ${seed}`);
console.log(`  ${path.join(outDir, "review.html")}  <- send to reviewers`);
console.log(`  ${path.join(outDir, "key.json")}     <- keep private (it reveals which answer is which)`);
