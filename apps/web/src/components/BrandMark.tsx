import { useState } from "react";
import { cn } from "../lib/utils.js";
import { BUILTIN_BRANDING, type PackBranding } from "../lib/pack.js";
export function BrandMark({
  size = "md",
  tagline = false,
  brand,
  className,
}: {
  size?: "sm" | "md" | "lg";
  tagline?: boolean;
  /** A community pack's branding. Left out (the public site) or the built-in one: Afribit's own mark and name. */
  brand?: PackBranding;
  className?: string;
}) {
  const [logoFailed, setLogoFailed] = useState<string | null>(null);
  const logo =
    brand?.logoUrl && logoFailed !== brand.logoUrl ? brand.logoUrl : null;
  const custom = Boolean(
    brand && (logo || brand.shortName !== BUILTIN_BRANDING.shortName),
  );
  return (
    <span className={cn("brand", `brand-${size}`, className)}>
      {logo && brand ? (
        <img
          className="brand-logo"
          src={logo}
          alt={brand.shortName}
          onError={() => setLogoFailed(logo)}
        />
      ) : custom && brand ? (
        <span className="brand-lockup">
          <span>{brand.shortName}</span>
        </span>
      ) : (
        <span className="brand-lockup">
          <img
            src="/brand/afribit-mark-icon.png"
            width="38"
            height="44"
            alt=""
          />
          <span>
            Afribit<span className="brand-ai"> AI</span>
          </span>
        </span>
      )}
      {tagline && (!custom || brand?.tagline) && (
        <span className="brand-tagline">
          {custom ? brand?.tagline : "Smarter communities. Brighter futures."}
        </span>
      )}
    </span>
  );
}
