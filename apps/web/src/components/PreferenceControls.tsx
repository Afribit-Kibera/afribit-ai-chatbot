import type { Preferences } from "../lib/preferences.js";
import { useI18n } from "../lib/i18n.js";
import { usePack } from "../lib/pack.js";
export function PreferenceControls({
  preferences,
  update,
}: {
  preferences: Preferences;
  update: (next: Partial<Preferences>) => void;
}) {
  const { t } = useI18n();
  const pack = usePack();
  return (
    <>
      <label className="field-select">
        <span>{t("common.language")}</span>
        <select
          value={preferences.languageMode}
          onChange={(e) =>
            update({
              languageMode: e.target.value,
            })
          }
        >
          {pack.modes.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field-select">
        <span>{t("common.level")}</span>
        <select
          value={preferences.explanationLevel}
          onChange={(e) =>
            update({
              explanationLevel: e.target
                .value as Preferences["explanationLevel"],
            })
          }
        >
          <option value="simple">{t("common.simple")}</option>
          <option value="normal">{t("common.normal")}</option>
          <option value="deep">{t("common.deep")}</option>
        </select>
      </label>
    </>
  );
}
