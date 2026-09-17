import { useEffect, useMemo, useRef, useState } from "react";
import { animate } from "animejs";
import { ArrowLeft, ArrowRight, Bitcoin, Languages, ShieldCheck, Sparkles } from "lucide-react";
import type { ExplanationLevel, LanguageMode } from "@afribit/shared";
import { BrandMark } from "./BrandMark.js";
import { Button } from "./ui/button.js";
import { cn } from "../lib/utils.js";

export type OnboardingGoal = "understand" | "avoid_scams" | "send_save";
export type OnboardingExperience = "new" | "some" | "confident";

export interface OnboardingProfile {
  goal: OnboardingGoal;
  experience: OnboardingExperience;
}

interface OnboardingProps {
  onComplete: (profile: OnboardingProfile & { languageMode: LanguageMode; explanationLevel: ExplanationLevel }) => void;
  onSkip: () => void;
}

type StepId = "goal" | "experience" | "language" | "review";

const STEPS: StepId[] = ["goal", "experience", "language", "review"];

const GOAL_OPTIONS: { value: OnboardingGoal; label: string; helper: string; icon: typeof Bitcoin }[] = [
  { value: "understand", label: "Understand Bitcoin", helper: "Start from the basics.", icon: Bitcoin },
  { value: "avoid_scams", label: "Avoid scams", helper: "Spot red flags mapema.", icon: ShieldCheck },
  { value: "send_save", label: "Send or save safely", helper: "Practical steps, no hype.", icon: Sparkles },
];

const EXPERIENCE_OPTIONS: { value: OnboardingExperience; label: string; helper: string; explanationLevel: ExplanationLevel }[] = [
  { value: "new", label: "Niko new kabisa", helper: "Go slowly, one idea at a time.", explanationLevel: "simple" },
  { value: "some", label: "Najua kidogo", helper: "Use examples, but keep it focused.", explanationLevel: "normal" },
  { value: "confident", label: "Niko confident", helper: "You can go deeper when needed.", explanationLevel: "deep" },
];

const LANGUAGE_OPTIONS: { value: LanguageMode; label: string; helper: string }[] = [
  { value: "mixed_ke", label: "Mix Sheng + English", helper: "Natural code-switching." },
  { value: "sheng", label: "Strict Sheng", helper: "Keep it local and casual." },
  { value: "swahili", label: "Kiswahili only", helper: "Clear, natural Kiswahili." },
  { value: "simple_en", label: "Simple English", helper: "Short English, no jargon." },
];

const LANGUAGE_SUMMARY: Record<LanguageMode, string> = {
  mixed_ke: "Mix Sheng + English",
  sheng: "Strict Sheng",
  swahili: "Kiswahili only",
  simple_en: "Simple English",
};

const GOAL_SUMMARY: Record<OnboardingGoal, string> = {
  understand: "Understand Bitcoin",
  avoid_scams: "Avoid scams",
  send_save: "Send or save safely",
};

const EXPERIENCE_SUMMARY: Record<OnboardingExperience, string> = {
  new: "New kabisa",
  some: "Najua kidogo",
  confident: "Confident",
};

function getStepCopy(step: StepId) {
  if (step === "goal") {
    return {
      eyebrow: "Set up Afribit",
      question: "Sasa, unataka kusaidiwa na nini first?",
      helper: "Pick one. You can always change direction later kwa chat.",
    };
  }
  if (step === "experience") {
    return {
      eyebrow: "Your level",
      question: "Uko level gani na Bitcoin saa hii?",
      helper: "This helps me decide how slow or deep to explain.",
    };
  }
  if (step === "language") {
    return {
      eyebrow: "Voice",
      question: "Unataka niongee aje?",
      helper: "Later, you can just tell me: speak Kiswahili, use Sheng, or keep it simple.",
    };
  }
  return {
    eyebrow: "Ready",
    question: "Tuko set. Afribit itajibu kulingana na wewe.",
    helper: "Your setup stays light: goal, level, and voice. No complicated profile.",
  };
}

/** PRD section 9.1: onboarding must remain skippable. */
export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [goal, setGoal] = useState<OnboardingGoal>("understand");
  const [experience, setExperience] = useState<OnboardingExperience>("new");
  const [languageMode, setLanguageMode] = useState<LanguageMode>("mixed_ke");
  const cardRef = useRef<HTMLDivElement>(null);
  const step = STEPS[stepIndex] ?? "goal";
  const copy = getStepCopy(step);
  const selectedExperience = EXPERIENCE_OPTIONS.find((option) => option.value === experience) ?? EXPERIENCE_OPTIONS[0]!;
  const progress = `${stepIndex + 1} of ${STEPS.length}`;

  const canGoBack = stepIndex > 0;
  const isLastStep = step === "review";

  const summary = useMemo(
    () => [
      { label: "Goal", value: GOAL_SUMMARY[goal] },
      { label: "Level", value: EXPERIENCE_SUMMARY[experience] },
      { label: "Voice", value: LANGUAGE_SUMMARY[languageMode] },
    ],
    [experience, goal, languageMode],
  );

  useEffect(() => {
    if (!cardRef.current) return;
    animate(cardRef.current, {
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 280,
      ease: "outQuad",
    });
  }, [step]);

  function goNext() {
    if (isLastStep) {
      onComplete({
        goal,
        experience,
        languageMode,
        explanationLevel: selectedExperience.explanationLevel,
      });
      return;
    }
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-bg-base">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(247,147,26,0.2),transparent_34%),radial-gradient(circle_at_10%_80%,rgba(0,135,81,0.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(244,245,240,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(244,245,240,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-35" />

      <main className="relative mx-auto flex min-h-full w-full max-w-md flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <BrandMark size="sm" className="items-start" />
          <div className="text-right">
            <p className="font-mono text-[11px] uppercase text-text-faint">{progress}</p>
            <div className="mt-2 flex gap-1">
              {STEPS.map((item, index) => (
                <span
                  key={item}
                  className={cn("h-1.5 w-7 rounded-full", index <= stepIndex ? "bg-bitcoin" : "bg-bg-muted")}
                />
              ))}
            </div>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <div ref={cardRef} key={step} className="rounded-xl border border-border-soft bg-bg-surface/90 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <p className="font-mono text-[11px] uppercase text-bitcoin-light">{copy.eyebrow}</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-text-base">{copy.question}</h1>
            <p className="mt-3 text-sm leading-6 text-text-muted">{copy.helper}</p>

            {step === "goal" && (
              <div className="mt-7 grid gap-3">
                {GOAL_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setGoal(option.value);
                        setTimeout(goNext, 120);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                        goal === option.value ? "border-bitcoin bg-bitcoin/10" : "border-border-strong bg-bg-base/50 hover:border-bitcoin/60",
                      )}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-accent text-bitcoin-light">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold text-text-base">{option.label}</span>
                        <span className="mt-0.5 block text-sm text-text-muted">{option.helper}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-text-faint" />
                    </button>
                  );
                })}
              </div>
            )}

            {step === "experience" && (
              <div className="mt-7 grid gap-3">
                {EXPERIENCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setExperience(option.value);
                      setTimeout(goNext, 120);
                    }}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      experience === option.value ? "border-bitcoin bg-bitcoin/10" : "border-border-strong bg-bg-base/50 hover:border-bitcoin/60",
                    )}
                  >
                    <span className="block text-base font-semibold text-text-base">{option.label}</span>
                    <span className="mt-1 block text-sm text-text-muted">{option.helper}</span>
                  </button>
                ))}
              </div>
            )}

            {step === "language" && (
              <div className="mt-7 grid gap-3">
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setLanguageMode(option.value);
                      setTimeout(goNext, 120);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                      languageMode === option.value ? "border-bitcoin bg-bitcoin/10" : "border-border-strong bg-bg-base/50 hover:border-bitcoin/60",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-accent text-bitcoin-light">
                      <Languages className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-base font-semibold text-text-base">{option.label}</span>
                      <span className="mt-0.5 block text-sm text-text-muted">{option.helper}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {step === "review" && (
              <div className="mt-7 grid gap-3">
                {summary.map((item) => (
                  <div key={item.label} className="rounded-lg border border-border-strong bg-bg-base/50 p-4">
                    <p className="font-mono text-[10px] uppercase text-text-faint">{item.label}</p>
                    <p className="mt-1 text-base font-semibold text-text-base">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="grid gap-3 pb-2">
          <Button className="w-full justify-between" onClick={goNext}>
            {isLastStep ? "Start chatting" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={!canGoBack}
              className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm text-text-muted transition-colors hover:text-text-base disabled:pointer-events-none disabled:opacity-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button type="button" onClick={onSkip} className="h-10 px-2 text-sm text-text-muted transition-colors hover:text-text-base">
              Skip setup
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
