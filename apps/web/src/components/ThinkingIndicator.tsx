import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { useI18n } from "../lib/i18n.js";
export function ThinkingIndicator() {
  const { t } = useI18n();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !root.current
    )
      return;
    const animation = animate(root.current.querySelectorAll(".thinking-node"), {
      opacity: [0.25, 1],
      scale: [0.8, 1.15],
      delay: stagger(180),
      duration: 650,
      alternate: true,
      loop: true,
      ease: "inOutSine",
    });
    return () => {
      animation.revert();
    };
  }, []);
  return (
    <div ref={root} className="thinking" role="status">
      <div className="thinking-nodes" aria-hidden="true">
        <span className="thinking-node" />
        <span className="thinking-node" />
        <span className="thinking-node" />
      </div>
      <span>{t("chat.thinking")}</span>
    </div>
  );
}
