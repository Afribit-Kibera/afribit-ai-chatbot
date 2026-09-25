/**
 * Buffers streamed text deltas up to the last complete sentence boundary
 * before emitting, so a deterministic text transform (postProcess.ts) can
 * run on complete sentences rather than arbitrary token chunks -- a phrase
 * like "Kwa hivyo" could otherwise be split across two separate deltas and
 * missed entirely. Trades a small amount of latency (waiting for a sentence
 * to finish, typically a handful of words) for correctness; still streams
 * progressively sentence-by-sentence rather than buffering the whole
 * response, so the UX benefit of streaming is mostly preserved.
 */
export function createSentenceBuffer(emit: (text: string) => void, transform: (text: string) => string) {
  let buffer = "";

  return {
    push(chunk: string): void {
      buffer += chunk;
      const boundary = /[.!?\n]\s+/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = boundary.exec(buffer)) !== null) {
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex > 0) {
        const complete = buffer.slice(0, lastIndex);
        buffer = buffer.slice(lastIndex);
        emit(transform(complete));
      }
    },
    flush(): void {
      if (buffer.length > 0) {
        emit(transform(buffer));
        buffer = "";
      }
    },
  };
}
