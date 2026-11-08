import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Dialog } from "./ui/Dialog.js";
import type { ChatMessageView } from "../lib/history.js";
import { useI18n } from "../lib/i18n.js";
import { sendFeedback } from "../lib/api.js";
import { usePack } from "../lib/pack.js";
export function FeedbackDialog({
  message,
  question,
  close,
}: {
  message: ChatMessageView | null;
  question: string;
  close: () => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState("wrong_information");
  const [comment, setComment] = useState("");
  const [include, setInclude] = useState(false);
  // F-002: when this server keeps no chats, reviewers can only see a reported answer if the learner shares it.
  const pack = usePack();
  const noStorage = pack.service?.retention.mode === "none";
  const [shareWithReviewers, setShareWithReviewers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const body = `${include ? `Question:\n${question}\n\nAnswer:\n${message?.content ?? ""}\n\n` : ""}Reason: ${reason}\n\n${comment}`;
  const issue = `https://github.com/Afribit-Kibera/afribit-ai-chatbot/issues/new?template=unsafe_or_wrong_answer.yml&title=${encodeURIComponent("Answer report")}&question=${encodeURIComponent(include ? question : "Text not shared")}&answer=${encodeURIComponent(include ? (message?.content ?? "") : "Text not shared")}&correct=${encodeURIComponent(`Reason: ${reason}\n\n${comment}`)}&body=${encodeURIComponent(body)}`;
  return (
    <Dialog
      open={Boolean(message)}
      onOpenChange={(value) => {
        if (!value) close();
      }}
      title={t("feedback.title")}
      description={t("feedback.description")}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!message || busy) return;
          setBusy(true);
          setNote("");
          try {
            await sendFeedback(
              message.id,
              "not_helpful",
              reason,
              comment.trim() || undefined,
              noStorage && shareWithReviewers
                ? { questionText: question, answerText: message.content }
                : undefined,
            );
            setSent(true);
            setNote(t("chat.feedbackThanks"));
          } catch {
            setNote(t("chat.feedbackError"));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="form-field">
          {t("feedback.reason")}
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="wrong_information">{t("feedback.wrong")}</option>
            <option value="unsafe">{t("feedback.unsafe")}</option>
            <option value="unnatural_language">{t("feedback.language")}</option>
            <option value="other">{t("feedback.other")}</option>
          </select>
        </label>
        <label className="form-field">
          {t("feedback.comment")}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={3}
          />
        </label>
        {noStorage && (
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={shareWithReviewers}
              onChange={(e) => setShareWithReviewers(e.target.checked)}
            />
            <span>{t("feedback.shareWithReviewers")}</span>
          </label>
        )}
        <p className="status-note" role="status">
          {note}
        </p>
        <div className="dialog-footer">
          <button type="button" className="button button-ghost" onClick={close}>
            {t("common.close")}
          </button>
          <button className="button button-primary" disabled={busy || sent}>
            {t(
              busy
                ? "feedback.sending"
                : sent
                  ? "common.saved"
                  : "feedback.submit",
            )}
          </button>
        </div>
      </form>
      <div className="github-report">
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={include}
            onChange={(e) => setInclude(e.target.checked)}
          />
          <span>{t("feedback.include")}</span>
        </label>
        <p className="quiet">{t("feedback.public")}</p>
        <a
          className="text-link"
          href={issue}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("feedback.github")}
          <ArrowUpRight size={15} />
        </a>
      </div>
    </Dialog>
  );
}
