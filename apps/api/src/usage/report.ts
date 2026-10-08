import { pool } from "../db/pool.js";

/**
 * What the model calls cost and how often they fail, from the model_runs table the gateway fills.
 *
 *   pnpm --filter @afribit/api usage:report [--days 7] [--prices] [--pack <id>]
 *
 * Cost is what the provider billed when it reported it (hosted, non-streaming). Rows without a cost
 * (streamed answers) are estimated from OpenRouter's public price list with --prices. Local models
 * report zero. The figures are for budgeting and grant reporting, not invoices.
 *
 * One server can serve several community packs; the report is split by pack, and --pack limits it to one.
 * Calls recorded before multi-pack support carry no pack and show as "-".
 */

interface Row {
  pack_id: string | null;
  profile: string | null;
  provider: string | null;
  model: string | null;
  calls: string;
  failures: string;
  prompt_tokens: string;
  completion_tokens: string;
  billed_usd: string | null;
  unpriced_prompt: string;
  unpriced_completion: string;
  avg_latency_ms: string | null;
}

async function livePrices(): Promise<Map<string, { prompt: number; completion: number }>> {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`price list unavailable (HTTP ${res.status})`);
  const data = (await res.json()) as { data: { id: string; pricing?: { prompt?: string; completion?: string } }[] };
  const out = new Map<string, { prompt: number; completion: number }>();
  for (const m of data.data) out.set(m.id, { prompt: Number(m.pricing?.prompt ?? 0), completion: Number(m.pricing?.completion ?? 0) });
  return out;
}

const n = (v: string | null | undefined): number => Number(v ?? 0);
const usd = (v: number): string => `$${v.toFixed(v < 1 ? 4 : 2)}`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dIdx = args.indexOf("--days");
  const days = dIdx >= 0 ? Math.max(1, Number(args[dIdx + 1]) || 7) : 7;
  const wantPrices = args.includes("--prices");
  const pIdx = args.indexOf("--pack");
  const pack = pIdx >= 0 ? args[pIdx + 1] : undefined;
  if (pIdx >= 0 && (!pack || pack.startsWith("--"))) throw new Error("usage: --pack <id>");

  const { rows } = await pool.query<Row>(
    `SELECT pack_id, profile, provider, model,
            count(*) AS calls,
            count(*) FILTER (WHERE status <> 'ok') AS failures,
            coalesce(sum(prompt_tokens), 0) AS prompt_tokens,
            coalesce(sum(completion_tokens), 0) AS completion_tokens,
            sum(estimated_cost_usd) AS billed_usd,
            coalesce(sum(prompt_tokens) FILTER (WHERE status = 'ok' AND estimated_cost_usd IS NULL), 0) AS unpriced_prompt,
            coalesce(sum(completion_tokens) FILTER (WHERE status = 'ok' AND estimated_cost_usd IS NULL), 0) AS unpriced_completion,
            round(avg(latency_ms) FILTER (WHERE status = 'ok')) AS avg_latency_ms
     FROM model_runs
     WHERE created_at > now() - ($1 || ' days')::interval
       AND ($2::text IS NULL OR pack_id = $2)
     GROUP BY pack_id, profile, provider, model
     ORDER BY pack_id NULLS FIRST, count(*) DESC`,
    [String(days), pack ?? null],
  );
  const { rows: answers } = await pool.query<{ n: string }>(
    `SELECT count(*) AS n FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id
     WHERE m.role = 'assistant' AND m.created_at > now() - ($1 || ' days')::interval AND ($2::text IS NULL OR s.pack_id = $2)`,
    [String(days), pack ?? null],
  );

  if (rows.length === 0) {
    console.log(`No model calls recorded in the last ${days} day(s)${pack ? ` for pack ${pack}` : ""}. (Metering began with this release; older answers are in chat_messages only.)`);
    return;
  }

  let prices: Map<string, { prompt: number; completion: number }> | null = null;
  if (wantPrices) {
    try {
      prices = await livePrices();
    } catch (err) {
      console.log(`(could not fetch prices: ${(err as Error).message}; showing billed cost only)\n`);
    }
  }

  console.log(`Model usage, last ${days} day(s)${pack ? `, pack ${pack}` : ""}\n`);
  console.log("pack".padEnd(20) + "profile".padEnd(24) + "model".padEnd(40) + "calls".padStart(7) + "fail".padStart(6) + "  tokens in/out".padEnd(20) + "cost".padStart(10) + "  avg ms");
  let total = 0;
  let totalCalls = 0;
  let unpricedModels = 0;
  for (const r of rows) {
    const billed = n(r.billed_usd);
    let estimated = 0;
    const price = prices?.get(r.model ?? "");
    if (price && (n(r.unpriced_prompt) > 0 || n(r.unpriced_completion) > 0)) estimated = n(r.unpriced_prompt) * price.prompt + n(r.unpriced_completion) * price.completion;
    else if (r.provider !== "local" && (n(r.unpriced_prompt) > 0 || n(r.unpriced_completion) > 0)) unpricedModels++;
    const cost = billed + estimated;
    total += cost;
    totalCalls += n(r.calls);
    console.log(
      `${(r.pack_id ?? "-").slice(0, 18).padEnd(20)}${(r.profile ?? "-").padEnd(24)}${(r.model ?? "-").slice(0, 38).padEnd(40)}${String(n(r.calls)).padStart(7)}${String(n(r.failures)).padStart(6)}  ${`${n(r.prompt_tokens)}/${n(r.completion_tokens)}`.padEnd(18)}${usd(cost).padStart(10)}  ${r.avg_latency_ms ?? "-"}${estimated > 0 ? "  (partly estimated)" : ""}`,
    );
  }
  const a = n(answers[0]?.n);
  console.log(`\nTotal: ${totalCalls} model calls, ${usd(total)}${a > 0 ? `; ${a} answers, about ${usd((total / a) * 1000)} per 1,000 answers` : ""}.`);
  if (unpricedModels > 0) console.log(`${unpricedModels} model(s) had calls without a billed cost (streamed answers). Run with --prices to estimate them.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
