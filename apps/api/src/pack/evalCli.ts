import path from "node:path";
import { pool } from "../db/pool.js";
import { retrieveKnowledge } from "../knowledge/retrieval.js";
import { DEFAULT_PACK_DIR, setActivePack } from "./active.js";
import { loadPack } from "./load.js";

/**
 * Does the pack's own search find the right card? Runs the pack's eval/retrieval.json questions
 * through the real retrieval path (the same one chat uses) against the database the pack is
 * installed in.
 *
 *   pnpm --filter @afribit/api pack:eval [packDir]
 *
 * Reports recall at 1, 3 and 5 and lists the misses. The "notCovered" questions are ones the pack
 * should not be able to answer; their top confidence shows how sure retrieval is when it should not be.
 * Exits 1 if any case is missed within the top 5.
 */

const K_VALUES = [1, 3, 5];

async function main(): Promise<void> {
  const dir = path.resolve(process.argv[2] ?? process.env.COMMUNITY_PACK_DIR ?? DEFAULT_PACK_DIR);
  const report = loadPack(dir);
  if (!report.ok || !report.pack) {
    console.error(`Pack is not valid:\n${report.errors.map((e) => `  - ${e}`).join("\n")}`);
    process.exitCode = 1;
    return;
  }
  const pack = report.pack;
  if (!pack.eval || pack.eval.cases.length === 0) {
    console.error(`${pack.id} has no eval/retrieval.json cases. Add real questions with the card ids that should answer them.`);
    process.exitCode = 1;
    return;
  }
  setActivePack(pack);

  const results: { id: string; query: string; rank: number | null; top: string[]; expected: string[]; confidence: number }[] = [];
  for (const c of pack.eval.cases) {
    const found = await retrieveKnowledge(c.query, 5);
    const top = found.map((r) => r.conceptId);
    const at = top.findIndex((id) => c.expected.includes(id));
    results.push({ id: c.id, query: c.query, rank: at === -1 ? null : at + 1, top, expected: c.expected, confidence: found[0]?.confidence ?? 0 });
  }

  console.log(`${pack.name} v${pack.version}: ${results.length} retrieval cases (embedding model per environment settings)\n`);
  for (const k of K_VALUES) {
    const hits = results.filter((r) => r.rank !== null && r.rank <= k).length;
    console.log(`Recall@${k}: ${hits}/${results.length} (${((hits / results.length) * 100).toFixed(1)}%)`);
  }
  const misses = results.filter((r) => r.rank === null);
  if (misses.length > 0) {
    console.log(`\n${misses.length} miss(es), not found in the top 5:`);
    for (const m of misses) console.log(`  ${m.id} "${m.query}"\n    expected one of: ${m.expected.join(", ")}\n    got: ${m.top.join(", ") || "(nothing)"}`);
  }
  const notFirst = results.filter((r) => r.rank !== null && r.rank > 1);
  if (notFirst.length > 0) console.log(`\n${notFirst.length} found but not first (worth a look):\n${notFirst.map((r) => `  ${r.id} "${r.query}" -> rank ${r.rank}`).join("\n")}`);

  const hitConf = results.filter((r) => r.rank === 1).map((r) => r.confidence).sort((a, b) => a - b);
  const lowHit = hitConf[0];
  console.log(`\nTop confidence when the right card is first: lowest ${lowHit?.toFixed(2) ?? "-"}, median ${hitConf[Math.floor(hitConf.length / 2)]?.toFixed(2) ?? "-"}.`);

  if (pack.eval.notCovered.length > 0) {
    console.log(`\nQuestions the pack should NOT answer (${pack.eval.notCovered.length}); top confidence retrieval gives them:`);
    const confs: number[] = [];
    for (const q of pack.eval.notCovered) {
      const found = await retrieveKnowledge(q.query, 1);
      const conf = found[0]?.confidence ?? 0;
      confs.push(conf);
      console.log(`  ${q.id} ${conf.toFixed(2)}  "${q.query}"  (nearest: ${found[0]?.conceptId ?? "nothing"})`);
    }
    const highest = Math.max(...confs);
    console.log(`  highest ${highest.toFixed(2)}. ${lowHit !== undefined && highest < lowHit ? "A confidence cut-off between these and the weakest right answer would separate them." : "Confidence alone does not separate them from right answers; the model must decide."}`);
  }
  if (misses.length > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
