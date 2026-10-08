import { CANDIDATE_POOL, fuseRankings, type RankedRow } from "./fusion.js";

/**
 * Regression checks for rank fusion. No database, no network.
 *
 * The bug these guard against: the old merge kept whichever raw score was larger,
 * so a full-text score (unbounded) beat any embedding score (0-1) and semantic
 * search was effectively ignored. Retrieval then found the right card in the
 * top 3 for only 15 of 40 benchmark questions; semantic search alone found it for 35.
 *
 * Run with: pnpm --filter @afribit/api test:fusion
 */

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name} ${detail}`);
  }
};
const ids = (rows: { row: RankedRow }[]) => rows.map((r) => r.row.id);
const row = (id: string, score: number): RankedRow => ({ id, score });

console.log("Scale independence (the original bug):");
{
  // Full-text scores are large and arbitrary; cosine similarities are 0-1.
  const lexical = [row("lexical-favourite", 12.7), row("shared", 9.1), row("lexical-3", 4.0)];
  const semantic = [row("semantic-favourite", 0.61), row("shared", 0.58), row("semantic-3", 0.4)];
  const fused = ids(fuseRankings(lexical, semantic));
  check("semantic's top card outranks lexical's top card despite the smaller raw number", fused.indexOf("semantic-favourite") < fused.indexOf("lexical-favourite"), fused.join(","));
  check("a card both retrievers like ranks first", ids(fuseRankings([row("a", 1), row("shared", 0.9)], [row("b", 0.9), row("shared", 0.8)]))[0] === "shared");
}

console.log("\nAgreement and fallback:");
{
  const both = fuseRankings([row("x", 5), row("y", 4)], [row("x", 0.7), row("z", 0.6)]);
  check("a card in both lists beats cards in one", ids(both)[0] === "x");
  check("every card from either list appears exactly once", new Set(ids(both)).size === 3 && ids(both).length === 3);

  const lexicalOnly = fuseRankings([row("first", 3), row("second", 2), row("third", 1)], []);
  check("with no semantic results (embeddings unavailable) the full-text order is kept", ids(lexicalOnly).join(",") === "first,second,third");
  const semanticOnly = fuseRankings([], [row("s1", 0.9), row("s2", 0.5)]);
  check("with no full-text results the semantic order is kept", ids(semanticOnly).join(",") === "s1,s2");
  check("empty in, empty out", fuseRankings([], []).length === 0);
}

console.log("\nDetails:");
{
  const fused = fuseRankings([row("a", 8)], [row("a", 0.4)]);
  check("keeps the cosine similarity for cards found semantically", fused[0]?.semanticScore === 0.4);
  check("keeps the larger raw score for the legacy confidence value", fused[0]?.bestRawScore === 8);
  check("a lexical-only card has no semantic score", fuseRankings([row("only-lex", 1)], [])[0]?.semanticScore === null);

  // Equal fused scores must give a stable, repeatable order.
  const t1 = ids(fuseRankings([row("b", 1)], [row("a", 1)], { lexical: 1, semantic: 1 }));
  const t2 = ids(fuseRankings([row("b", 1)], [row("a", 1)], { lexical: 1, semantic: 1 }));
  check("ties are deterministic", t1.join() === t2.join());

  // Rank, not raw score, decides: scaling every lexical score changes nothing.
  const base = ids(fuseRankings([row("p", 1), row("q", 0.9)], [row("q", 0.8), row("p", 0.7)]));
  const scaled = ids(fuseRankings([row("p", 1000), row("q", 900)], [row("q", 0.8), row("p", 0.7)]));
  check("multiplying all full-text scores by 1000 does not change the result", base.join() === scaled.join());
  check("the candidate pool is fixed, not tied to how many cards the caller wants", CANDIDATE_POOL >= 20);
}

console.log(`\n${failures === 0 ? "All fusion checks pass." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
