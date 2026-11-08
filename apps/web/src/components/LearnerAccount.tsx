import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n.js";
import { getLearnerIdentity, setLearnerIdentity } from "../lib/learnerSession.js";
import { joinCommunity, memberAccess, memberSignIn, type CommunityAccess } from "../lib/member.js";
import { PersonalMemoryPanel } from "./PersonalMemoryPanel.js";

export function LearnerAccount({ onAccess }: { onAccess: (access: CommunityAccess | null) => void }) {
  const { t } = useI18n();
  const identity = getLearnerIdentity();
  const [access, setAccess] = useState<CommunityAccess | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => memberAccess(controller.signal).then((result) => {
      if (!controller.signal.aborted) { setFailed(false); setAccess(result); onAccess(result); }
    }).catch(() => { if (!controller.signal.aborted) { setFailed(true); onAccess(null); } });
    void load();
    const online = () => { void load(); };
    window.addEventListener("online",online);
    return () => { controller.abort(); window.removeEventListener("online",online); };
  }, [onAccess,retry]);
  return <details className="member-account" open={access?.membersOnly && !access.member ? true : undefined}>
    <summary>{identity ? identity.label : t("member.account")}</summary>
    <p>{identity ? t("member.privateHistory") : t("member.guestHistory")}</p>
    {access?.membersOnly && !access.member && <p role="status">{t("member.invitationRequired")}</p>}
    {failed && <><p role="alert">{t("member.error")}</p><button className="button button-ghost" onClick={() => setRetry((n) => n+1)}>{t("common.retry")}</button></>}
    {identity ? <>
      {access && (!access.membersOnly || access.member) && <PersonalMemoryPanel />}
      {access && !access.member && <form onSubmit={async (event) => {
        event.preventDefault(); if (busy) return; setBusy(true); setFailed(false);
        try { await joinCommunity(code); const next = await memberAccess(); setAccess(next); onAccess(next); setCode(""); }
        catch { setFailed(true); } finally { setBusy(false); }
      }}>
        <label className="form-field">{t("contribute.inviteCode")}<input value={code} onChange={(e) => setCode(e.target.value)} required maxLength={100} autoComplete="off" /></label>
        <button className="button button-outline" disabled={busy}>{t("member.join")}</button>
      </form>}
      <button className="button button-ghost" onClick={() => setLearnerIdentity(null)}>{t("contribute.signOut")}</button>
    </> : <form onSubmit={async (event) => {
      event.preventDefault(); if (busy) return; setBusy(true); setFailed(false);
      try { await memberSignIn(email,password,registering ? code : undefined); setPassword(""); setCode(""); }
      catch { setPassword(""); setFailed(true); } finally { setBusy(false); }
    }}>
      <label className="form-field">{t("contribute.email")}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required maxLength={254} /></label>
      <label className="form-field">{t("contribute.password")}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={registering ? "new-password" : "current-password"} required minLength={10} /></label>
      <label><input type="checkbox" checked={registering} onChange={(e) => setRegistering(e.target.checked)} /> {t("member.create")}</label>
      {registering && <label className="form-field">{t("contribute.inviteCode")}<input value={code} onChange={(e) => setCode(e.target.value)} required maxLength={100} autoComplete="off" /></label>}
      <button className="button button-outline" disabled={busy}>{t(busy ? "common.loading" : registering ? "member.create" : "contribute.signIn")}</button>
    </form>}
  </details>;
}
