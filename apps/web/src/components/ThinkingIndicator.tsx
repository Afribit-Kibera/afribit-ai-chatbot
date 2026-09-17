/**
 * Cheap CSS-only feedback for the short gap before the first streamed token.
 * Once text starts streaming, the response itself becomes the progress state.
 */
export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 py-1 pl-10" role="status" aria-label="Afribit AI is preparing a response">
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-bg-muted">
        <span className="absolute inset-y-0 left-0 w-7 rounded-full bg-bitcoin animate-thinking-line" />
      </span>
      <span className="text-xs text-text-muted">Afribit inaandika...</span>
    </div>
  );
}
