import { AlertCircle, FileText, ShieldCheck } from "lucide-react";
import type { PreviewAnswer } from "../types";

export function Answer({ answer }: { answer: PreviewAnswer }) {
  const safety = { secret: "This question looked like it contained a password, PIN or recovery phrase. It was not sent to a model.",
    output_safety: "The safety check withheld the model’s answer. This is the message a learner would see.",
    ungrounded: "The grounding check replaced the model’s answer because it included details absent from the knowledge provided." };
  return <div className="answer-result">
    {answer.error ? <div className="notice error" role="alert"><AlertCircle size={18} /><span>The model could not answer: {answer.error}</span></div>
      : <div className="answer-text">{answer.answer}</div>}
    {answer.blocked && <div className="notice"><ShieldCheck size={18} /><span>{safety[answer.blocked]}</span></div>}
    <details className="answer-details"><summary><FileText size={16} /> Knowledge and test details</summary>
      <div className="details-body"><h4>Knowledge cards found</h4>
        {answer.cardIds.length ? <ul>{answer.cardIds.map(id => <li key={id}><code>{id}</code></li>)}</ul>
          : <p>No cards matched. The assistant was told that no reviewed knowledge was found.</p>}
        {answer.ungrounded?.length > 0 && <p>Check these details against the cards: {answer.ungrounded.join(", ")}</p>}
        <p className="small muted">{answer.promptMode} prompt · about {answer.promptTokensApprox} tokens · {answer.model || answer.modelProfile} · {(answer.latencyMs / 1000).toFixed(1)} s</p>
        {answer.systemPrompt && <details><summary>Instructions sent to the model</summary><pre>{answer.systemPrompt}
          {answer.turns.map((turn, i) => <span key={i}>{`\n\n[${turn.role}]\n${turn.content}`}</span>)}</pre></details>}
        {answer.rawAnswer && <details><summary>Answer before the safety checks</summary><pre>{answer.rawAnswer}</pre></details>}
      </div>
    </details>
  </div>;
}
