// White-label the parts of the web app that cannot change at run time on a static host:
// the PWA manifest and the HTML <title> / description. Run it BEFORE `pnpm build`:
//
//   pnpm --filter @afribit/web brand ../../packs/my-community
//   COMMUNITY_PACK_DIR=packs/my-community pnpm --filter @afribit/web brand
//
// With no pack folder it does nothing, so the Afribit defaults stay as they are. It is safe to run
// again (it sets values, it never appends). It edits public/manifest.webmanifest and index.html in
// place; `git checkout` those two files to go back to Afribit's. The in-app header, colours and logo
// do NOT need this: the app reads them from the API (GET /api/v1/pack).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
const given = arg || process.env.COMMUNITY_PACK_DIR?.trim();
if (!given) {
  console.log(
    "brand: no pack folder given (argument or COMMUNITY_PACK_DIR); leaving the Afribit defaults untouched.",
  );
  process.exit(0);
}
// Relative paths are taken from the folder the command runs in (apps/web under `pnpm --filter`).
const packDir = resolve(process.cwd(), given);
const packFile = resolve(packDir, "pack.json");
if (!existsSync(packFile)) {
  console.error(
    `brand: ${packFile} not found. Pass the folder that contains pack.json.`,
  );
  process.exit(1);
}
let pack;
try {
  pack = JSON.parse(readFileSync(packFile, "utf8"));
} catch (err) {
  console.error(`brand: pack.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

const text = (v, max) =>
  typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null;
const b =
  pack.branding && typeof pack.branding === "object" ? pack.branding : {};
const name = text(pack.name, 80) ?? "Community assistant";
const shortName = text(b.shortName, 24) ?? text(pack.name, 24);
if (!shortName) {
  console.error(
    'brand: the pack has no branding.shortName (and its name is empty or longer than 24 characters). Add "branding": { "shortName": "..." } to pack.json.',
  );
  process.exit(1);
}
const tagline = text(b.tagline, 120);
const description =
  tagline ??
  text(pack.description, 300) ??
  `${name}, a community learning assistant.`;
const accent =
  typeof b.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(b.accentColor)
    ? b.accentColor.toLowerCase()
    : null;

// ---- manifest ------------------------------------------------------------------------------------
const manifestFile = resolve(root, "public/manifest.webmanifest");
const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
manifest.name = name;
manifest.short_name = shortName;
manifest.description = description;
if (accent) manifest.theme_color = accent;
for (const s of manifest.shortcuts ?? []) {
  s.name = `Ask ${shortName}`;
  s.description = `Open ${shortName} chat`;
}
writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");

// ---- index.html ----------------------------------------------------------------------------------
const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const htmlFile = resolve(root, "index.html");
let html = readFileSync(htmlFile, "utf8");
const title = tagline ? `${shortName} — ${tagline}` : name;
const before = html;
html = html.replace(
  /<title>[\s\S]*?<\/title>/,
  () => `<title>${esc(title)}</title>`,
);
html = html.replace(
  /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
  () => `<meta name="description" content="${esc(description)}" />`,
);
if (accent)
  html = html.replace(
    /<meta name="theme-color" content="[^"]*" \/>/,
    () => `<meta name="theme-color" content="${accent}" />`,
  );
if (html === before && !html.includes(`<title>${esc(title)}</title>`)) {
  console.error(
    "brand: index.html has no <title> to update; it was left unchanged.",
  );
  process.exit(1);
}
writeFileSync(htmlFile, html);

// ---- for the static copy of /app that `pnpm build` pre-renders (scripts/prerender.mjs reads this) ---
writeFileSync(
  resolve(root, "brand.local.json"),
  JSON.stringify({ name, shortName, title, description }, null, 2) + "\n",
);

console.log(
  `brand: ${shortName} (${name})${accent ? `, theme ${accent}` : ""}`,
);
console.log(
  "  updated public/manifest.webmanifest, index.html and brand.local.json",
);
console.log(
  "  not changed: the app icons in public/icons and public/brand (replace those files with your own, same names).",
);
