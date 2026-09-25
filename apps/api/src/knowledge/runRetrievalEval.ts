import { retrieveKnowledge } from "./retrieval.js";
import { RETRIEVAL_GOLDEN_CASES } from "./retrievalGoldenCases.js";

/**
 * Minimal retrieval-quality regression check (docs/COMMUNICATION_STYLE_EVAL.md's
 * sibling for RAG rather than register/safety) -- see retrievalGoldenCases.ts
 * for why this exists and its scope. Calls the REAL retrieveKnowledge(), the
 * exact hybrid lexical+semantic path production chat uses -- this makes a
 * real (tiny) OpenRouter embeddings call per query, unlike promptGoldenCases.ts
 * which needs no network access at all.
 *
 * Run with: pnpm --filter @afribit/api knowledge:eval-retrieval
 */

const K_VALUES = [1, 3, 5];
const RETRIEVE_LIMIT = 5;

async function main() {
  const results: { id: string; query: string; rank: number | null; topIds: string[]; expected: string[] }[] = [];

  for (const tc of RETRIEVAL_GOLDEN_CASES) {
    const retrieved = await retrieveKnowledge(tc.query, RETRIEVE_LIMIT);
    const topIds = retrieved.map((r) => r.conceptId);
    const rank = topIds.findIndex((id) => tc.expectedConceptIds.includes(id));
    results.push({
      id: tc.id,
      query: tc.query,
      rank: rank === -1 ? null : rank + 1,
      topIds,
      expected: tc.expectedConceptIds,
    });
  }

  console.log(`Ran ${results.length} retrieval golden cases (limit=${RETRIEVE_LIMIT})\n`);

  for (const k of K_VALUES) {
    const hits = results.filter((r) => r.rank !== null && r.rank <= k).length;
    const pct = ((hits / results.length) * 100).toFixed(1);
    console.log(`Recall@${k}: ${hits}/${results.length} (${pct}%)`);
  }

  const misses = results.filter((r) => r.rank === null);
  console.log(`\n${misses.length} total miss(es) (not found within top ${RETRIEVE_LIMIT}):`);
  for (const m of misses) {
    console.log(`  ${m.id} "${m.query}"`);
    console.log(`    expected one of: ${m.expected.join(", ")}`);
    console.log(`    got: ${m.topIds.length > 0 ? m.topIds.join(", ") : "(nothing)"}`);
  }

  const lowRank = results.filter((r) => r.rank !== null && r.rank > 1);
  if (lowRank.length > 0) {
    console.log(`\n${lowRank.length} case(s) found but not ranked #1 (worth a look, not necessarily a bug):`);
    for (const r of lowRank) {
      console.log(`  ${r.id} "${r.query}" -> rank ${r.rank}, got: ${r.topIds.join(", ")}`);
    }
  }

  if (misses.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
