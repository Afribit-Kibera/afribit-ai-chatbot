import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { PackBranding } from "./types.js";

/**
 * White-label branding for a pack (pack.json "branding"; docs/guides/white-label-guide.md).
 *
 * Branding is presentation only: it is read here, served by routes/pack.ts, and never enters a prompt.
 * The logo file is read from the pack folder itself (never through the Voice Lab overrides, which only
 * reach the wording files loadPack asks for by name), checked once at load, and kept in memory so what
 * is served is exactly what was validated.
 */

export const DEFAULT_POWERED_BY_LABEL = "Powered by Afribit AI";
export const DEFAULT_POWERED_BY_URL = "https://github.com/afribit/afribit-ai";
export const MAX_LOGO_BYTES = 200 * 1024;
export const INK_LIGHT = "#ffffff";
export const INK_DARK = "#111111";
/** The dark theme's card surface; an accent this close to it is hard to see as an icon or focus ring. */
const DARK_SURFACE = "#121512";

const HEX = /^#[0-9a-fA-F]{6}$/;
const LOGO_PATH = /^brand\/[A-Za-z0-9][A-Za-z0-9_-]*\.(svg|png|webp)$/;
const CONTROL = /[\u0000-\u001f\u007f]/;
const KNOWN_KEYS = ["shortName", "tagline", "accentColor", "logo", "poweredBy", "welcomeTitle", "welcomeText", "composerPlaceholder"];
const CONTENT_TYPES: Record<string, string> = { svg: "image/svg+xml", png: "image/png", webp: "image/webp" };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
/** WCAG 2.x contrast ratio between two #rrggbb colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Which text colour to put on this accent, and how well it reads; ink is null when neither reaches AA (4.5:1). */
export function pickInk(accent: string): { ink: string | null; ratio: number; white: number; dark: number } {
  const white = contrastRatio(accent, INK_LIGHT);
  const dark = contrastRatio(accent, INK_DARK);
  const best = dark >= white ? { ink: INK_DARK, ratio: dark } : { ink: INK_LIGHT, ratio: white };
  return { ink: best.ratio >= 4.5 ? best.ink : null, ratio: best.ratio, white, dark };
}

/**
 * Why an SVG is not safe to serve as a logo, or null if it is. A logo is a picture: no script, no event
 * handlers, no foreignObject, nothing fetched from elsewhere. (It is also served with a sandbox CSP.)
 */
export function svgProblem(svg: string): string | null {
  if (!/<svg[\s>]/i.test(svg)) return "it does not look like an SVG (no <svg> element)";
  if (/<script/i.test(svg)) return "it contains a <script> element";
  if (/<foreignObject/i.test(svg)) return "it contains a <foreignObject> element";
  if (/<(iframe|embed|object|audio|video)[\s>/]/i.test(svg)) return "it embeds another document (iframe, embed or object)";
  if (/[\s"'/]on[a-z]+\s*=/i.test(svg)) return "it contains an event-handler attribute (onclick, onload ...)";
  if (/javascript:/i.test(svg)) return 'it contains a "javascript:" address';
  if (/<!ENTITY/i.test(svg)) return "it declares XML entities";
  if (/@import/i.test(svg)) return "it imports a style sheet (@import)";
  for (const m of svg.matchAll(/(?:xlink:)?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const target = (m[1] ?? m[2] ?? "").trim();
    if (!target.startsWith("#")) return `it refers to an external address (href="${target.slice(0, 40)}"); only links to its own parts (#id) are allowed`;
  }
  for (const m of svg.matchAll(/url\(\s*(['"]?)([^)'"]*)\1\s*\)/gi)) {
    const target = (m[2] ?? "").trim();
    if (!target.startsWith("#")) return `it refers to an external address (url(${target.slice(0, 40)})); only url(#id) is allowed`;
  }
  return null;
}

function magicOk(ext: string, b: Buffer): boolean {
  if (ext === "png") return b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (ext === "webp") return b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
  return true;
}

/** The branding a pack gets when its manifest has none: its own name, and the attribution line on. */
export function defaultBranding(name: string): PackBranding {
  return { shortName: name, tagline: null, accentColor: null, accentInk: null, logo: null, welcomeTitle: null, welcomeText: null, composerPlaceholder: null, poweredBy: { show: true, label: DEFAULT_POWERED_BY_LABEL, url: DEFAULT_POWERED_BY_URL } };
}

/**
 * Validates pack.json "branding" and resolves it with defaults. Problems are pushed to `errors` (and
 * softer advice to `warnings`) in words a pack author can act on.
 */
export function loadBranding(raw: unknown, root: string, name: string, errors: string[], warnings: string[]): PackBranding {
  const out = defaultBranding(name);
  if (raw === undefined) return out;
  if (!isObj(raw)) {
    errors.push('pack.json: "branding" must be an object');
    return out;
  }
  for (const k of Object.keys(raw)) if (!KNOWN_KEYS.includes(k)) warnings.push(`pack.json: branding.${k} is not a known setting and is ignored (known: ${KNOWN_KEYS.join(", ")})`);

  const text = (key: string, max: number, required: boolean): string | null => {
    const v = raw[key];
    if (v === undefined) {
      if (required) errors.push(`pack.json: branding.${key} is required (a short name shown in the app header, up to ${max} characters)`);
      return null;
    }
    if (typeof v !== "string" || v.trim().length === 0) {
      errors.push(`pack.json: branding.${key} must be a non-empty text`);
      return null;
    }
    const t = v.trim();
    if (CONTROL.test(t)) errors.push(`pack.json: branding.${key} must not contain control characters`);
    if (t.length > max) errors.push(`pack.json: branding.${key} is ${t.length} characters; the limit is ${max}`);
    return t;
  };

  const shortName = text("shortName", 24, true);
  if (shortName) out.shortName = shortName;
  const tagline = text("tagline", 120, false);
  if (tagline) out.tagline = tagline;
  const welcomeTitle = text("welcomeTitle", 80, false);
  if (welcomeTitle) out.welcomeTitle = welcomeTitle;
  const welcomeText = text("welcomeText", 220, false);
  if (welcomeText) out.welcomeText = welcomeText;
  const composerPlaceholder = text("composerPlaceholder", 60, false);
  if (composerPlaceholder) out.composerPlaceholder = composerPlaceholder;

  if (raw.accentColor !== undefined) {
    const c = raw.accentColor;
    if (typeof c !== "string" || !HEX.test(c)) errors.push('pack.json: branding.accentColor must look like "#1a7f5a" (a # and six hex digits)');
    else {
      const accent = c.toLowerCase();
      const picked = pickInk(accent);
      if (!picked.ink) {
        errors.push(
          `pack.json: branding.accentColor ${accent} is too close to mid-grey for readable button text: white text would be ${picked.white.toFixed(1)}:1 and near-black ${picked.dark.toFixed(1)}:1, and WCAG AA needs 4.5:1. Pick a darker or lighter colour`,
        );
      } else {
        out.accentColor = accent;
        out.accentInk = picked.ink;
        const onDark = contrastRatio(accent, DARK_SURFACE);
        if (onDark < 3) warnings.push(`pack.json: branding.accentColor ${accent} is only ${onDark.toFixed(1)}:1 against the dark theme's background, so icons and focus rings in it will be hard to see; a brighter colour works better`);
      }
    }
  }

  if (raw.logo !== undefined) {
    const rel = raw.logo;
    if (typeof rel !== "string" || !LOGO_PATH.test(rel)) {
      errors.push('pack.json: branding.logo must be a file inside the pack\'s brand/ folder ending in .svg, .png or .webp (for example "brand/logo.svg")');
    } else {
      const file = path.join(root, ...rel.split("/"));
      let st: fs.Stats | null = null;
      try {
        st = fs.lstatSync(file);
      } catch {
        errors.push(`pack.json: branding.logo points to ${rel}, which does not exist`);
      }
      if (st) {
        const ext = rel.slice(rel.lastIndexOf(".") + 1);
        if (st.isSymbolicLink() || !st.isFile()) errors.push(`${rel}: the logo must be a regular file, not a link or a folder`);
        else if (st.size > MAX_LOGO_BYTES) errors.push(`${rel}: the logo is ${Math.ceil(st.size / 1024)} KB; the limit is ${MAX_LOGO_BYTES / 1024} KB`);
        else if (st.size === 0) errors.push(`${rel}: the logo file is empty`);
        else {
          const bytes = fs.readFileSync(file);
          const problem = ext === "svg" ? svgProblem(bytes.toString("utf8")) : magicOk(ext, bytes) ? null : `it is not really a .${ext} image`;
          if (problem) errors.push(`${rel}: not accepted as a logo: ${problem}`);
          else out.logo = { rel, contentType: CONTENT_TYPES[ext] as string, bytes, etag: `"${createHash("sha256").update(bytes).digest("hex").slice(0, 16)}"` };
        }
      }
    }
  }

  if (raw.poweredBy !== undefined) {
    const p = raw.poweredBy;
    if (!isObj(p)) errors.push('pack.json: branding.poweredBy must be an object like { "show": true }');
    else {
      if (p.show !== undefined) {
        if (typeof p.show !== "boolean") errors.push("pack.json: branding.poweredBy.show must be true or false");
        else out.poweredBy.show = p.show;
      }
      if (p.label !== undefined) {
        if (typeof p.label !== "string" || p.label.trim().length === 0 || p.label.trim().length > 60 || CONTROL.test(p.label)) errors.push("pack.json: branding.poweredBy.label must be a text of 1 to 60 characters");
        else out.poweredBy.label = p.label.trim();
      }
      if (p.url !== undefined) {
        let ok = false;
        if (typeof p.url === "string" && p.url.length <= 200) {
          try {
            const u = new URL(p.url);
            ok = u.protocol === "https:" && !u.username && !u.password;
          } catch {
            ok = false;
          }
        }
        if (!ok) errors.push("pack.json: branding.poweredBy.url must be an https:// address (up to 200 characters)");
        else out.poweredBy.url = (p.url as string).trim();
      }
    }
  }
  return out;
}

/** One line for pack:validate: what the app will do with this branding. */
export function describeBranding(b: PackBranding): string {
  const parts = [`shortName "${b.shortName}"`];
  if (b.accentColor && b.accentInk) parts.push(`accent ${b.accentColor} with ${b.accentInk === INK_LIGHT ? "white" : "near-black"} text (${contrastRatio(b.accentColor, b.accentInk).toFixed(1)}:1)`);
  else parts.push("default accent colour");
  parts.push(b.logo ? `logo ${b.logo.rel} (${Math.ceil(b.logo.bytes.length / 1024)} KB)` : "default logo");
  parts.push(b.poweredBy.show ? `"${b.poweredBy.label}" shown` : "Powered-by line hidden");
  return parts.join(", ");
}
