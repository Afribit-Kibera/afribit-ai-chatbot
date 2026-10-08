#!/usr/bin/env node
// Unblind and summarise reviewers' answers.
//
//   node score.mjs key.json review-alice.json review-bob.json ...
//
// Prints Markdown: per-variant naturalness, correctness, safety flags and "best answer" share, how often
// reviewers agreed, and every free-text note with the variant it was about.
import fs from "node:fs";

const [keyPath, ...files] = process.argv.slice(2);
if (!keyPath || files.length === 0) {
  console.error("usage: node score.mjs key.json review-*.json");
  process.exit(1);
}
const key = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
const reviews = files.map((f) => JSON.parse(fs.readFileSync(f, "utf-8")));

const variants = [...new Set(Object.values(key.items).flatMap((m) => Object.values(m)))];
const stat = Object.fromEntries(variants.map((v) => [v, { n: 0, natural: 0, yes: 0, mostly: 0, no: 0, unsafe: 0, best: 0 }]));
let noneBest = 0;
let rankedItems = 0;
const bestByItem = {}; // itemId -> [variant|none per reviewer]
const notes = [];

for (const rv of reviews) {
  if (rv.pack && key.pack && rv.pack !== key.pack) console.warn(`warning: ${rv.reviewer?.name} reviewed a different pack (${rv.pack})`);
  for (const [itemId, r] of Object.entries(rv.ratings)) {
    const map = key.items[itemId];
    if (!map) continue;
    for (const [letter, v] of Object.entries(map)) {
      const a = r[letter];
      if (!a || !a.natural) continue;
      const s = stat[v];
      s.n += 1;
      s.natural += a.natural;
      if (a.correct === "yes") s.yes += 1;
      else if (a.correct === "mostly") s.mostly += 1;
      else if (a.correct === "no") s.no += 1;
      if (a.unsafe) s.unsafe += 1;
    }
    if (r.best) {
      rankedItems += 1;
      (bestByItem[itemId] ??= []).push(r.best === "none" ? "none" : map[r.best]);
      if (r.best === "none") noneBest += 1;
      else stat[map[r.best]].best += 1;
    }
    if (r.notes) notes.push({ reviewer: rv.reviewer?.name ?? "?", item: itemId, best: r.best === "none" ? "none" : map[r.best], text: r.notes });
  }
}

const pct = (x, n) => (n ? `${Math.round((x / n) * 100)}%` : "-");
console.log(`# Blind review results — ${key.title ?? ""}\n`);
console.log(`Reviewers: ${reviews.map((r) => `${r.reviewer?.name ?? "?"}${r.reviewer?.area ? ` (${r.reviewer.area}${r.reviewer.age ? ", " + r.reviewer.age : ""})` : ""}`).join("; ")}`);
console.log(`Questions rated: ${rankedItems} (reviewer × question)\n`);
console.log("| Variant | Answers rated | Natural (1–5) | Correct: yes | mostly | no | Flagged risky | Picked best |");
console.log("|---|---|---|---|---|---|---|---|");
for (const v of variants) {
  const s = stat[v];
  console.log(`| ${v} | ${s.n} | ${s.n ? (s.natural / s.n).toFixed(2) : "-"} | ${pct(s.yes, s.n)} | ${pct(s.mostly, s.n)} | ${pct(s.no, s.n)} | ${s.unsafe} (${pct(s.unsafe, s.n)}) | ${s.best} (${pct(s.best, rankedItems)}) |`);
}
console.log(`\n"None of them" was chosen as best ${noneBest} time(s) (${pct(noneBest, rankedItems)}).`);

// Agreement: for questions with 2+ reviewers, how often did a pair choose the same variant?
let pairs = 0;
let agree = 0;
for (const picks of Object.values(bestByItem)) {
  for (let i = 0; i < picks.length; i++) for (let j = i + 1; j < picks.length; j++) {
    pairs += 1;
    if (picks[i] === picks[j]) agree += 1;
  }
}
if (pairs) console.log(`\nAgreement on the best answer: ${agree}/${pairs} reviewer pairs (${pct(agree, pairs)}). With ${variants.length} variants, chance agreement is about ${Math.round(100 / variants.length)}%.`);

if (notes.length) {
  console.log("\n## Reviewers' notes (use these as corrections and for the language corpus)\n");
  for (const n of notes) console.log(`- **${n.item}** (${n.reviewer}; their pick: ${n.best}): ${n.text.replace(/\n/g, " ")}`);
}
