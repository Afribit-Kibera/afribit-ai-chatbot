import { useEffect, useSyncExternalStore } from "react";
import type { LanguageModeId } from "@afribit/shared";
import { API_BASE } from "./api.js";
import { readStorage, writeStorage } from "./storage.js";
import { parseService, type ServiceInfo } from "./privacy.js";

/** What the app needs to know about the community pack the API serves (GET /api/v1/pack). */
export interface PackMode {
  id: LanguageModeId;
  label: string;
  description: string;
}
/** White-label presentation from the pack (GET /api/v1/pack "branding"). */
export interface PackBranding {
  shortName: string;
  tagline: string | null;
  /** #rrggbb, or null to keep the app's own colour. */
  accentColor: string | null;
  /** Text colour to put on the accent (white or near-black). */
  accentInk: string | null;
  /** Ready to use as an <img src>, or null for the built-in mark. */
  logoUrl: string | null;
  /** Optional first-screen wording in the community's own language; null = the app's built-in text. */
  welcomeTitle: string | null;
  welcomeText: string | null;
  composerPlaceholder: string | null;
  poweredBy: { show: boolean; label: string; url: string };
}
export interface PackInfo {
  name: string;
  /** What the pack is about ("bitcoin", "library", ...). The built-in starter questions and scam shortcut are Bitcoin ones. */
  domainId: string;
  defaultMode: LanguageModeId;
  modes: PackMode[];
  starterQuestions: {
    reviewed: boolean;
    byMode: Record<string, string[]>;
  } | null;
  disclaimers: string[];
  branding: PackBranding;
  /** Where the model runs and how long chats are kept (F-001/F-002); null when the server did not say. */
  service: ServiceInfo | null;
}

export const PACK_KEY = "afribit.pack";

export const DEFAULT_POWERED_BY = {
  label: "Powered by Afribit AI",
  url: "https://github.com/afribit/afribit-ai",
};

/** Kibera is Afribit itself: its name, its colours, its mark, and no "Powered by" line. */
export const BUILTIN_BRANDING: PackBranding = {
  shortName: "Afribit AI",
  tagline: null,
  accentColor: null,
  accentInk: null,
  logoUrl: null,
  welcomeTitle: null,
  welcomeText: null,
  composerPlaceholder: null,
  poweredBy: { show: false, ...DEFAULT_POWERED_BY },
};

/**
 * Built-in Kibera pack. Used when the API cannot be reached (offline, older API without /pack).
 * Labels match the existing interface wording. Empty disclaimers and no starters mean
 * "use the interface's own copy".
 */
export const BUILTIN_PACK: PackInfo = {
  name: "Afribit AI",
  domainId: "bitcoin",
  defaultMode: "mixed_ke",
  modes: [
    {
      id: "simple_en",
      label: "English",
      description: "Simple English: short sentences, everyday words.",
    },
    {
      id: "swahili",
      label: "Kiswahili",
      description:
        "Clear, natural Kiswahili; conversational unless the learner is formal.",
    },
    {
      id: "sheng",
      label: "Sheng",
      description:
        "Community Teaching Sheng: natural Nairobi/Kibera speech, composed directly rather than translated.",
    },
    {
      id: "mixed_ke",
      label: "Mixed",
      description:
        "Mirrors how the learner mixes Sheng, Kiswahili and English.",
    },
  ],
  starterQuestions: null,
  disclaimers: [],
  branding: BUILTIN_BRANDING,
  service: null,
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const HEX = /^#[0-9a-fA-F]{6}$/;
const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
};
export const INK_LIGHT = "#ffffff";
export const INK_DARK = "#111111";

/** Mixes a #rrggbb colour toward white or black by `amount` (0 to 1). */
export function mix(
  hex: string,
  toward: "#ffffff" | "#000000",
  amount: number,
) {
  const n = parseInt(hex.slice(1), 16);
  const t = toward === "#ffffff" ? 255 : 0;
  const part = (shift: number) =>
    Math.round(((n >> shift) & 255) * (1 - amount) + t * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${part(16)}${part(8)}${part(0)}`;
}

/** The CSS variables a pack's accent sets on :root. Empty when there is no (usable) accent: the app keeps its own colours. */
export function brandVars(b: PackBranding): Record<string, string> {
  const accent = b.accentColor;
  if (!accent || !HEX.test(accent)) return {};
  const light = b.accentInk === INK_LIGHT;
  const rgb = parseInt(accent.slice(1), 16);
  return {
    "--bitcoin": accent,
    // Hover colour: lighter under dark text, darker under white text, so the text stays readable on hover.
    "--bitcoin-light": light
      ? mix(accent, "#000000", 0.14)
      : mix(accent, "#ffffff", 0.25),
    "--bitcoin-dark": mix(accent, "#000000", 0.2),
    "--border-accent": `rgba(${(rgb >> 16) & 255}, ${(rgb >> 8) & 255}, ${rgb & 255}, 0.4)`,
    "--accent-ink": b.accentInk ?? INK_DARK,
  };
}

const BRAND_VARS = [
  "--bitcoin",
  "--bitcoin-light",
  "--bitcoin-dark",
  "--border-accent",
  "--accent-ink",
] as const;
type StyleTarget = {
  style: {
    setProperty(name: string, value: string): void;
    removeProperty(name: string): unknown;
  };
};

/** Sets the pack's accent on an element (the root), or removes every override so the app's own colours apply. */
export function applyBranding(el: StyleTarget, b: PackBranding) {
  const vars = brandVars(b);
  for (const name of BRAND_VARS) {
    const value = vars[name];
    if (value) el.style.setProperty(name, value);
    else el.style.removeProperty(name);
  }
}

/** "Chat — Reading Room". The pack's short name replaces the product name. */
export const titleFor = (page: string, b: PackBranding) =>
  `${page} — ${b.shortName}`;

const shortText = (v: unknown, max: number): string | null =>
  nonEmpty(v) && v.trim().length <= max ? v.trim() : null;

function parseBranding(value: unknown): PackBranding {
  if (!isObject(value)) return BUILTIN_BRANDING;
  let accentColor: string | null = null;
  let accentInk: string | null = null;
  if (nonEmpty(value.accentColor) && HEX.test(value.accentColor)) {
    const accent = value.accentColor.toLowerCase();
    // Trust the API's ink only if it is one of ours; otherwise work it out. Unreadable accents are ignored.
    const ink =
      value.accentInk === INK_LIGHT || value.accentInk === INK_DARK
        ? value.accentInk
        : contrast(accent, INK_LIGHT) >= contrast(accent, INK_DARK)
          ? INK_LIGHT
          : INK_DARK;
    if (contrast(accent, ink) >= 4.5) {
      accentColor = accent;
      accentInk = ink;
    }
  }
  const p = isObject(value.poweredBy) ? value.poweredBy : {};
  let url: string = DEFAULT_POWERED_BY.url;
  if (nonEmpty(p.url)) {
    try {
      if (new URL(p.url).protocol === "https:") url = p.url;
    } catch {
      /* keep the default */
    }
  }
  const logo = value.logoUrl;
  return {
    shortName:
      nonEmpty(value.shortName) && value.shortName.length <= 60
        ? value.shortName.trim()
        : BUILTIN_BRANDING.shortName,
    tagline:
      nonEmpty(value.tagline) && value.tagline.length <= 300
        ? value.tagline.trim()
        : null,
    accentColor,
    accentInk,
    // Only a path on the API; never another site or a script address.
    logoUrl:
      typeof logo === "string" && /^\/(?!\/)/.test(logo)
        ? `${API_BASE}${logo}`
        : null,
    welcomeTitle: shortText(value.welcomeTitle, 80),
    welcomeText: shortText(value.welcomeText, 220),
    composerPlaceholder: shortText(value.composerPlaceholder, 60),
    poweredBy: {
      show: p.show !== false,
      label:
        nonEmpty(p.label) && p.label.length <= 60
          ? p.label.trim()
          : DEFAULT_POWERED_BY.label,
      url,
    },
  };
}

/** Accepts an API or cached value and returns a safe PackInfo, or null if it is unusable. */
export function parsePack(value: unknown): PackInfo | null {
  if (!isObject(value) || !Array.isArray(value.modes)) return null;
  const modes: PackMode[] = [];
  for (const m of value.modes) {
    if (!isObject(m) || !nonEmpty(m.id) || modes.some((x) => x.id === m.id))
      continue;
    modes.push({
      id: m.id,
      label: nonEmpty(m.label) ? m.label : m.id,
      description: typeof m.description === "string" ? m.description : "",
    });
  }
  if (!modes.length) return null;
  let starterQuestions: PackInfo["starterQuestions"] = null;
  const sq = value.starterQuestions;
  if (isObject(sq) && isObject(sq.byMode)) {
    const byMode: Record<string, string[]> = {};
    for (const [id, list] of Object.entries(sq.byMode))
      if (Array.isArray(list)) byMode[id] = list.filter(nonEmpty);
    starterQuestions = { reviewed: sq.reviewed === true, byMode };
  }
  const domain = isObject(value.domain) ? value.domain : {};
  return {
    name: nonEmpty(value.name) ? value.name : BUILTIN_PACK.name,
    // An older API says nothing about its domain: keep the app as it has always been (Bitcoin).
    domainId: nonEmpty(domain.id) ? domain.id : BUILTIN_PACK.domainId,
    defaultMode:
      nonEmpty(value.defaultMode) &&
      modes.some((m) => m.id === value.defaultMode)
        ? value.defaultMode
        : modes[0]!.id,
    modes,
    starterQuestions,
    disclaimers: Array.isArray(value.disclaimers)
      ? value.disclaimers.filter(nonEmpty)
      : [],
    // No branding at all (an older API or cache) is the app as it has always looked.
    branding: parseBranding(value.branding),
    service: parseService(value.service),
  };
}

/** A stored mode that this pack does not offer falls back to the pack's default. */
export function resolveMode(
  pack: PackInfo,
  stored: string | null | undefined,
): LanguageModeId {
  return stored && pack.modes.some((m) => m.id === stored)
    ? stored
    : pack.defaultMode;
}

/** Starter questions for a mode, or null when the pack has none (keep the built-in ones). */
export function startersFor(
  pack: PackInfo,
  mode: LanguageModeId,
): { questions: string[]; reviewed: boolean } | null {
  const list = pack.starterQuestions?.byMode[mode];
  return list?.length
    ? { questions: list, reviewed: pack.starterQuestions!.reviewed }
    : null;
}

export async function fetchPack(
  signal?: AbortSignal,
): Promise<PackInfo | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/pack`, { signal });
    if (!response.ok) return null;
    return parsePack(await response.json());
  } catch {
    return null;
  }
}

// ---- shared store: memory first, then localStorage, then the built-in pack --------------------------
let current: PackInfo | null = null;
let refreshing: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function getPack(): PackInfo {
  if (!current)
    current = parsePack(readStorage<unknown>(PACK_KEY, null)) ?? BUILTIN_PACK;
  return current;
}

/** Fetches the live pack once at a time, caches it, and notifies subscribers. Never throws. */
export function refreshPack(): Promise<void> {
  refreshing ??= fetchPack()
    .then((pack) => {
      if (!pack) return;
      writeStorage(PACK_KEY, pack);
      if (JSON.stringify(pack) !== JSON.stringify(getPack())) {
        current = pack;
        listeners.forEach((l) => l());
      }
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Stale-while-revalidate: renders the cached or built-in pack immediately, then updates. */
export function usePack(): PackInfo {
  const pack = useSyncExternalStore(subscribe, getPack, () => BUILTIN_PACK);
  useEffect(() => {
    void refreshPack();
  }, []);
  return pack;
}

/** For tests. */
export function resetPackCache() {
  current = null;
  refreshing = null;
}
