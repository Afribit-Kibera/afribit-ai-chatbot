import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Eye, EyeOff,
  FileText, History, LoaderCircle, LockKeyhole, LogOut, Pencil, Search, Settings2, Upload } from "lucide-react";
import mark from "./assets/afribit-mark-icon.png";
import { Answer } from "./components/Answer";
import { Modal } from "./components/Modal";
import { QuestionInput } from "./components/QuestionInput";
import { ApiError, draftError, fileLabel, guidePath, request, textBytes,
  type Api, type PreviewResponse, type Version, type View, type VoiceData, type VoiceFile } from "./types";

type Notice = { message: string; details?: string[]; error?: boolean };
type Action = { kind: "save" | "revert" | "restore"; path: string; version?: Version };
type DialogState = { kind: "library" | "help" | "history" | "baseline"; path?: string }
  | { kind: "action"; action: Action } | { kind: "leave"; pack?: string } | null;
const groups: Record<string, string> = { speech: "How the AI speaks", messages: "Messages people see",
  safety: "Safety rules", advanced: "Advanced settings" };
const views: { id: View; label: string }[] = [
  { id: "teach", label: "Teach the AI" }, { id: "try", label: "Try an answer" }, { id: "compare", label: "Compare answers" },
];
function stored(key: string) { try { return sessionStorage.getItem(key); } catch { return null; } }
const localPreview = document.querySelector('meta[name="voice-preview"]')?.getAttribute("content") === "true";
function when(value: string) { return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
function Status({ notice }: { notice: Notice | null }) {
  return notice && <div className={`notice ${notice.error ? "error" : "success"}`} role={notice.error ? "alert" : "status"}>
    {notice.error ? <AlertCircle size={18} /> : <Check size={18} />}
    <div>{notice.message}{notice.details?.length ? <ul>{notice.details.map((line, i) => <li key={i}>{line}</li>)}</ul> : null}</div>
  </div>;
}
function Brand() {
  return <div className="brand"><img src={mark} alt="" width={46} height={46} />
    <span className="wordmark">Afribit<span> AI</span></span><span className="product-name">Voice Lab</span></div>;
}

function Login({ onLogin, notice }: { onLogin: (token: string, name: string) => void; notice: Notice | null }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Notice | null>(null);
  return <><header className="app-header signed-out"><Brand /></header>
    <main className="login-layout"><section className="login-intro">
      <span className="eyebrow">BY THE COMMUNITY, FOR THE COMMUNITY</span>
      <h1>Help the AI<br />speak like us.</h1>
      <p>Write the instructions. Try an answer. Save the wording your community needs.</p>
      <ol className="login-steps"><li><span>01</span> Write in a language you know.</li>
        <li><span>02</span> Read the answers as a learner would.</li><li><span>03</span> Save when the wording is ready.</li></ol>
      <p className="small login-footnote">Community reviewers shape the wording.<br />The AI can still make mistakes.</p>
    </section><section className="login-form-area"><form className="login-form" onSubmit={async e => {
      e.preventDefault(); if (busy) return; setBusy(true); setError(null);
      try {
        const result = await request<{ token: string; role: string; displayName?: string }>(null, null,
          "POST", "/api/v1/auth/login", { email, password });
        if (!["reviewer", "admin"].includes(result.role) || !result.token)
          throw new Error("This account does not have access. Ask the person who runs your service for a reviewer account.");
        onLogin(result.token, result.displayName || email);
      } catch (err) { setError({ error: true, message: err instanceof Error ? err.message : "Could not sign in. Please try again." }); }
      finally { setBusy(false); }
    }}><span className="eyebrow muted">REVIEWER WORKSPACE</span><h2>Welcome to Voice Lab.</h2>
      <p className="muted">Sign in with your reviewer or administrator account.</p><Status notice={error || notice} />
      {localPreview && <p className="preview-note small">Local demo: use <strong>reviewer@example.test</strong> with password <strong>preview</strong>. Answers and saves are simulated.</p>}
      <label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="username"
        required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
      <label htmlFor="password">Password</label><div className="password-field">
        <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
          required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
        <button type="button" className="icon-button" aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
      <button className="button primary login-submit" disabled={busy}>{busy && <LoaderCircle size={18} className="spin" />}{busy ? "Signing in…" : "Sign in"}</button>
      <p className="small muted">Need access? Ask the person who runs your community’s service to add you as a reviewer.</p>
    </form></section></main></>;
}

function HistoryList({ api, path, canEdit, onRestore, onError }:
  { api: Api; path: string; canEdit: boolean; onRestore: (version: Version) => void; onError: (error: unknown) => void }) {
  const [versions, setVersions] = useState<Version[] | null>(null); const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api<{ versions: Version[] }>("GET", `/api/v1/voice/history?path=${encodeURIComponent(path)}`, undefined, controller.signal)
      .then(res => { if (!controller.signal.aborted) setVersions(res.versions); })
      .catch(err => { if (!controller.signal.aborted) { setError(err.message); onError(err); } });
    return () => controller.abort();
  }, [api, path, onError]);
  if (error) return <Status notice={{ error: true, message: error }} />;
  if (!versions) return <p className="loading-line" role="status"><LoaderCircle size={18} className="spin" /> Loading previous versions…</p>;
  if (!versions.length) return <div className="empty-small"><History size={30} /><p>No saved changes yet.</p><span className="muted">The original wording is still available under More details.</span></div>;
  return <ul className="version-list">{versions.map(version => <li key={version.id}>
    <div><strong>{when(version.at)}</strong><p className="small muted">Saved by {version.by || "a reviewer"}{version.removed ? " · kept when the original wording was restored" : ""}</p></div>
    <button className="button secondary" disabled={!canEdit} onClick={() => onRestore(version)}>Use this version</button>
  </li>)}</ul>;
}

export function VoiceLab() {
  const [token, setToken] = useState(() => stored("voice.token"));
  const [name, setName] = useState(() => stored("voice.name") || "Reviewer");
  const [packId, setPackId] = useState<string | null>(() => new URLSearchParams(location.search).get("pack"));
  const [packs, setPacks] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<VoiceData | null>(null); const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(""); const [reload, setReload] = useState(0);
  const [view, setView] = useState<View>("try"); const [current, setCurrent] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({}); const [mode, setMode] = useState("");
  const [level, setLevel] = useState("normal"); const [prompt, setPrompt] = useState<"full" | "compact">("full");
  const [question, setQuestion] = useState(""); const [previewBusy, setPreviewBusy] = useState(false);
  const [busy, setBusy] = useState(false); const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState<Notice | null>(null); const [search, setSearch] = useState("");
  const [contextOpen, setContextOpen] = useState(() => !matchMedia("(max-width: 920px)").matches);
  const [preview, setPreview] = useState<{ key: string; result: PreviewResponse; compared: boolean;
    question: string; language: string } | null>(null);
  const epoch = useRef(0); const pending = useRef<AbortController | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const dirty = Object.keys(drafts); const file = data?.files.find(f => f.path === current);
  const text = file ? drafts[file.path] ?? file.effective : "";
  const validation = data ? draftError(file, text, data.maxBytes) : "";
  const snapshot = useMemo(() => JSON.stringify({ pack: data?.pack.id, mode, level, prompt, question: question.trim(),
    drafts: Object.entries(drafts).sort(([a], [b]) => a.localeCompare(b)), revision: reload }), [data?.pack.id, mode, level, prompt, question, drafts, reload]);
  const stale = !!preview && preview.key !== snapshot;

  const reset = useCallback(() => {
    epoch.current++; pending.current?.abort(); pending.current = null;
    setData(null); setDrafts({}); setCurrent(""); setQuestion(""); setPreview(null);
    setPreviewBusy(false); setBusy(false); setDialog(null); setSearch(""); setLoadError(""); setView("try");
  }, []);
  const logout = useCallback((message?: string) => {
    reset(); setToken(null); setName("Reviewer");
    try { sessionStorage.removeItem("voice.token"); sessionStorage.removeItem("voice.name"); } catch { /* session-only fallback */ }
    setNotice(message ? { error: true, message } : null);
  }, [reset]);
  const handleError = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) { logout("Your session ended. Sign in again to continue."); return; }
    if (err instanceof Error && err.name === "AbortError") return;
    setNotice({ error: true, message: err instanceof Error ? err.message : "Could not complete the request. Try again.",
      details: err instanceof ApiError ? err.details : [] });
  }, [logout]);
  const api: Api = useCallback(<T,>(method: string, url: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(token, packId, method, url, body, signal), [token, packId]);

  useEffect(() => {
    const controller = new AbortController();
    request<{ packs: { id: string; name: string }[] }>(null, null, "GET", "/api/v1/packs", undefined, controller.signal)
      .then(res => setPacks(res.packs || [])).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!token) return;
    const id = ++epoch.current; const controller = new AbortController();
    setLoading(true); setLoadError("");
    api<VoiceData>("GET", "/api/v1/voice/files", undefined, controller.signal).then(d => {
      if (id !== epoch.current || controller.signal.aborted) return;
      setData(d); setMode(previous => d.pack.modes.some(m => m.id === previous) ? previous : d.pack.defaultMode);
      setPrompt(d.promptMode); setCurrent(previous => d.files.some(f => f.path === previous) ? previous : guidePath(d, d.pack.defaultMode));
      setDrafts(previous => Object.fromEntries(Object.entries(previous).filter(([path, value]) => d.files.some(f => f.path === path && f.canEdit && f.effective !== value))));
      document.title = `${d.pack.name} Voice Lab`;
    }).catch(err => {
      if (id !== epoch.current || controller.signal.aborted) return;
      if (err instanceof ApiError && err.status === 401) handleError(err);
      else setLoadError(err instanceof Error ? err.message : "Could not load this community’s instructions.");
    }).finally(() => { if (id === epoch.current && !controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); pending.current?.abort(); };
  }, [token, api, reload, handleError]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (dirty.length) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler);
  }, [dirty.length]);
  useEffect(() => {
    const size = matchMedia("(max-width: 920px)");
    const resize = () => setContextOpen(!size.matches);
    size.addEventListener("change", resize);
    const closeMenus = (event: MouseEvent) => document.querySelectorAll<HTMLDetailsElement>("details.account[open], details.options[open]")
      .forEach(menu => { if (!menu.contains(event.target as Node)) menu.open = false; });
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") document.querySelectorAll<HTMLDetailsElement>("details.account[open], details.options[open]")
      .forEach(menu => { menu.open = false; }); };
    document.addEventListener("click", closeMenus); document.addEventListener("keydown", escape);
    return () => { size.removeEventListener("change", resize); document.removeEventListener("click", closeMenus); document.removeEventListener("keydown", escape); };
  }, []);

  function chooseFile(path: string) {
    const found = data?.files.find(f => f.path === path); if (!found || busy) return;
    setCurrent(path); setView("teach"); setDialog(null); setNotice(null);
    const match = /^language\/([a-z0-9_]+)\.(full|compact)\.md$/.exec(path);
    if (match) { setMode(match[1]!); setPrompt(match[2] as "full" | "compact"); }
  }
  function chooseMode(next: string) {
    if (!data) return; setMode(next);
    if (view === "teach" || !file || /^language\/.*\.(full|compact)\.md$/.test(file.path)) setCurrent(guidePath(data, next, prompt));
  }
  function changeText(next: string) {
    if (!file?.canEdit || busy) return;
    setDrafts(previous => { const updated = { ...previous }; if (next === file.effective) delete updated[file.path]; else updated[file.path] = next; return updated; });
  }
  function changePack(next: string) {
    if (busy) return;
    if (dirty.length) { setDialog({ kind: "leave", pack: next }); return; }
    reset(); setPackId(next); setNotice(null);
    const url = new URL(location.href); url.searchParams.set("pack", next); history.replaceState(null, "", url);
  }
  async function testAnswer() {
    if (!data || previewBusy || busy || !question.trim()) return;
    const editable = Object.fromEntries(Object.entries(drafts).filter(([path]) => data.files.some(f => f.path === path && f.canEdit)));
    const invalid = Object.entries(editable).map(([path, value]) => draftError(data.files.find(f => f.path === path), value, data.maxBytes)).find(Boolean);
    if (invalid) { setNotice({ error: true, message: invalid }); return; }
    const id = epoch.current; const controller = new AbortController(); pending.current?.abort(); pending.current = controller;
    const sent = { message: question.trim(), mode, level, promptMode: prompt, drafts: editable, compare: view === "compare" };
    setPreviewBusy(true); setNotice(null);
    try {
      const result = await api<PreviewResponse>("POST", "/api/v1/voice/preview", sent, controller.signal);
      if (id === epoch.current && !controller.signal.aborted) setPreview({ key: snapshot, result, compared: sent.compare,
        question: sent.message, language: data.pack.modes.find(m => m.id === mode)?.label || mode });
    } catch (err) { if (id === epoch.current && !controller.signal.aborted) handleError(err); }
    finally { if (id === epoch.current && !controller.signal.aborted) setPreviewBusy(false); }
  }
  async function apply(action: Action) {
    if (!data || busy) return;
    const target = data.files.find(f => f.path === action.path); if (!target?.canEdit) return;
    if (action.kind === "save" && (drafts[action.path] === undefined || draftError(target, drafts[action.path]!, data.maxBytes))) return;
    const id = epoch.current; const controller = new AbortController(); pending.current?.abort(); pending.current = controller;
    setPreviewBusy(false); setBusy(true); setNotice(null); let applied = false;
    try {
      if (action.kind === "save") await api("PUT", "/api/v1/voice/files", { path: action.path, text: drafts[action.path] }, controller.signal);
      else if (action.kind === "revert") await api("DELETE", `/api/v1/voice/files?path=${encodeURIComponent(action.path)}`, undefined, controller.signal);
      else await api("POST", "/api/v1/voice/restore", { path: action.path, version: action.version!.id }, controller.signal);
      applied = true;
      const fresh = await api<VoiceData>("GET", "/api/v1/voice/files", undefined, controller.signal);
      if (id !== epoch.current || controller.signal.aborted) return;
      setData(fresh); setDrafts(previous => { const updated = { ...previous }; delete updated[action.path]; return updated; });
      setPreview(null); setDialog(null);
      setNotice({ message: action.kind === "save" ? "Saved. The live assistant is using this wording now."
        : action.kind === "revert" ? "The live assistant is using the original wording again." : "Restored. The live assistant is using that version now." });
    } catch (err) {
      if (id !== epoch.current || controller.signal.aborted) return;
      setDialog(null);
      if (applied && !(err instanceof ApiError && err.status === 401)) setNotice({ error: true,
        message: "The change was saved, but the latest wording could not be loaded. Your text is still here. Reload the instructions to check the saved version." });
      else handleError(err);
    } finally { if (id === epoch.current && !controller.signal.aborted) setBusy(false); }
  }

  if (!token) return <Login notice={notice} onLogin={(next, displayName) => {
    reset(); setToken(next); setName(displayName); setNotice(null);
    try { sessionStorage.setItem("voice.token", next); sessionStorage.setItem("voice.name", displayName); } catch { /* in-memory session */ }
  }} />;
  const initials = name === "Reviewer" ? "RV" : name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const currentLanguage = data?.pack.modes.find(m => m.id === mode)?.label || "Community";
  const languageFile = !!file && /^language\/.*\.(full|compact)\.md$/.test(file.path);
  const contextTitle = languageFile ? currentLanguage : file?.group === "messages" ? "Messages." : file?.group === "safety" ? "Safety." : "Guidance.";
  const opening = text.replace(/^Language mode:[^\n]*\n?/, "").replace(/^#+\s*/gm, "").trim();
  const excerpt = opening.match(/^.{1,200}?[.!?](?:\s|$)/s)?.[0]?.trim() || opening.slice(0, 200) || file?.description || "";
  const modalFile = data?.files.find(f => f.path === (dialog && "path" in dialog ? dialog.path : current));

  return <><a href="#workspace" className="skip-link">Skip to workspace</a>
    <header className="app-header"><Brand />
      {packs.length > 1 ? <label className="pack-picker"><BookOpen size={18} /><span className="sr-only">Community</span>
        <select aria-label="Community" disabled={busy} value={packId || data?.pack.id || ""} onChange={e => changePack(e.target.value)}>
          {packs.map(pack => <option key={pack.id} value={pack.id}>{pack.name}</option>)}</select></label>
        : <div className="pack-label"><BookOpen size={18} /><span>{data?.pack.community || "Community workspace"}</span></div>}
      <div className="header-actions"><button className="help-button" aria-label="How to use this" onClick={() => setDialog({ kind: "help" })}><CircleHelp size={20} /><span>How to use this</span></button>
        <details className="account"><summary><span className="avatar">{initials}</span><span className="account-label">{data?.role === "admin" ? "Administrator" : "Reviewer"}</span><ChevronDown size={16} /></summary>
          <div className="account-menu"><p className="small muted">{name}</p><button disabled={busy} onClick={() => dirty.length ? setDialog({ kind: "leave" }) : logout()}><LogOut size={16} />Sign out</button></div></details>
      </div></header>
    {data && <div className="workspace-nav"><button className="button secondary library-button" onClick={() => { setSearch(""); setDialog({ kind: "library" }); }} disabled={busy}><BookOpen size={19} />More to edit<ChevronDown size={15} /></button>
      <div className="view-tabs" role="tablist" aria-label="Voice Lab tasks" onKeyDown={e => {
        const index = views.findIndex(item => item.id === view); let next = index;
        if (e.key === "ArrowRight") next = (index + 1) % views.length;
        else if (e.key === "ArrowLeft") next = (index + views.length - 1) % views.length;
        else if (e.key === "Home") next = 0; else if (e.key === "End") next = views.length - 1; else return;
        e.preventDefault(); setView(views[next]!.id); document.getElementById(`${views[next]!.id}-tab`)?.focus();
      }}>{views.map(item => <button key={item.id} id={`${item.id}-tab`} role="tab" aria-controls="workspace"
        aria-selected={view === item.id} tabIndex={view === item.id ? 0 : -1} onClick={() => setView(item.id)}>{item.label}</button>)}</div>
      <span className="nav-note small muted">Community-written guidance</span>
    </div>}
    {(!data || loadError) ? <main className="load-screen">{loading ? <p className="loading-line" role="status"><LoaderCircle className="spin" size={22} /> Opening your community’s workspace…</p>
      : <><h1>Could not open the workspace.</h1><p className="muted">{loadError}</p><button className="button primary" onClick={() => setReload(value => value + 1)}>Try again</button></>}</main>
      : <main id="workspace" className="workspace" role="tabpanel" aria-labelledby={`${view}-tab`}>
        <div className="workspace-notice"><Status notice={notice} />{notice?.message.startsWith("The change was saved") && <button className="text-button" onClick={() => setReload(value => value + 1)}>Reload instructions</button>}</div>
        <section className="work-surface"><div className="work-heading"><h1>{view === "teach" ? "Give it your voice." : view === "compare" ? "Read both answers." : "Try a question."}</h1>
          <p className="muted">{view === "teach" ? "Write how the AI should speak to your community."
            : view === "compare" ? "Ask once. Compare the saved wording with your changes." : "See how your changes sound before you save them."}</p></div>
          <div className="settings-row"><div className="language-picker"><span className="field-label">Language</span>
            <div className="language-buttons" role="group" aria-label="Language">{data.pack.modes.map(language => <button key={language.id}
              aria-pressed={mode === language.id} disabled={busy} onClick={() => chooseMode(language.id)}>{language.label}</button>)}</div></div>
            {view !== "teach" && <details className="options"><summary><Settings2 size={18} />Answer options<ChevronDown size={15} /></summary>
              <div className="options-popover"><label htmlFor="level">Explanation level</label><select id="level" value={level} onChange={e => setLevel(e.target.value)}>
                {data.levels.map(value => <option key={value} value={value}>{value === "simple" ? "Simple" : value === "deep" ? "Detailed" : value === "normal" ? "Normal" : value}</option>)}</select>
                <label htmlFor="prompt">Instructions to test</label><select id="prompt" value={prompt} onChange={e => {
                  const next = e.target.value as "full" | "compact"; setPrompt(next);
                  if (languageFile) setCurrent(guidePath(data, mode, next));
                }}>
                  <option value="full">Full instructions{data.promptMode === "full" ? " (live)" : ""}</option><option value="compact">Short instructions{data.promptMode === "compact" ? " (live)" : ""}</option></select>
                <p className="small muted">The live service uses {data.promptMode === "full" ? "full" : "short"} instructions. This choice only changes your test.</p>
                <p className="small muted">Up to 10 tests per minute. Comparison makes two model calls.</p>
              </div></details>}
          </div>
          {view === "teach" && file ? <section className="editor-section"><div className="section-heading"><h2>{fileLabel(file, data)}</h2>
            <span className={`status-tag ${drafts[file.path] !== undefined ? "unsaved" : ""}`}>{!file.canEdit ? "Read only" : drafts[file.path] !== undefined ? "Not saved yet" : "Saved wording"}</span></div>
            {!file.canEdit && <div className="notice"><LockKeyhole size={18} /><span>Only an administrator can change these safety instructions. You can read them here.</span></div>}
            {!file.described && <div className="notice"><AlertCircle size={18} /><span>This file does not have a description yet. Ask an administrator before changing it.</span></div>}
            <p className="muted editor-explanation">{languageFile ? "Describe the tone, words and examples the AI should use. Keep the facts in the knowledge cards."
              : file.affects.includes("message") || file.affects.includes("push") ? "People see these words exactly as written. The AI does not rewrite them." : file.description}</p>
            {file.affects.includes("compact") && !file.affects.includes("full") && data.promptMode !== "compact" && <div className="notice"><AlertCircle size={18} /><span>This short guide is available for tests. It is not used by the live assistant today.</span></div>}
            {(file.affects.some(a => ["serve", "waiter", "chef"].includes(a)) && data.chatPipeline !== "restaurant") && <div className="notice"><AlertCircle size={18} /><span>These instructions belong to an optional pipeline. They may not affect the current live answers. Check More details before editing.</span></div>}
            <label htmlFor="editor">{file.kind === "json" ? "Wording and structure" : "Instructions and wording"}</label>
            {file.kind === "json" && <p className="small muted">Keep the structure intact. Change the wording you understand.</p>}
            <textarea id="editor" ref={editor} className={`editor ${file.kind === "json" ? "code-editor" : ""}`} value={text}
              spellCheck={file.kind !== "json"} readOnly={!file.canEdit || busy} onChange={e => changeText(e.target.value)}
              aria-invalid={!!validation} aria-describedby={validation ? "editor-error" : "editor-note"} />
            <div id="editor-note" className="editor-footer small muted"><span>{(textBytes(text) / 1024).toFixed(1)} of {Math.round(data.maxBytes / 1024)} KB</span><span>Changes stay in this tab until you save.</span></div>
            {validation && <div id="editor-error" className="notice error" role="alert"><AlertCircle size={18} /><span>{validation}</span></div>}
            {file.placeholders.length > 0 && <details className="editor-tools"><summary>Insert a community detail</summary><p className="small muted">These names are filled in by the community pack.</p><div className="placeholder-buttons">
              {file.placeholders.map(value => <button className="button secondary" key={value} disabled={!file.canEdit || busy} onClick={() => {
                const area = editor.current; if (!area) return; const start = area.selectionStart, end = area.selectionEnd;
                changeText(`${text.slice(0, start)}{{${value}}}${text.slice(end)}`);
                requestAnimationFrame(() => { area.focus(); area.setSelectionRange(start + value.length + 4, start + value.length + 4); });
              }}>{`{{${value}}}`}</button>)}</div></details>}
            <div className="editor-actions"><button className="button primary" onClick={() => { setView("try"); requestAnimationFrame(() => document.getElementById("question")?.focus()); }}>Try this wording<ChevronRight size={17} /></button>
              {drafts[file.path] !== undefined && <button className="text-button" disabled={busy} onClick={() => {
                setDrafts(previous => { const next = { ...previous }; delete next[file.path]; return next; });
              }}>Discard this draft</button>}</div>
          </section> : <>
            <div className="section-heading answer-heading"><h2>{view === "compare" ? "Saved and draft answers" : "Your test answer"}</h2>
              {previewBusy && <span className="loading-line small" role="status"><LoaderCircle size={16} className="spin" />{view === "compare" ? "Getting two answers…" : "Getting an answer…"}</span>}</div>
            {stale && <div className="notice stale-note"><AlertCircle size={17} /><span>Your question, options or wording changed. These are the earlier test results.</span></div>}
            <div className="sr-only" role="status">{previewBusy ? "Getting a test answer." : preview ? "Test results are ready." : ""}</div>
            <div className={`answer-surface ${view === "compare" ? "comparison" : ""}`} role="region" aria-busy={previewBusy} tabIndex={0} aria-label="Test answers">
              {preview && (view !== "compare" || preview.compared) ? <>
                <p className="result-context small muted">Tested in {preview.language}: <span>{preview.question}</span></p>
                {view === "compare" ? <div className="answer-pair"><section><h3>Saved wording</h3>{preview.result.saved && <Answer answer={preview.result.saved} />}</section>
                  <section><h3>Your draft</h3><Answer answer={preview.result} /></section></div> : <Answer answer={preview.result} />}
              </> : <div className="answer-empty"><div className="empty-illustration" aria-hidden="true"><FileText size={43} strokeWidth={1.25} /><span><img src={mark} alt="" width={32} height={32} /></span></div><h3>{view === "compare" ? "Two answers, side by side." : "Your answer will appear here."}</h3>
                <p>{view === "compare" ? "Compare the live wording with your unsaved changes." : "Ask something a learner might ask."}</p></div>}
            </div>
            <QuestionInput value={question} onChange={setQuestion} onSubmit={testAnswer} busy={previewBusy || busy} compare={view === "compare"} />
          </>}
        </section>
        <aside className="context-panel" aria-label="Your instructions and changes"><details className="context-disclosure" open={contextOpen} onToggle={e => setContextOpen(e.currentTarget.open)}>
          <summary>Your instructions and changes <ChevronDown size={18} />{dirty.length > 0 && <span className="status-tag unsaved">{dirty.length} unsaved</span>}</summary>
          <div className="language-card"><span className="eyebrow">{languageFile ? "HOW THE AI SPEAKS" : "WHAT YOU’RE EDITING"}</span>
          <h2 className={contextTitle.length > 6 ? "long-title" : undefined}>{contextTitle}{languageFile && !contextTitle.endsWith(".") ? "." : ""}</h2><p>{languageFile ? "Community-written guidance" : groups[file?.group || ""] || "Community guidance"}</p></div>
          <div className="context-body"><div className="section-heading"><h2>Your changes</h2><span className={`status-tag ${dirty.length ? "unsaved" : ""}`}>{dirty.length ? `${dirty.length === 1 ? "Not saved yet" : `${dirty.length} unsaved files`}` : "Saved wording"}</span></div>
            <p className="context-excerpt">{file?.kind === "json" ? file.description : excerpt}</p>
            <button className="text-button edit-link" onClick={() => { setView("teach"); requestAnimationFrame(() => editor.current?.focus()); }}><Pencil size={18} />Change instructions</button>
            <div className="context-links"><button disabled={!file} onClick={() => setDialog({ kind: "history", path: current })}><History size={20} />Previous versions<ChevronRight size={18} /></button>
              <button disabled={!file} onClick={() => setDialog({ kind: "baseline", path: current })}><FileText size={20} />More details<ChevronRight size={18} /></button></div>
            <button className="button secondary save-button" disabled={busy || !file?.canEdit || drafts[current] === undefined || !!validation}
              onClick={() => setDialog({ kind: "action", action: { kind: "save", path: current } })}>{busy ? <LoaderCircle className="spin" size={19} /> : <Upload size={19} />}Save changes</button>
            <p className="small muted save-note">Saving changes this wording on the live assistant for everyone.</p>
            {!file?.canEdit && <p className="small muted">An administrator must save changes to this file.</p>}
            {dirty.length > 1 && <button className="text-button small" onClick={() => { setSearch(""); setDialog({ kind: "library" }); }}>See all unsaved changes</button>}
          </div></details></aside>
      </main>}

    <Modal open={!!dialog} onClose={() => { if (!busy) setDialog(null); }} wide={dialog?.kind === "baseline" || dialog?.kind === "library"}
      title={dialog?.kind === "library" ? "What would you like to change?" : dialog?.kind === "help" ? "A good way to use Voice Lab"
        : dialog?.kind === "history" ? "Previous versions" : dialog?.kind === "baseline" ? "About these instructions"
          : dialog?.kind === "leave" ? "Leave your unsaved changes?" : dialog?.kind === "action" && dialog.action.kind === "save" ? "Save this change for everyone?"
            : dialog?.kind === "action" && dialog.action.kind === "restore" ? "Use this previous version?" : "Return to the original wording?"}
      description={dialog?.kind === "library" ? "Start with how the AI speaks. Other wording and settings are here when you need them."
        : dialog?.kind === "help" ? "The community writes the guidance. This workspace lets you test it before saving."
          : dialog?.kind === "history" ? "Saved changes are listed newest first. Restoring a version changes the live assistant."
            : dialog?.kind === "baseline" ? "See where this wording is used and read the original version."
              : dialog?.kind === "leave" ? "Your unsaved edits are kept only in this browser tab. Leaving will discard them."
                : "The live assistant will use this file as soon as you save. Other unsaved files remain drafts."}>
      {dialog?.kind === "help" && <><ol className="help-steps"><li><h3>Choose what to change</h3><p>Pick a language, then open Teach the AI. Use More to edit for fixed messages and other settings.</p></li>
        <li><h3>Write one change at a time</h3><p>Use wording you know. Sheng and Kiswahili guidance should be written by speakers, then read by another reviewer.</p></li>
        <li><h3>Try several questions</h3><p>Read the answers aloud. Use Compare answers to see your draft beside the saved wording. One good answer does not prove a guide is ready.</p></li>
        <li><h3>Save when it is ready</h3><p>Saving affects everyone immediately. Previous versions and the original wording remain available.</p></li></ol>
        <p className="small muted">This page edits instructions and messages. It does not train model weights or add knowledge cards. <a href="/review">Knowledge cards are managed on the review page.</a></p></>}
      {dialog?.kind === "library" && data && <><label className="sr-only" htmlFor="file-search">Find instructions or a message</label><div className="search-field"><Search size={18} /><input id="file-search" type="search" placeholder="Find instructions or a message…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="file-library">{data.groups.map(group => {
          const files = data.files.filter(item => item.group === group.id && `${fileLabel(item, data)} ${item.path}`.toLowerCase().includes(search.toLowerCase()));
          if (!files.length) return null;
          return <details key={`${group.id}-${!!search}`} open={!!search || group.id === "speech"}><summary>{groups[group.id] || group.title}<span className="small muted">{files.length}</span></summary>
            <div>{files.map(item => <button key={item.path} className="file-item" aria-current={item.path === current ? "true" : undefined} onClick={() => chooseFile(item.path)}>
              {item.canEdit ? <FileText size={18} /> : <LockKeyhole size={18} />}<span>{fileLabel(item, data)}{!item.canEdit && <small>Administrator only</small>}</span>
              {drafts[item.path] !== undefined ? <span className="status-tag unsaved">Unsaved</span> : item.overridden ? <span className="status-tag">Changed</span> : null}<ChevronRight size={15} /></button>)}</div>
          </details>;
        })}{!data.files.some(item => `${fileLabel(item, data)} ${item.path}`.toLowerCase().includes(search.toLowerCase())) && <p className="muted">No wording matched that search.</p>}</div></>}
      {dialog?.kind === "history" && modalFile && <HistoryList api={api} path={modalFile.path} canEdit={modalFile.canEdit} onError={handleError}
        onRestore={version => setDialog({ kind: "action", action: { kind: "restore", path: modalFile.path, version } })} />}
      {dialog?.kind === "baseline" && modalFile && data && <><h3>{fileLabel(modalFile, data)}</h3><p>{modalFile.description}</p>
        <dl className="file-metadata"><div><dt>File</dt><dd><code>{modalFile.path}</code></dd></div><div><dt>Used for</dt><dd>{modalFile.affects.join(", ")}</dd></div>
          <div><dt>Live instructions</dt><dd>{data.promptMode === "full" ? "Full prompt" : "Compact prompt"}</dd></div><div><dt>Optional pipeline</dt><dd>{data.chatPipeline}</dd></div>
          {modalFile.lastEdit && <div><dt>Last change</dt><dd>{when(modalFile.lastEdit.at)} · {modalFile.lastEdit.by}</dd></div>}</dl>
        <h3>{modalFile.baselineIsDefault ? "Original engine wording" : "Original reviewed wording"}</h3>
        {modalFile.baselineIsDefault && <p className="small muted">This pack does not supply its own version. These are the engine’s generic instructions.</p>}
        <pre>{modalFile.baseline || "This file was originally empty."}</pre><div className="modal-actions"><button className="button secondary" disabled={!modalFile.canEdit || !modalFile.overridden}
          onClick={() => setDialog({ kind: "action", action: { kind: "revert", path: modalFile.path } })}>Use original wording</button>
          <button className="button secondary" onClick={() => setDialog(null)}>Close</button></div></>}
      {dialog?.kind === "action" && data && (() => {
        const target = data.files.find(item => item.path === dialog.action.path); if (!target) return null;
        return <><div className="change-summary"><FileText size={21} /><div><strong>{fileLabel(target, data)}</strong>
          <p className="small muted">{dialog.action.version ? `Version saved ${when(dialog.action.version.at)}` : dialog.action.kind === "revert" ? "The original wording kept in the community pack" : "Your current draft"}</p></div></div>
          <p>You can return to the original wording or a saved version later.</p><div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => setDialog(null)}>Keep editing</button>
            <button className="button primary" disabled={busy || !target.canEdit} onClick={() => apply(dialog.action)}>{busy && <LoaderCircle size={18} className="spin" />}{busy ? "Saving…" : "Save to live assistant"}</button></div></>;
      })()}
      {dialog?.kind === "leave" && <div className="modal-actions"><button className="button secondary" onClick={() => setDialog(null)}>Keep editing</button>
        <button className="button primary" onClick={() => { if (dialog.pack) { const next = dialog.pack; reset(); setPackId(next); setNotice(null);
          const url = new URL(location.href); url.searchParams.set("pack", next); history.replaceState(null, "", url);
        } else logout(); }}>Discard and {dialog.pack ? "switch community" : "sign out"}</button></div>}
    </Modal>
  </>;
}
