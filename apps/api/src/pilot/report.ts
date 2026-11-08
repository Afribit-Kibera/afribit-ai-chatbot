import { pool } from "../db/pool.js";
import { getRegistry } from "../pack/active.js";
import { parseSourceFilter } from "./source.js";
import { getPilotStats } from "./stats.js";

/**
 * Pilot measurements, from the database the service already keeps. Aggregate counts only by default,
 * matching the pilot plan ("Minimal data", docs/program/pilot-plan.md): no question or answer text is
 * printed unless you ask for samples, and samples only cover answers that were rated unhelpful or
 * flagged, for reviewers to read.
 *
 *   pnpm --filter @afribit/api pilot:report [--days 7] [--source kibera-hub] [--pack <id>] [--samples] [--json]
 *
 * The queries live in stats.ts, which the live pilot console (/pilot) also uses, so the two always agree.
 * What it can and cannot show:
 *   - It counts conversations, questions, answer quality signals (thumbs, fallbacks, safety events,
 *     unsupported-answer flags) and latency. Latency is the whole answer time; first-word time is not recorded.
 *   - Anonymous chat has no person identity, so "weekly active people" is not available; sessions are the unit.
 *   - It does NOT show learning, trust or scam-recognition. Those need the educator-administered
 *     before/after check in the pilot plan. Do not report these numbers as impact.
 */

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const days = Math.min(365, Math.max(1, Math.floor(Number(flag("--days"))) || 7));
const wantSamples = args.includes("--samples");
const asJson = args.includes("--json");
const sourceArg = flag("--source");
const source = sourceArg === undefined ? null : parseSourceFilter(sourceArg);
if (sourceArg !== undefined && source === null) {
  console.error(`--source must be a channel label like kibera-hub (lowercase letters, digits, hyphens), or _none`);
  process.exit(1);
}

const pct = (a: number, b: number): string => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "-");

async function main(): Promise<void> {
  const out = await getPilotStats({ days, source, packId: flag("--pack") ?? null, defaultPackId: getRegistry().default.id });
  const { totals, ratings, answers } = out;

  if (asJson) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(`Pilot report, last ${days} day(s)${source ? ` (channel ${source})` : ""}\n`);
    console.log(`Conversations   ${totals.sessions} started, ${totals.engagedSessions} with 2+ questions (${pct(totals.engagedSessions, totals.sessions)})`);
    console.log(`Questions       ${totals.questions} asked, ${totals.answers} answered`);
    const active = out.perDay.filter((d) => d.questions > 0 || d.sessions > 0);
    if (active.length) console.log(`Per day         ${active.map((d) => `${d.day.slice(5)}: ${d.questions}q/${d.sessions}s`).join("  ")}`);
    if (out.channels.length) console.log(`Channels        ${out.channels.map((c) => `${c.source ?? "(none)"} ${c.sessions}s/${c.questions}q`).join(", ")}`);
    if (out.languageModes.length) console.log(`Language chosen ${out.languageModes.map((m) => `${m.mode} ${pct(m.sessions, totals.sessions)}`).join(", ")}`);
    console.log(`\nAnswer quality signals`);
    console.log(`  Rated by users      ${ratings.rated} (${pct(ratings.rated, totals.answers)} of answers): ${ratings.helpful} helpful, ${ratings.notHelpful} not helpful (${pct(ratings.notHelpful, ratings.rated)} of ratings)`);
    if (ratings.notHelpfulReasons.length) console.log(`  Not-helpful reasons ${ratings.notHelpfulReasons.map((r) => `${r.reason} x${r.n}`).join("; ")}`);
    console.log(`  Fell back to a saved card because the model failed   ${answers.fallback} (${pct(answers.fallback, totals.answers)})`);
    console.log(`  Answers interrupted mid-stream                        ${answers.interrupted}`);
    console.log(`  Withheld by the output safety check                   ${answers.withheldBySafetyCheck}`);
    console.log(`  Search found little (confidence < 0.3)                ${out.lowConfidence.low} of ${out.lowConfidence.of} (${pct(out.lowConfidence.low, out.lowConfidence.of)})  <- topics to write cards for`);
    console.log(`  Corrections                                           ${out.corrections.raisedInPeriod} raised, ${out.corrections.resolvedInPeriod} resolved in the period, ${out.corrections.openNow} open now`);
    console.log(`\nSafety events   ${out.safetyEvents.length ? out.safetyEvents.map((s) => `${s.kind} x${s.n}`).join(", ") : "none"}`);
    console.log(`Answer time     p50 ${out.latencyMs.p50 ?? "-"} ms, p95 ${out.latencyMs.p95 ?? "-"} ms (${out.latencyMs.answers} answers; whole answer, not first word)`);
    if (out.model) {
      console.log(`Model calls     ${out.model.calls}, ${out.model.failures} failed, cost ${out.model.costUsd === null ? "not recorded" : `$${out.model.costUsd}`}${out.model.costPer1000AnswersUsd === null ? "" : ` ($${out.model.costPer1000AnswersUsd} per 1,000 answers)`}`);
    }
    console.log(`Contributions   ${out.communityContributions} language entries submitted by the community`);
    console.log(`\nNot measured here: learning, trust, scam recognition. Those come from the educator-run before/after check (docs/program/pilot-plan.md).`);
  }

  if (wantSamples) {
    console.log(`\n--- Samples for reviewers (unhelpful or flagged answers only). Handle as sensitive. ---`);
    const { rows } = await pool.query<{ q: string | null; a: string; why: string }>(
      `SELECT (SELECT content FROM chat_messages u WHERE u.session_id = a.session_id AND u.role = 'user' AND u.created_at < a.created_at ORDER BY u.created_at DESC LIMIT 1) AS q,
              a.content AS a,
              coalesce((SELECT 'rated not helpful: ' || coalesce(f.reason, 'no reason') FROM message_feedback f WHERE f.message_id = a.id AND f.rating = 'not_helpful' LIMIT 1), 'flag: ' || a.safety_flag) AS why
       FROM chat_messages a
       WHERE a.role = 'assistant' AND a.created_at >= $1::timestamptz
         AND (EXISTS (SELECT 1 FROM message_feedback f WHERE f.message_id = a.id AND f.rating = 'not_helpful') OR a.safety_flag LIKE 'output_safety_%')
       ORDER BY a.created_at DESC LIMIT 25`,
      [out.scope.from],
    );
    if (!rows.length) console.log("(none)");
    for (const r of rows) console.log(`\n[${r.why}]\nQ: ${(r.q ?? "").slice(0, 300)}\nA: ${r.a.replace(/\n+/g, " ").slice(0, 500)}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
