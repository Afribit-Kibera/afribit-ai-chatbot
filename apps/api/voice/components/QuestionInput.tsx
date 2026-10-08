/** Composer adapted from Kokonut UI AI Input Search, MIT (LICENSE.kokonut).
 * https://kokonutui.com/r/ai-input-search.json
 * Uses its autoresizing input pattern with the supported Voice Lab actions.
 */
import { useEffect } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { useAutoResizeTextarea } from "./useAutoResizeTextarea";

export function QuestionInput({ value, onChange, onSubmit, busy, compare }:
  { value: string; onChange: (value: string) => void; onSubmit: () => void; busy: boolean; compare: boolean }) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 58, maxHeight: 180 });
  useEffect(() => { adjustHeight(); }, [value, adjustHeight]);
  return <form className="question-form" onSubmit={e => { e.preventDefault(); if (!busy && value.trim()) onSubmit(); }}>
    <label htmlFor="question">Ask a question</label>
    <div className="question-composer">
      <textarea ref={textareaRef} id="question" value={value} maxLength={500} rows={2}
        placeholder="Ask something a learner might ask…" onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
          e.preventDefault(); if (!busy && value.trim()) onSubmit();
        } }} aria-describedby="question-note" />
      <div className="composer-footer"><span className="small muted">{value.length ? `${value.length}/500` : ""}</span>
        <button className="button primary" disabled={busy || !value.trim()} type="submit">
          {busy ? <LoaderCircle className="spin" size={19} /> : <Send size={19} />}
          {busy ? "Getting an answer…" : compare ? "Compare answers" : "Try this question"}
        </button></div>
    </div>
    <p id="question-note" className="small muted">{compare ? "Compares two answers. Tests do not save a chat." : "Tests do not save a chat."}</p>
  </form>;
}
