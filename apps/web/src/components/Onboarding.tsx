import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import type { ExplanationLevel, LanguageMode } from "@afribit/shared";
import { BrandMark } from "./BrandMark.js";
import { Button } from "./ui/button.js";
import { cn } from "../lib/utils.js";

interface OnboardingProps {
  onComplete: (languageMode: LanguageMode, explanationLevel: ExplanationLevel) => void;
  onSkip: () => void;
}

const LANGUAGE_OPTIONS: { value: LanguageMode; label: string }[] = [
  { value: "simple_en", label: "Simple English" },
  { value: "swahili", label: "Kiswahili" },
  { value: "sheng", label: "Sheng" },
  { value: "mixed_ke", label: "Mix naturally" },
];

const LEVEL_OPTIONS: { value: ExplanationLevel; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "normal", label: "Normal" },
  { value: "deep", label: "Deep dive" },
];

/** PRD §9.1 — onboarding must be skippable. */
export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageMode>("mixed_ke");
  const [selectedLevel, setSelectedLevel] = useState<ExplanationLevel>("normal");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    animate(rootRef.current.querySelectorAll(".onboarding-reveal"), {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 500,
      delay: stagger(70),
      ease: "outQuad",
    });
  }, []);

  return (
    <div ref={rootRef} className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <div className="onboarding-reveal flex flex-col items-center text-center">
        <BrandMark size="lg" tagline />
      </div>

      <div className="onboarding-reveal">
        <h2 className="mb-3 text-sm font-medium text-text-soft">How should I explain things?</h2>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectedLanguage(opt.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                selectedLanguage === opt.value
                  ? "border-bitcoin bg-bitcoin/10 text-bitcoin-light"
                  : "border-border-strong text-text-soft hover:border-text-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="onboarding-reveal">
        <h2 className="mb-3 text-sm font-medium text-text-soft">How detailed should answers be?</h2>
        <div className="flex flex-wrap gap-2">
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectedLevel(opt.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                selectedLevel === opt.value
                  ? "border-bitcoin bg-bitcoin/10 text-bitcoin-light"
                  : "border-border-strong text-text-soft hover:border-text-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="onboarding-reveal flex items-center gap-3">
        <Button className="flex-1" onClick={() => onComplete(selectedLanguage, selectedLevel)}>
          Start chatting
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
}
