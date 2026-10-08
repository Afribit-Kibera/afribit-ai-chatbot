import { Lock } from "lucide-react";
import { useI18n } from "../lib/i18n.js";
import { usePack } from "../lib/pack.js";
import { fill, privacyCopy } from "../lib/privacy.js";

/**
 * Where your question goes and how long it is kept, in one sentence that is true for this server
 * (docs/features/F-001-model-location-label.md). The server says it in GET /api/v1/pack → service.
 */
export function PrivacyLine({ className = "privacy-line" }: { className?: string }) {
  const { t } = useI18n();
  const pack = usePack();
  const copy = privacyCopy(pack.service);
  return (
    <p className={className} data-location={pack.service?.modelLocation ?? "unknown"}>
      <Lock size={14} aria-hidden="true" />
      <span>
        {t(copy.location)}
        {copy.retention ? ` ${fill(t(copy.retention), { days: copy.days })}` : ""}
      </span>
    </p>
  );
}

/** The small header label ("Stays here", "Afribit, Kenya" …) that opens the full sentence. */
export function PrivacyChip({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  const pack = usePack();
  const copy = privacyCopy(pack.service);
  return (
    <button
      type="button"
      className="privacy-chip"
      onClick={onOpen}
      aria-label={`${t("privacy.title")}: ${t(copy.short)}`}
    >
      <Lock size={13} aria-hidden="true" />
      <span>{t(copy.short)}</span>
    </button>
  );
}
