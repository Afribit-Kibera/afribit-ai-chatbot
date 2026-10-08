import { ArrowUpRight } from "lucide-react";
import type { PackBranding } from "../lib/pack.js";
import { cn } from "../lib/utils.js";

/** The small "Powered by Afribit AI" attribution a white-labelled deployment keeps (docs/BRANDING.md). Nothing when the pack hides it. */
export function PoweredBy({
  brand,
  className,
}: {
  brand: PackBranding;
  className?: string;
}) {
  if (!brand.poweredBy.show) return null;
  return (
    <p className={cn("powered-by", className)}>
      <a href={brand.poweredBy.url} target="_blank" rel="noopener">
        {brand.poweredBy.label}
        <ArrowUpRight size={11} aria-hidden="true" />
      </a>
    </p>
  );
}
