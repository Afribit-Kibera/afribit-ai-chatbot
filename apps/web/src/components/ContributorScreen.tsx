import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n.js";
import {
  fetchProfile,
  getAuthToken,
  login,
  register,
  logout,
  RegisterError,
  type AuthedProfile,
} from "../lib/auth.js";
import { deleteMyAccount } from "../lib/api.js";
import { Dialog } from "./ui/Dialog.js";
import {
  getReviewQueue,
  getMySubmissions,
  submitLanguageExample,
  reviewLanguageEntry,
  voteLanguageEntry,
  type LanguageEntry,
} from "../lib/microtasks.js";
import { resolveMode, usePack } from "../lib/pack.js";
export default function ContributorScreen() {
  const { t } = useI18n();
  const pack = usePack();
  const modeLabel = (id: string) =>
    pack.modes.find((m) => m.id === id)?.label ?? t("contribute.style");
  const [profile, setProfile] = useState<AuthedProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  // F-012: accounts are by invitation; the administrator gives the code.
  const [invitationCode, setInvitationCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  // F-002: deleting your own account (contributions kept without your name, or deleted).
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [keepContributions, setKeepContributions] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountNote, setAccountNote] = useState("");
  const [tab, setTab] = useState<"submit" | "review" | "mine">("submit");
  const [phrase, setPhrase] = useState("");
  const [meaning, setMeaning] = useState("");
  const [style, setStyle] = useState("sheng");
  const styleMode = resolveMode(pack, style);
  const [entries, setEntries] = useState<LanguageEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [listError, setListError] = useState(false);
  useEffect(() => {
    let current = true;
    fetchProfile()
      .then((p) => {
        if (current) setProfile(p);
      })
      .catch(() => {
        if (current) setNote(t("contribute.error"));
      })
      .finally(() => {
        if (current) setLoadingProfile(false);
      });
    return () => {
      current = false;
    };
  }, [t]);
  async function loadEntries(next = tab) {
    if (next === "submit") return;
    setLoadingEntries(true);
    setListError(false);
    setEntries([]);
    try {
      setEntries(
        next === "review" ? await getReviewQueue() : await getMySubmissions(),
      );
    } catch {
      setListError(true);
    } finally {
      setLoadingEntries(false);
    }
  }
  return (
    <div className="secondary-scroll">
      <div className="secondary-content">
        <p className="eyebrow">{t("contribute.eyebrow")}</p>
        <h1>{t("contribute.title")}</h1>
        <p className="secondary-description">{t("contribute.description")}</p>
        {loadingProfile ? (
          <p role="status">{t("common.loading")}</p>
        ) : !profile ? (
          <>
            <div
              className="contributor-tabs"
              role="tablist"
              aria-label={t("contribute.signIn")}
            >
              <button
                id="login-tab"
                role="tab"
                aria-selected={mode === "login"}
                aria-controls="auth-panel"
                onClick={() => {
                  setMode("login");
                  setNote("");
                }}
              >
                {t("contribute.signIn")}
              </button>
              <button
                id="register-tab"
                role="tab"
                aria-selected={mode === "register"}
                aria-controls="auth-panel"
                onClick={() => {
                  setMode("register");
                  setNote("");
                }}
              >
                {t("contribute.register")}
              </button>
            </div>
            <form
              id="auth-panel"
              role="tabpanel"
              aria-labelledby={mode === "login" ? "login-tab" : "register-tab"}
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                setBusy(true);
                setNote("");
                try {
                  if (mode === "register")
                    await register(
                      email,
                      password,
                      displayName.trim() || undefined,
                      invitationCode,
                    );
                  else await login(email, password);
                  const p = await fetchProfile();
                  if (!p) throw new Error(t("contribute.error"));
                  setProfile(p);
                  setEmail("");
                  setPassword("");
                  setInvitationCode("");
                } catch (err) {
                  setNote(
                    err instanceof RegisterError
                      ? t(
                          err.reason === "closed"
                            ? "contribute.inviteClosed"
                            : "contribute.inviteRefused",
                        )
                      : err instanceof Error
                        ? err.message
                        : t("contribute.error"),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="form-field">
                {t("contribute.email")}
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                />
              </label>
              <label className="form-field">
                {t("contribute.password")}
                <input
                  type="password"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                />
              </label>
              {mode === "register" && (
                <label className="form-field">
                  {t("contribute.displayName")}
                  <input
                    autoComplete="nickname"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={100}
                  />
                </label>
              )}
              {mode === "register" && (
                <label className="form-field">
                  {t("contribute.inviteCode")}
                  <input
                    required
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="AFB-XXXX-XXXX"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    maxLength={20}
                    aria-describedby="invite-code-help"
                  />
                  <span id="invite-code-help" className="field-help">
                    {t("contribute.inviteHelp")}
                  </span>
                </label>
              )}
              <button className="button button-primary" disabled={busy}>
                {t(
                  busy
                    ? "common.loading"
                    : mode === "register"
                      ? "contribute.register"
                      : "contribute.signIn",
                )}
              </button>
              <p className="contributor-note">{t("contribute.accountNote")}</p>
            </form>
          </>
        ) : profile.role === "learner" ? (
          <div>
            <p>{t("member.noContribution")}</p>
            <button className="button button-ghost" onClick={() => { logout(); setProfile(null); }}>{t("contribute.signOut")}</button>
          </div>
        ) : (
          <>
            <div className="auth-heading">
              <div>
                <p>{t("contribute.welcome")}</p>
                <p>{profile.displayName || profile.email}</p>
              </div>
              <button
                className="button button-ghost"
                onClick={() => {
                  logout();
                  setProfile(null);
                  setEntries([]);
                  setNote("");
                  setTab("submit");
                }}
              >
                {t("contribute.signOut")}
              </button>
              <button
                className="button button-ghost"
                onClick={() => {
                  setAccountNote("");
                  setConfirmDeleteAccount(true);
                }}
              >
                {t("account.delete")}
              </button>
            </div>
            <Dialog
              open={confirmDeleteAccount}
              onOpenChange={setConfirmDeleteAccount}
              title={t("account.deleteTitle")}
              description={t("account.deleteBody")}
            >
              <fieldset className="radio-group">
                <label className="checkbox-field">
                  <input
                    type="radio"
                    name="contributions"
                    checked={keepContributions}
                    onChange={() => setKeepContributions(true)}
                  />
                  <span>{t("account.keepContributions")}</span>
                </label>
                <label className="checkbox-field">
                  <input
                    type="radio"
                    name="contributions"
                    checked={!keepContributions}
                    onChange={() => setKeepContributions(false)}
                  />
                  <span>{t("account.deleteContributions")}</span>
                </label>
              </fieldset>
              <p className="status-note" role="status">
                {accountNote}
              </p>
              <div className="dialog-footer">
                <button
                  className="button button-ghost"
                  onClick={() => setConfirmDeleteAccount(false)}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="button button-primary"
                  disabled={deletingAccount}
                  onClick={async () => {
                    const token = getAuthToken();
                    if (!token) return;
                    setDeletingAccount(true);
                    try {
                      await deleteMyAccount(token, keepContributions ? "keep" : "delete");
                      logout();
                      setProfile(null);
                      setEntries([]);
                      setConfirmDeleteAccount(false);
                      setNote(t("account.deleted"));
                    } catch (e) {
                      setAccountNote(e instanceof Error ? e.message : t("account.deleteError"));
                    } finally {
                      setDeletingAccount(false);
                    }
                  }}
                >
                  {t(deletingAccount ? "common.loading" : "account.deleteConfirm")}
                </button>
              </div>
            </Dialog>
            <div
              className="contributor-tabs"
              role="tablist"
              aria-label={t("contribute.submitTab")}
            >
              {(
                [
                  { value: "submit", key: "submitTab" },
                  { value: "review", key: "reviewTab" },
                  { value: "mine", key: "mineTab" },
                ] as const
              ).map((o) => (
                <button
                  key={o.value}
                  id={`${o.value}-tab`}
                  role="tab"
                  aria-selected={tab === o.value}
                  aria-controls="contribution-panel"
                  onClick={() => {
                    setTab(o.value);
                    setNote("");
                    void loadEntries(o.value);
                  }}
                >
                  {t(`contribute.${o.key}`)}
                </button>
              ))}
            </div>
            <div
              id="contribution-panel"
              role="tabpanel"
              aria-labelledby={`${tab}-tab`}
            >
              {tab === "submit" ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (busy || !phrase.trim()) return;
                    setBusy(true);
                    setNote("");
                    try {
                      await submitLanguageExample({
                        utterance: phrase.trim(),
                        meaning: meaning.trim() || undefined,
                        style: styleMode,
                      });
                      setPhrase("");
                      setMeaning("");
                      setNote(t("contribute.submitted"));
                    } catch (err) {
                      setNote(
                        err instanceof Error
                          ? err.message
                          : t("contribute.error"),
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label className="form-field">
                    {t("contribute.phrase")}
                    <textarea
                      required
                      value={phrase}
                      onChange={(e) => setPhrase(e.target.value)}
                      maxLength={2000}
                      rows={3}
                    />
                  </label>
                  <label className="form-field">
                    {t("contribute.meaning")}
                    <input
                      value={meaning}
                      onChange={(e) => setMeaning(e.target.value)}
                      maxLength={2000}
                    />
                  </label>
                  <label className="form-field">
                    {t("contribute.style")}
                    <select
                      value={styleMode}
                      onChange={(e) => setStyle(e.target.value)}
                    >
                      {pack.modes.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button button-primary" disabled={busy}>
                    {t(busy ? "common.loading" : "contribute.submit")}
                  </button>
                </form>
              ) : loadingEntries ? (
                <p role="status">{t("common.loading")}</p>
              ) : listError ? (
                <div className="notice" role="alert">
                  <p>{t("contribute.error")}</p>
                  <button
                    className="text-link"
                    onClick={() => void loadEntries()}
                  >
                    {t("common.retry")}
                  </button>
                </div>
              ) : entries.length === 0 ? (
                <p>
                  {t(
                    tab === "review"
                      ? "contribute.queueEmpty"
                      : "contribute.mineEmpty",
                  )}
                </p>
              ) : (
                entries.map((entry) =>
                  tab === "mine" ? (
                    <article className="review-row" key={entry.id}>
                      <h2>{entry.utterance}</h2>
                      <p>{entry.meaning}</p>
                      <p>
                        {t("contribute.status")}: {entry.status ?? "draft"} ·{" "}
                        {modeLabel(entry.style)}
                      </p>
                    </article>
                  ) : (
                    <ReviewRow
                      key={entry.id}
                      entry={entry}
                      own={entry.contributor_key === profile.id}
                      reviewed={() =>
                        setEntries((previous) =>
                          previous.filter((e) => e.id !== entry.id),
                        )
                      }
                    />
                  ),
                )
              )}
            </div>
          </>
        )}
        <p className="status-note" role="status">
          {note}
        </p>
      </div>
    </div>
  );
}
function ReviewRow({
  entry,
  own,
  reviewed,
}: {
  entry: LanguageEntry;
  own: boolean;
  reviewed: () => void;
}) {
  const { t } = useI18n();
  const pack = usePack();
  const modeLabel = (id: string) =>
    pack.modes.find((m) => m.id === id)?.label ?? t("contribute.style");
  const [naturalness, setNaturalness] = useState(3);
  const [decision, setDecision] = useState<
    "approve" | "reject" | "needs_changes"
  >("needs_changes");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [voted, setVoted] = useState(false);
  return (
    <article className="review-row">
      <h2>{entry.utterance}</h2>
      <p>{entry.meaning}</p>
      <p>{modeLabel(entry.style)}</p>
      {own ? (
        <p>{t("contribute.selfReview")}</p>
      ) : (
        <>
          <fieldset className="naturalness-field">
            <legend>{t("contribute.naturalness")}</legend>
            <p className="quiet">{t("contribute.naturalnessHint")}</p>
            <div className="review-controls">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  aria-pressed={naturalness === value}
                  onClick={() => setNaturalness(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <button
              className="button button-outline"
              disabled={busy || voted}
              onClick={async () => {
                setBusy(true);
                try {
                  await voteLanguageEntry(entry.id, naturalness);
                  setNote(t("contribute.voteSent"));
                  setVoted(true);
                } catch (err) {
                  setNote(
                    err instanceof Error ? err.message : t("contribute.error"),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("contribute.vote")}
            </button>
          </fieldset>
          <form
            className="review-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              try {
                await reviewLanguageEntry(entry.id, decision, notes.trim());
                reviewed();
              } catch (err) {
                setNote(
                  err instanceof Error ? err.message : t("contribute.error"),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="form-field">
              {t("contribute.decision")}
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value as typeof decision)}
              >
                <option value="approve">{t("contribute.approve")}</option>
                <option value="needs_changes">{t("contribute.changes")}</option>
                <option value="reject">{t("contribute.reject")}</option>
              </select>
            </label>
            <label className="form-field">
              {t("contribute.notes")}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
              />
            </label>
            <button className="button button-primary" disabled={busy}>
              {t("contribute.review")}
            </button>
          </form>
          <p role="status" className="status-note">
            {note}
          </p>
        </>
      )}
    </article>
  );
}
