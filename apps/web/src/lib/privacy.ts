/**
 * The privacy sentence members see (docs/features/F-001-model-location-label.md, F-002-privacy-settings.md).
 * The API publishes where the model runs and how long chats are kept (GET /api/v1/pack → service); this
 * turns that into translation keys. Rule: never say "your questions stay here" unless the server says
 * the model is the community's own ("community"). Unknown (an older API, offline) says only "see the notice".
 */
export type ModelLocation = "community" | "afribit" | "hybrid" | "cloud" | "remote";
export interface ServiceInfo {
  modelLocation: ModelLocation;
  retention: { mode: "none" | "days" | "keep"; days: number | null };
}

const LOCATIONS: readonly ModelLocation[] = ["community", "afribit", "hybrid", "cloud", "remote"];

export function parseService(value: unknown): ServiceInfo | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { modelLocation?: unknown; retention?: unknown };
  if (typeof v.modelLocation !== "string" || !LOCATIONS.includes(v.modelLocation as ModelLocation)) return null;
  const r = (v.retention ?? {}) as { mode?: unknown; days?: unknown };
  const mode = r.mode === "none" || r.mode === "days" || r.mode === "keep" ? r.mode : null;
  if (!mode) return null;
  const days = mode === "days" && typeof r.days === "number" && Number.isInteger(r.days) && r.days > 0 ? r.days : null;
  if (mode === "days" && days === null) return null;
  return { modelLocation: v.modelLocation as ModelLocation, retention: { mode, days } };
}

export type PrivacyLocationKey =
  | "privacy.location.community"
  | "privacy.location.afribit"
  | "privacy.location.hybrid"
  | "privacy.location.cloud"
  | "privacy.location.remote"
  | "privacy.location.unknown";
export type PrivacyShortKey =
  | "privacy.short.community"
  | "privacy.short.afribit"
  | "privacy.short.hybrid"
  | "privacy.short.cloud"
  | "privacy.short.remote"
  | "privacy.short.unknown";
export type PrivacyRetentionKey = "privacy.retention.none" | "privacy.retention.days" | "privacy.retention.keep";

export interface PrivacyCopy {
  location: PrivacyLocationKey;
  short: PrivacyShortKey;
  retention: PrivacyRetentionKey | null;
  days: number | null;
  /** True only when the model is the community's own: the one case the app may say "stays here". */
  staysHere: boolean;
}

export function privacyCopy(service: ServiceInfo | null): PrivacyCopy {
  if (!service) return { location: "privacy.location.unknown", short: "privacy.short.unknown", retention: null, days: null, staysHere: false };
  const loc = service.modelLocation;
  return {
    location: `privacy.location.${loc}`,
    short: `privacy.short.${loc}`,
    retention: `privacy.retention.${service.retention.mode}`,
    days: service.retention.days,
    staysHere: loc === "community",
  };
}

/** Fills the {name} and {days} placeholders in a translated sentence. */
export function fill(text: string, values: { name?: string; days?: number | null }): string {
  return text.replace("{name}", values.name ?? "").replace("{days}", values.days != null ? String(values.days) : "");
}
