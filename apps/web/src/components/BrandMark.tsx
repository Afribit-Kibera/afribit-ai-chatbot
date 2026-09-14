import { cn } from "../lib/utils.js";

interface BrandMarkProps {
  size?: "sm" | "md" | "lg";
  /** Shows the brand tagline below the lockup — only meaningful at "lg". */
  tagline?: boolean;
  className?: string;
}

const ICON_SIZES: Record<NonNullable<BrandMarkProps["size"]>, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-14 w-14",
};

const TEXT_SIZES: Record<NonNullable<BrandMarkProps["size"]>, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-3xl",
};

/**
 * Icon + wordmark lockup, matching the selected identity direction
 * (logo/Afribit AI logo concept.png): "Afribit" heavy + "AI" in a lighter
 * grey, same weight/font — not a color-accented suffix. Wordmark font is
 * Poppins specifically (--font-wordmark), distinct from Space Grotesk used
 * for headings elsewhere — see docs/BRAND.md.
 */
export function BrandMark({ size = "md", tagline = false, className }: BrandMarkProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex items-center gap-2.5">
        <img src="/brand/afribit-mark-icon.png" alt="" className={cn(ICON_SIZES[size], "shrink-0")} />
        <span className={cn("font-wordmark font-extrabold tracking-tight text-text-base", TEXT_SIZES[size])}>
          Afribit<span className="text-text-muted"> AI</span>
        </span>
      </div>
      {tagline && <p className="text-sm text-text-muted">Smarter communities. Brighter futures.</p>}
    </div>
  );
}
