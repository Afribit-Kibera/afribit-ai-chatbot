/**
 * A nod to the logo's Lightning-mesh motif while waiting for a response.
 * Plain CSS animation (see `animate-pulse-node` in index.css), not anime.js —
 * an infinite per-message loop should stay as cheap as possible on low-end
 * Android (PRD §27.1), and CSS keyframes cost less than a JS-driven loop.
 * anime.js is used instead for the one-shot entrance animations where its
 * orchestration (stagger, timelines) actually earns its cost.
 */
export function ThinkingIndicator() {
  const nodes = [0, 1, 2, 3];
  return (
    <div className="flex items-center gap-2 py-1" role="status" aria-label="Afribit AI is thinking">
      <svg width="56" height="16" viewBox="0 0 56 16" className="shrink-0">
        <line x1="6" y1="8" x2="50" y2="8" stroke="var(--border-strong)" strokeWidth="1" />
        {nodes.map((i) => (
          <circle
            key={i}
            cx={6 + i * (44 / 3)}
            cy="8"
            r="3.5"
            fill="var(--bitcoin)"
            className="animate-pulse-node"
            style={{ animationDelay: `${i * 180}ms`, transformOrigin: `${6 + i * (44 / 3)}px 8px` }}
          />
        ))}
      </svg>
      <span className="text-xs text-text-muted">Afribit AI is thinking…</span>
    </div>
  );
}
