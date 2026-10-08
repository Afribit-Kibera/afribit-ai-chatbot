import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { Preferences } from "../lib/preferences.js";
import { useI18n } from "../lib/i18n.js";
import { resolveMode, usePack } from "../lib/pack.js";
import { Dialog } from "./ui/Dialog.js";
export function Onboarding({
  open,
  preferences,
  complete,
}: {
  open: boolean;
  preferences: Preferences;
  complete: (p: Preferences) => void;
}) {
  const { t } = useI18n();
  const pack = usePack();
  const [step, setStep] = useState(1);
  const [choices, setChoices] = useState(preferences);
  const selectedMode = resolveMode(pack, choices.languageMode);
  const finish = () => complete({ ...choices, languageMode: selectedMode });
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) finish();
      }}
      title={t("onboarding.title")}
      description={t("onboarding.description")}
    >
      <p className="onboarding-progress">
        {t("onboarding.step")} {step} / 3
      </p>
      <h3 className="setup-heading">
        {t(
          step === 1
            ? "onboarding.language"
            : step === 2
              ? "onboarding.level"
              : "onboarding.honesty",
        )}
      </h3>
      {step === 1 ? (
        <div className="choice-grid">
          {pack.modes.map((o) => (
            <button
              key={o.id}
              className="choice"
              aria-pressed={selectedMode === o.id}
              onClick={() => setChoices({ ...choices, languageMode: o.id })}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : step === 2 ? (
        <div className="level-choices">
          {(["simple", "normal", "deep"] as const).map((value) => (
            <button
              key={value}
              className="choice"
              aria-pressed={choices.explanationLevel === value}
              onClick={() =>
                setChoices({ ...choices, explanationLevel: value })
              }
            >
              {t(`common.${value}`)}
              <span>{t(`onboarding.${value}`)}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="setup-rule">{t("onboarding.body")}</p>
          <div className="notice">
            <ShieldCheck size={21} />
            <p>{t("onboarding.rule")}</p>
          </div>
          <a
            className="text-link"
            href="/privacy"
            target="_blank"
            rel="noopener"
          >
            {t("common.privacy")}
          </a>
        </>
      )}
      <div className="dialog-footer">
        <button className="button button-ghost" onClick={finish}>
          {t("onboarding.skip")}
        </button>
        <button
          className="button button-primary"
          onClick={() => (step < 3 ? setStep(step + 1) : finish())}
        >
          {t(step < 3 ? "common.continue" : "onboarding.start")}
          <ArrowRight size={16} />
        </button>
      </div>
    </Dialog>
  );
}
