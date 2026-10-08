import { useState } from "react";
import type { LanguageModeId } from "@afribit/shared";
import { Dialog } from "./ui/Dialog.js";
import type { ChatMessageView } from "../lib/history.js";
import { useI18n } from "../lib/i18n.js";
import { ApiError, sendSuggestion, type SuggestionParams } from "../lib/api.js";

/**
 * "Say it your way" (docs/features/F-003-say-it-your-way.md): a member writes how they would say an
 * answer. It goes to the community's reviewers; nothing changes for anyone else until one approves it.
 * The member chooses what it may be used for: improving answers is ticked, testing and training are not.
 */
export function TeachDialog({
  message,
  question,
  sessionId,
  languageMode,
  close,
}: {
  message: ChatMessageView;
  question: string;
  sessionId: string | null;
  languageMode: LanguageModeId;
  close: () => void;
}) {
  const { t } = useI18n();
  const [suggestion, setSuggestion] = useState("");
  const [reason, setReason] = useState<SuggestionParams["reason"] | "">("");
  const [includeQuestion, setIncludeQuestion] = useState(true);
  const [answers, setAnswers] = useState(true);
  const [testing, setTesting] = useState(false);
  const [training, setTraining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value) close();
      }}
      title={t("teach.title")}
      description={t("teach.description")}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || sent) return;
          if (suggestion.trim().length < 3) {
            setNote(t("teach.tooShort"));
            return;
          }
          setBusy(true);
          setNote("");
          try {
            await sendSuggestion({
              sessionId,
              messageId: message.id !== "pending" ? message.id : null,
              questionText: includeQuestion && question ? question : undefined,
              answerText: message.content,
              suggestion: suggestion.trim(),
              languageMode,
              reason: reason || undefined,
              consent: { answers, testing, training },
            });
            setSent(true);
            setNote(t("teach.thanks"));
          } catch (err) {
            setNote(
              err instanceof ApiError && err.status === 429
                ? t("teach.tooMany")
                : err instanceof ApiError && err.status === 400
                  ? err.message
                  : t("teach.error"),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="teach-original">{message.content}</p>
        <label className="form-field">
          {t("teach.yourWay")}
          <textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            maxLength={1000}
            rows={4}
            required
            disabled={sent}
          />
        </label>
        <label className="form-field">
          {t("teach.reason")}
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as typeof reason)}
            disabled={sent}
          >
            <option value="">{t("teach.reasonNone")}</option>
            <option value="too_formal">{t("teach.reasonFormal")}</option>
            <option value="wrong_words">{t("teach.reasonWords")}</option>
            <option value="wrong_facts">{t("teach.reasonFacts")}</option>
            <option value="other">{t("teach.reasonOther")}</option>
          </select>
        </label>
        <label className="checkbox-field">
          <input type="checkbox" checked={includeQuestion} onChange={(e) => setIncludeQuestion(e.target.checked)} disabled={sent} />
          <span>{t("teach.includeQuestion")}</span>
        </label>
        <fieldset className="radio-group">
          <legend>{t("teach.useFor")}</legend>
          <label className="checkbox-field">
            <input type="checkbox" checked={answers} onChange={(e) => setAnswers(e.target.checked)} disabled={sent} />
            <span>{t("teach.useAnswers")}</span>
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={testing} onChange={(e) => setTesting(e.target.checked)} disabled={sent} />
            <span>{t("teach.useTesting")}</span>
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={training} onChange={(e) => setTraining(e.target.checked)} disabled={sent} />
            <span>{t("teach.useTraining")}</span>
          </label>
        </fieldset>
        <p className="quiet">{t("teach.noSecrets")}</p>
        <p className="status-note" role="status">
          {note}
        </p>
        <div className="dialog-footer">
          <button type="button" className="button button-ghost" onClick={close}>
            {t("common.close")}
          </button>
          <button className="button button-primary" disabled={busy || sent}>
            {t(busy ? "teach.sending" : sent ? "common.saved" : "teach.send")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
