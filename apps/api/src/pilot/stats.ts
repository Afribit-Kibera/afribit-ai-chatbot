import { pool } from "../db/pool.js";
import { counts as backlogCounts } from "../review/service.js";
import { NO_SOURCE } from "./source.js";

/**
 * Pilot measurements from the database the service already keeps (the pilot console and `pnpm pilot:report`).
 * Aggregates only: nothing here returns a question, an answer or anything that identifies a person.
 *
 * Days are calendar days in Nairobi time (the program's day), so "last 7 days" is today plus the six days
 * before it, and the per-day series adds up to the totals.
 *
 * What it can and cannot show:
 *   - Anonymous chat has no person identity, so there is no count of unique people. A session is one
 *     conversation on one browser; the same person on another day or device is another session.
 *   - Answer time is the whole answer, not time to first word (first-word time is not recorded).
 *   - It does NOT show learning, trust or scam recognition. Those need the educator-run before/after check
 *     (docs/program/pilot-plan.md). Do not present these numbers as impact.
 *   - Model calls, cost and failures are for the pack and period, not per channel (failed calls cannot be
 *     tied to a channel), so they are left out when a channel filter is set.
 */

export const PILOT_TZ = "Africa/Nairobi";

export interface StatsOptions {
  days: number;
  /** A channel label, NO_SOURCE for conversations without one, or null for all channels. */
  source: string | null;
  /** The pack to report on; null for every pack (the command line). */
  packId: string | null;
  /** The pack that rows with a NULL pack_id belong to. */
  defaultPackId: string;
}

export interface PilotStats {
  generatedAt: string;
  scope: { days: number; from: string; source: string | null; pack: string | null; timezone: string };
  totals: { sessions: number; engagedSessions: number; questions: number; answers: number };
  perDay: { day: string; sessions: number; questions: number; helpful: number; notHelpful: number }[];
  channels: { source: string | null; sessions: number; questions: number; helpful: number; notHelpful: number }[];
  languageModes: { mode: string; sessions: number }[];
  ratings: { rated: number; helpful: number; notHelpful: number; notHelpfulReasons: { reason: string; n: number }[] };
  answers: { fallback: number; interrupted: number; withheldBySafetyCheck: number };
  safetyEvents: { kind: string; n: number }[];
  latencyMs: { p50: number | null; p95: number | null; answers: number };
  lowConfidence: { low: number; of: number };
  /** Null when a channel filter is set. */
  model: { calls: number; failures: number; costUsd: number | null; costPer1000AnswersUsd: number | null } | null;
  reviewBacklog: Record<string, number>;
  corrections: { raisedInPeriod: number; resolvedInPeriod: number; openNow: number };
  communityContributions: number;
}

const n = (v: unknown): number => Number(v ?? 0);
const DAY = (col: string) => `to_char(${col} AT TIME ZONE '${PILOT_TZ}', 'YYYY-MM-DD')`;
/** Rows of a session `s` that belong to the requested pack and channel. Parameters: $2 pack, $3 default pack, $4 source. */
const SESSION_FILTER = `($2::text IS NULL OR coalesce(s.pack_id, $3::text) = $2::text)
  AND ($4::text IS NULL OR (CASE WHEN $4::text = '${NO_SOURCE}' THEN s.source IS NULL ELSE s.source = $4::text END))`;

/** First instant of the first day in the window, as an ISO string. */
async function windowStart(days: number): Promise<string> {
  const { rows } = await pool.query<{ since: Date }>(
    `SELECT (date_trunc('day', now() AT TIME ZONE '${PILOT_TZ}') - ($1::int - 1) * interval '1 day') AT TIME ZONE '${PILOT_TZ}' AS since`,
    [days],
  );
  return rows[0]!.since.toISOString();
}

export async function getPilotStats(opts: StatsOptions): Promise<PilotStats> {
  const since = await windowStart(opts.days);
  const p = [since, opts.packId, opts.defaultPackId, opts.source];
  const q = async <T extends object>(sql: string, params: unknown[] = p): Promise<T[]> => (await pool.query<T>(sql, params)).rows;
  const one = async <T extends object>(sql: string, params: unknown[] = p): Promise<T> => (await q<T>(sql, params))[0] as T;

  const totals = await one<{ sessions: string; engaged: string; questions: string; answers: string }>(`
    SELECT
      (SELECT count(*) FROM chat_sessions s WHERE s.created_at >= $1::timestamptz AND ${SESSION_FILTER}) AS sessions,
      (SELECT count(*) FROM chat_sessions s WHERE s.created_at >= $1::timestamptz AND ${SESSION_FILTER}
         AND (SELECT count(*) FROM chat_messages m WHERE m.session_id = s.id AND m.role = 'user') >= 2) AS engaged,
      (SELECT count(*) FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.role = 'user' AND m.created_at >= $1::timestamptz AND ${SESSION_FILTER}) AS questions,
      (SELECT count(*) FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.role = 'assistant' AND m.created_at >= $1::timestamptz AND ${SESSION_FILTER}) AS answers`);

  const perDay = await q<{ day: string; sessions: string; questions: string; helpful: string; not_helpful: string }>(`
    WITH days AS (
      SELECT d::date AS d FROM generate_series(($1::timestamptz AT TIME ZONE '${PILOT_TZ}')::date, (now() AT TIME ZONE '${PILOT_TZ}')::date, interval '1 day') AS d
    )
    SELECT to_char(d, 'YYYY-MM-DD') AS day,
      (SELECT count(*) FROM chat_sessions s WHERE s.created_at >= $1::timestamptz AND (s.created_at AT TIME ZONE '${PILOT_TZ}')::date = d AND ${SESSION_FILTER}) AS sessions,
      (SELECT count(*) FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.role = 'user' AND m.created_at >= $1::timestamptz AND (m.created_at AT TIME ZONE '${PILOT_TZ}')::date = d AND ${SESSION_FILTER}) AS questions,
      (SELECT count(*) FROM message_feedback f JOIN chat_messages m ON m.id = f.message_id JOIN chat_sessions s ON s.id = m.session_id
         WHERE f.rating = 'helpful' AND f.created_at >= $1::timestamptz AND (f.created_at AT TIME ZONE '${PILOT_TZ}')::date = d AND ${SESSION_FILTER}) AS helpful,
      (SELECT count(*) FROM message_feedback f JOIN chat_messages m ON m.id = f.message_id JOIN chat_sessions s ON s.id = m.session_id
         WHERE f.rating = 'not_helpful' AND f.created_at >= $1::timestamptz AND (f.created_at AT TIME ZONE '${PILOT_TZ}')::date = d AND ${SESSION_FILTER}) AS not_helpful
    FROM days ORDER BY d`);

  // Per channel: sessions started in the window; questions and ratings made in the window.
  const channelMap = new Map<string | null, PilotStats["channels"][number]>();
  const channel = (source: string | null) => {
    let c = channelMap.get(source);
    if (!c) channelMap.set(source, (c = { source, sessions: 0, questions: 0, helpful: 0, notHelpful: 0 }));
    return c;
  };
  for (const r of await q<{ source: string | null; k: string }>(`SELECT s.source, count(*) AS k FROM chat_sessions s WHERE s.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1`)) channel(r.source).sessions = n(r.k);
  for (const r of await q<{ source: string | null; k: string }>(`SELECT s.source, count(*) AS k FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id WHERE m.role = 'user' AND m.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1`)) channel(r.source).questions = n(r.k);
  for (const r of await q<{ source: string | null; rating: string; k: string }>(`SELECT s.source, f.rating, count(*) AS k FROM message_feedback f JOIN chat_messages m ON m.id = f.message_id JOIN chat_sessions s ON s.id = m.session_id WHERE f.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1, 2`)) {
    if (r.rating === "helpful") channel(r.source).helpful = n(r.k);
    else channel(r.source).notHelpful = n(r.k);
  }
  const channels = [...channelMap.values()].sort((a, b) => b.questions - a.questions || b.sessions - a.sessions || String(a.source).localeCompare(String(b.source)));

  const languageModes = (await q<{ mode: string; k: string }>(`SELECT s.language_mode AS mode, count(*) AS k FROM chat_sessions s WHERE s.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1 ORDER BY 2 DESC`)).map((r) => ({ mode: r.mode, sessions: n(r.k) }));

  const ratings = await one<{ helpful: string; not_helpful: string }>(`
    SELECT count(*) FILTER (WHERE f.rating = 'helpful') AS helpful, count(*) FILTER (WHERE f.rating = 'not_helpful') AS not_helpful
    FROM message_feedback f JOIN chat_messages m ON m.id = f.message_id JOIN chat_sessions s ON s.id = m.session_id
    WHERE f.created_at >= $1::timestamptz AND ${SESSION_FILTER}`);
  const reasons = (await q<{ reason: string; k: string }>(`
    SELECT coalesce(f.reason, '(none given)') AS reason, count(*) AS k
    FROM message_feedback f JOIN chat_messages m ON m.id = f.message_id JOIN chat_sessions s ON s.id = m.session_id
    WHERE f.rating = 'not_helpful' AND f.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1 ORDER BY 2 DESC LIMIT 8`)).map((r) => ({ reason: r.reason, n: n(r.k) }));

  const answerFlags = await one<{ fallbacks: string; interrupted: string; withheld: string; low: string; scored: string; lat_n: string; p50: string | null; p95: string | null }>(`
    SELECT
      count(*) FILTER (WHERE m.safety_flag IN ('provider_failure', 'unknown_error')) AS fallbacks,
      count(*) FILTER (WHERE m.safety_flag = 'stream_interrupted') AS interrupted,
      count(*) FILTER (WHERE m.safety_flag LIKE 'output_safety_%') AS withheld,
      count(*) FILTER (WHERE m.retrieval_confidence < 0.3) AS low,
      count(*) FILTER (WHERE m.retrieval_confidence IS NOT NULL) AS scored,
      count(*) FILTER (WHERE m.latency_ms IS NOT NULL) AS lat_n,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY m.latency_ms) AS p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY m.latency_ms) AS p95
    FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id
    WHERE m.role = 'assistant' AND m.created_at >= $1::timestamptz AND ${SESSION_FILTER}`);

  const safetyEvents = (await q<{ kind: string; k: string }>(`
    SELECT e.kind, count(*) AS k FROM safety_events e JOIN chat_sessions s ON s.id = e.session_id
    WHERE e.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1 ORDER BY 2 DESC`)).map((r) => ({ kind: r.kind, n: n(r.k) }));

  let model: PilotStats["model"] = null;
  if (opts.source === null) {
    const m = await one<{ calls: string; usd: string | null; failures: string }>(
      `SELECT count(*) AS calls, sum(estimated_cost_usd) AS usd, count(*) FILTER (WHERE status <> 'ok') AS failures
       FROM model_runs r WHERE r.created_at >= $1::timestamptz AND ($2::text IS NULL OR coalesce(r.pack_id, $3::text) = $2::text)`,
      p.slice(0, 3),
    );
    const exact = m.usd === null ? null : Number(m.usd);
    const answers = n(totals.answers);
    model = {
      calls: n(m.calls),
      failures: n(m.failures),
      costUsd: exact === null ? null : Number(exact.toFixed(4)),
      // From the unrounded total, so a small pilot's per-1,000 figure is not distorted by rounding.
      costPer1000AnswersUsd: exact !== null && answers > 0 ? Number(((exact / answers) * 1000).toFixed(4)) : null,
    };
  }

  const correction = await one<{ raised: string; resolved: string; open_now: string }>(`
    SELECT
      count(*) FILTER (WHERE f.created_at >= $1::timestamptz) AS raised,
      count(*) FILTER (WHERE f.reviewed_at >= $1::timestamptz) AS resolved,
      count(*) FILTER (WHERE f.reviewed_at IS NULL) AS open_now
    FROM message_feedback f JOIN chat_messages m ON m.id = f.message_id JOIN chat_sessions s ON s.id = m.session_id
    WHERE f.rating = 'not_helpful' AND ${SESSION_FILTER}`);

  const contributions = await one<{ k: string }>(
    `SELECT count(*) AS k FROM language_entries
     WHERE source_type = 'afribit_microtask' AND created_at >= $1::timestamptz AND ($2::text IS NULL OR coalesce(pack_id, $3::text) = $2::text)`,
    p.slice(0, 3),
  );

  const notHelpful = n(ratings.not_helpful);
  const helpful = n(ratings.helpful);
  return {
    generatedAt: new Date().toISOString(),
    scope: { days: opts.days, from: since, source: opts.source, pack: opts.packId, timezone: PILOT_TZ },
    totals: { sessions: n(totals.sessions), engagedSessions: n(totals.engaged), questions: n(totals.questions), answers: n(totals.answers) },
    perDay: perDay.map((r) => ({ day: r.day, sessions: n(r.sessions), questions: n(r.questions), helpful: n(r.helpful), notHelpful: n(r.not_helpful) })),
    channels,
    languageModes,
    ratings: { rated: helpful + notHelpful, helpful, notHelpful, notHelpfulReasons: reasons },
    answers: { fallback: n(answerFlags.fallbacks), interrupted: n(answerFlags.interrupted), withheldBySafetyCheck: n(answerFlags.withheld) },
    safetyEvents,
    latencyMs: { p50: answerFlags.p50 === null ? null : Math.round(n(answerFlags.p50)), p95: answerFlags.p95 === null ? null : Math.round(n(answerFlags.p95)), answers: n(answerFlags.lat_n) },
    lowConfidence: { low: n(answerFlags.low), of: n(answerFlags.scored) },
    model,
    reviewBacklog: await backlogCounts(),
    corrections: { raisedInPeriod: n(correction.raised), resolvedInPeriod: n(correction.resolved), openNow: n(correction.open_now) },
    communityContributions: n(contributions.k),
  };
}

/** One row of the shareable daily export: counts per day and channel. Never any text. */
export interface DailyRow {
  day: string;
  source: string;
  sessions: number;
  questions: number;
  helpful: number;
  notHelpful: number;
  fallbacks: number;
  safetyEvents: number;
}

/** Label used in the export for conversations that arrived without a channel label. */
export const DIRECT_LABEL = "direct";

export async function getDailyAggregates(opts: { days: number; packId: string; defaultPackId: string }): Promise<DailyRow[]> {
  const since = await windowStart(opts.days);
  const p = [since, opts.packId, opts.defaultPackId, null];
  const rows = new Map<string, DailyRow>();
  const row = (day: string, source: string | null): DailyRow => {
    const key = `${day}\u0000${source ?? ""}`;
    let r = rows.get(key);
    if (!r) rows.set(key, (r = { day, source: source ?? DIRECT_LABEL, sessions: 0, questions: 0, helpful: 0, notHelpful: 0, fallbacks: 0, safetyEvents: 0 }));
    return r;
  };
  const run = async (sql: string, apply: (r: DailyRow, k: number) => void) => {
    for (const r of (await pool.query<{ day: string; source: string | null; k: string }>(sql, p)).rows) apply(row(r.day, r.source), n(r.k));
  };
  await run(`SELECT ${DAY("s.created_at")} AS day, s.source, count(*) AS k FROM chat_sessions s WHERE s.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1, 2`, (r, k) => (r.sessions = k));
  await run(`SELECT ${DAY("m.created_at")} AS day, s.source, count(*) AS k FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id WHERE m.role = 'user' AND m.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1, 2`, (r, k) => (r.questions = k));
  await run(`SELECT ${DAY("f.created_at")} AS day, s.source, count(*) AS k FROM message_feedback f JOIN chat_messages m ON m.id = f.message_id JOIN chat_sessions s ON s.id = m.session_id WHERE f.rating = 'helpful' AND f.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1, 2`, (r, k) => (r.helpful = k));
  await run(`SELECT ${DAY("f.created_at")} AS day, s.source, count(*) AS k FROM message_feedback f JOIN chat_messages m ON m.id = f.message_id JOIN chat_sessions s ON s.id = m.session_id WHERE f.rating = 'not_helpful' AND f.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1, 2`, (r, k) => (r.notHelpful = k));
  await run(`SELECT ${DAY("m.created_at")} AS day, s.source, count(*) AS k FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id WHERE m.role = 'assistant' AND m.safety_flag IN ('provider_failure', 'unknown_error') AND m.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1, 2`, (r, k) => (r.fallbacks = k));
  // Safety events: secrets caught, answers flagged as ungrounded, and answers withheld by the output check.
  await run(`SELECT ${DAY("e.created_at")} AS day, s.source, count(*) AS k FROM safety_events e JOIN chat_sessions s ON s.id = e.session_id WHERE e.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1, 2`, (r, k) => (r.safetyEvents += k));
  await run(`SELECT ${DAY("m.created_at")} AS day, s.source, count(*) AS k FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id WHERE m.role = 'assistant' AND m.safety_flag LIKE 'output_safety_%' AND m.created_at >= $1::timestamptz AND ${SESSION_FILTER} GROUP BY 1, 2`, (r, k) => (r.safetyEvents += k));
  return [...rows.values()].sort((a, b) => a.day.localeCompare(b.day) || a.source.localeCompare(b.source));
}
