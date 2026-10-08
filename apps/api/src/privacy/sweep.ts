import type { PrivacyStore } from "./store.js";
import type { Retention } from "./retention.js";

/**
 * Runs the retention sweep at start-up and then every hour (docs/features/F-002-privacy-settings.md).
 * "none" and "keep" still sweep, for the text attached to long-resolved reports. A failed sweep is logged
 * and retried on the next tick; it never stops the server.
 */
export function startRetentionSweep(
  store: PrivacyStore,
  retention: Retention,
  opts: { intervalMs?: number; log?: (msg: string) => void } = {},
): () => void {
  const log = opts.log ?? ((m: string) => console.log(m));
  const days = retention.mode === "days" ? retention.days : null;
  const run = async () => {
    try {
      const r = await store.sweep(days);
      if (r.messagesEmptied || r.reportsCleared) log(`[retention] emptied ${r.messagesEmptied} message(s), cleared ${r.reportsCleared} report(s)`);
    } catch (err) {
      log(`[retention] sweep failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  void run();
  const timer = setInterval(() => void run(), opts.intervalMs ?? 60 * 60 * 1000);
  timer.unref?.();
  return () => clearInterval(timer);
}
