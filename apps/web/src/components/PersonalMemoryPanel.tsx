import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n.js";
import { memoryRequest, type MemoryItem, type MemoryState, type MemorySubmission } from "../lib/memory.js";
import { getLearnerIdentity } from "../lib/learnerSession.js";

function NoteEditor({ item, busy, onSave, onDelete, onShare }: { item: MemoryItem; busy: boolean; onSave: (content: string, remote: boolean) => void; onDelete: () => void; onShare: () => void }) {
  const { t } = useI18n();
  const [content, setContent] = useState(item.content);
  const [remote, setRemote] = useState(item.allow_remote);
  const [consent, setConsent] = useState(false);
  const unchanged = content === item.content && remote === item.allow_remote;
  return <article className="memory-note">
    <label className="form-field">{t("memory.note")}<textarea value={content} maxLength={500} onChange={(e) => setContent(e.target.value)} disabled={busy} /></label>
    <label><input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} disabled={busy} /> {t("memory.remote")}</label>
    <div className="memory-actions"><button className="button button-outline" disabled={busy || !content.trim() || unchanged} onClick={() => onSave(content, remote)}>{t("memory.save")}</button>
      <button className="button button-ghost" disabled={busy} onClick={onDelete}>{t("memory.delete")}</button></div>
    <label><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={busy} /> {t("memory.shareConsent")}</label>
    <button className="button button-outline" disabled={busy || !consent || !unchanged} onClick={() => { setConsent(false); onShare(); }}>{t("memory.submit")}</button>
  </article>;
}
export function PersonalMemoryPanel() {
  const { t } = useI18n(); const [open, setOpen] = useState(false);
  return <details className="personal-memory" onToggle={(e) => setOpen(e.currentTarget.open)}><summary>{t("memory.title")}</summary>{open && <MemoryContents />}</details>;
}
function MemoryContents() {
  const { t } = useI18n();
  const [state, setState] = useState<MemoryState | null>(null);
  const [submissions, setSubmissions] = useState<MemorySubmission[]>([]);
  const [queue, setQueue] = useState<MemorySubmission[] | null>(null);
  const [busy, setBusy] = useState(true); const [failed, setFailed] = useState(false);
  const [content, setContent] = useState(""); const [remote, setRemote] = useState(false);
  const load = async () => {
    const [next, own] = await Promise.all([memoryRequest<MemoryState>(), memoryRequest<{ submissions: MemorySubmission[] }>("/submissions")]);
    setState(next); setSubmissions(own.submissions);
  };
  useEffect(() => {
    let active = true;
    void Promise.all([memoryRequest<MemoryState>(), memoryRequest<{ submissions: MemorySubmission[] }>("/submissions")])
      .then(([next, own]) => { if (active) { setState(next); setSubmissions(own.submissions); } })
      .catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);
  const perform = async (action: () => Promise<unknown>) => {
    if (busy) return; setBusy(true); setFailed(false);
    try { await action(); await load(); if (queue !== null) setQueue((await memoryRequest<{ submissions: MemorySubmission[] }>("", "GET", undefined, true)).submissions); }
    catch { setFailed(true); } finally { setBusy(false); }
  };
  return <section aria-label={t("memory.title")} aria-busy={busy}>
    <p>{t("memory.explanation")}</p><p>{t("memory.historyWarning")}</p>
    {failed && <p role="alert">{t("memory.error")}</p>}
    <button className="button button-ghost" disabled={busy} onClick={() => void perform(async () => { })}>{t("memory.refresh")}</button>
    {state && <>
      <label><input type="checkbox" checked={state.enabled} disabled={busy} onChange={(e) => {
        const enabled = e.target.checked, previous = state;
        setState({ ...state, enabled });
        void perform(async () => { try { await memoryRequest("", "PATCH", { enabled }); } catch (error) { setState(previous); throw error; } });
      }} /> {t("memory.enable")}</label>
      {!state.localAvailable && <p role="status">{t("memory.localUnavailable")}</p>}
      {state.items.map((item) => <NoteEditor key={`${item.id}:${item.version}`} item={item} busy={busy}
        onSave={(text, allowRemote) => void perform(() => memoryRequest(`/items/${item.id}`, "PATCH", { content: text, allowRemote, version: item.version }))}
        onDelete={() => void perform(() => memoryRequest(`/items/${item.id}`, "DELETE"))}
        onShare={() => void perform(() => memoryRequest(`/items/${item.id}/submit`, "POST", { version: item.version, consentToReview: true }))} />)}
      <form onSubmit={(e) => { e.preventDefault(); void perform(async () => { await memoryRequest("/items", "POST", { content, allowRemote: remote }); setContent(""); setRemote(false); }); }}>
        <label className="form-field">{t("memory.newNote")}<textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={500} required disabled={busy || !state.enabled} /></label>
        <label><input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} disabled={busy || !state.enabled} /> {t("memory.remote")}</label>
        <button className="button button-outline" disabled={busy || !state.enabled || !content.trim() || state.items.length >= 20}>{t("memory.save")}</button>
      </form>
      <button className="button button-ghost" disabled={busy || !state.items.length} onClick={() => void perform(() => memoryRequest("", "DELETE"))}>{t("memory.deleteAll")}</button>
      <h3>{t("memory.submissions")}</h3>
      {!submissions.length && <p>{t("memory.noSubmissions")}</p>}
      {submissions.map((s) => <article className="memory-note" key={s.id}><p className="memory-content">{s.content}</p><p>{t(`memory.status.${s.status}`)}</p>
        {s.status !== "withdrawn" && <button className="button button-ghost" disabled={busy} onClick={() => void perform(() => memoryRequest(`/submissions/${s.id}`, "DELETE"))}>{t("memory.withdraw")}</button>}</article>)}
      {state.canReview && <>
        <button className="button button-outline" disabled={busy} onClick={() => void perform(async () => setQueue((await memoryRequest<{ submissions: MemorySubmission[] }>("", "GET", undefined, true)).submissions))}>{t("memory.review")}</button>
        {queue && <><h3>{t("memory.review")}</h3><p>{t("memory.twoReviewers")}</p>{!queue.length && <p>{t("memory.noSubmissions")}</p>}
          {queue.map((s) => <article className="memory-note" key={s.id}><p className="memory-content">{s.content}</p>
            {s.first_approval_by && <p>{t("memory.firstApproval")}</p>}
            {(["approve", "reject"] as const).map((decision) => <button key={decision} className="button button-outline" disabled={busy || s.submitted_by === getLearnerIdentity()?.id || (decision === "approve" && s.first_approval_by === getLearnerIdentity()?.id)} onClick={() => void perform(() => memoryRequest(`/${s.id}/decide`, "POST", { decision }, true))}>{t(`memory.${decision}`)}</button>)}
          </article>)}</>}
      </>}
    </>}
  </section>;
}
