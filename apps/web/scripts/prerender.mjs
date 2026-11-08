import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { render } from "../dist-ssr/entry-server.js";
const root = fileURLToPath(new URL("../", import.meta.url));
const dist = `${root}/dist`;
const origin = (
  process.env.VITE_SITE_URL ?? "https://ai.afribit.africa"
).replace(/\/$/, "");
if (!/^https?:\/\//.test(origin))
  throw Error("VITE_SITE_URL must be an absolute site origin");
const template = readFileSync(`${dist}/index.html`, "utf8");
const manifest = JSON.parse(
  readFileSync(`${dist}/.vite/manifest.json`, "utf8"),
);
const main = Object.values(manifest).find(
  (item) => item.isEntry && item.src === "index.html",
);
const fonts = readdirSync(`${dist}/assets`).filter((f) =>
  /(?:dm-sans|space-grotesk)-latin-wght-normal.*\.woff2$/.test(f),
);
const preloads = fonts
  .map(
    (f) =>
      `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin>`,
  )
  .join("\n");
const titles = {
  home: "Afribit AI — Open-source AI for communities",
  privacy: "Privacy notice (draft) — Afribit AI",
  community: "Community nodes — Afribit AI",
  app: "Learn Bitcoin — Afribit AI",
};
const descriptions = {
  home: "Afribit AI is an open-source learning companion that communities can host and shape for themselves. Education first, starting with Bitcoin in Kibera and Nairobi.",
  privacy:
    "Read the draft privacy notice for Afribit AI: where questions go, what is stored and how to request deletion.",
  community:
    "Set up Afribit AI for your community, with its own memory of reviewed knowledge, database and local hosting. For the community, by the community.",
  app: "Learn about Bitcoin in Sheng, Kiswahili and English using community-reviewed knowledge. No account needed. AI can be wrong.",
};
// A white-labelled build (`pnpm brand <pack>`, scripts/brand.mjs) names its own app in the pre-rendered /app pages.
const brandFile = `${root}/brand.local.json`;
const brand = existsSync(brandFile)
  ? JSON.parse(readFileSync(brandFile, "utf8"))
  : null;
const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
if (brand) {
  titles.app = esc(brand.title);
  descriptions.app = esc(brand.description);
}
const siteName = brand ? esc(brand.shortName) : "Afribit AI";
const routes = [
  "/",
  "/privacy",
  "/community",
  "/sw/",
  "/sh/",
  "/sw/privacy",
  "/sh/privacy",
  "/sw/community",
  "/sh/community",
  "/app",
  "/app/settings",
  "/app/contribute",
];
for (const path of routes) {
  const app = path.startsWith("/app");
  const locale = path.startsWith("/sw")
    ? "sw"
    : path.startsWith("/sh")
      ? "sh"
      : "en";
  const dictionary = JSON.parse(
    readFileSync(`${root}/src/locales/${locale}.json`, "utf8"),
  );
  const language = dictionary["meta.review"].includes("TODO(reviewers)")
    ? "en"
    : locale === "sh"
      ? "sw-KE"
      : locale;
  const type = app
    ? "app"
    : path.endsWith("privacy")
      ? "privacy"
      : path.endsWith("community")
        ? "community"
        : "home";
  const basePath = path.replace(/^\/(sw|sh)/, "") || "/";
  const alternates = app
    ? ""
    : ["en", "sw", "sh"]
        .map(
          (locale) =>
            `<link rel="alternate" hreflang="${locale === "sh" ? "sw-KE" : locale}" href="${origin}${locale === "en" ? basePath : `/${locale}${basePath}`}">`,
        )
        .join("\n");
  const seo = `<link rel="canonical" href="${origin}${path}">${alternates}<meta property="og:type" content="website"><meta property="og:site_name" content="${app ? siteName : "Afribit AI"}"><meta property="og:title" content="${titles[type]}"><meta property="og:description" content="${descriptions[type]}"><meta property="og:url" content="${origin}${path}"><meta property="og:image" content="${origin}/brand/afribit-share.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Afribit AI. Bitcoin, in your own words. Sheng, Kiswahili, English."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${titles[type]}"><meta name="twitter:description" content="${descriptions[type]}"><meta name="twitter:image" content="${origin}/brand/afribit-share.jpg">${
    app
      ? '<meta name="robots" content="noindex,follow">'
      : `<script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Afribit",
              url: origin,
              logo: `${origin}/brand/afribit-mark-icon.png`,
              email: "eddie@afribit.africa",
            },
            {
              "@type": "WebSite",
              name: "Afribit AI",
              url: origin,
              inLanguage: ["en", "sw", "sw-KE"],
            },
          ],
        }).replaceAll("<", "\\u003c")}</script>`
  }`;
  const html = template
    .replace('<html lang="en"', `<html lang="${language}"`)
    .replace(/<title>.*?<\/title>/, `<title>${titles[type]}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${descriptions[type]}" />`,
    )
    .replace("<!-- seo -->", seo + (app ? "" : preloads))
    .replace(
      '<div id="root"></div>',
      `<div id="root">${app ? "" : render(path)}</div>`,
    );
  const target = path === "/" ? dist : `${dist}${path.replace(/\/$/, "")}`;
  mkdirSync(target, { recursive: true });
  writeFileSync(`${target}/index.html`, html);
}
writeFileSync(
  `${dist}/robots.txt`,
  `User-agent: *\nAllow: /\nDisallow: /app\nSitemap: ${origin}/sitemap.xml\n`,
);
writeFileSync(
  `${dist}/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes
    .filter((p) => !p.startsWith("/app"))
    .map((p) => `<url><loc>${origin}${p}</loc></url>`)
    .join("")}</urlset>`,
);
const shellAssets = [
  "/app",
  "/",
  "/privacy",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/brand/afribit-mark-icon.png",
  ...readdirSync(`${dist}/assets`)
    .filter((f) => /\.(js|css|woff2)$/.test(f))
    .map((f) => `/assets/${f}`),
];
const workerSource = readFileSync(`${root}/public/sw.js`, "utf8");
const hash = createHash("sha256")
  .update(JSON.stringify(manifest))
  .update(workerSource)
  .digest("hex")
  .slice(0, 12);
writeFileSync(
  `${dist}/sw.js`,
  workerSource
    .replace('"afribit-shell-dev"', `"afribit-shell-${hash}"`)
    .replace(
      /const SHELL_ASSETS = \[[\s\S]*?\];/,
      `const SHELL_ASSETS = ${JSON.stringify(shellAssets)};`,
    ),
);
function imports(key, result = new Set()) {
  const entry = manifest[key];
  if (!entry || result.has(entry.file)) return result;
  result.add(entry.file);
  for (const next of entry.imports ?? []) imports(next, result);
  return result;
}
const mainKey = Object.keys(manifest).find((key) => manifest[key] === main);
const appKey = Object.keys(manifest).find(
  (key) => manifest[key].name === "LearningApp" && manifest[key].isDynamicEntry,
);
if (!mainKey || !appKey)
  throw Error("Cannot resolve entry chunks to enforce JavaScript budgets");
const landingFiles = imports(mainKey);
const chatFiles = new Set([...landingFiles, ...imports(appKey)]);
const bytes = (files) =>
  [...files].reduce(
    (sum, file) => sum + gzipSync(readFileSync(`${dist}/${file}`)).length,
    0,
  );
const budgets = {
  landing: {
    gzip: bytes(landingFiles),
    limit: 120 * 1024,
    files: [...landingFiles],
  },
  chat: { gzip: bytes(chatFiles), limit: 200 * 1024, files: [...chatFiles] },
};
writeFileSync(`${dist}/bundle-budgets.json`, JSON.stringify(budgets, null, 2));
for (const [name, budget] of Object.entries(budgets)) {
  console.log(
    `${name}: ${(budget.gzip / 1024).toFixed(1)}KB gzip / ${budget.limit / 1024}KB`,
  );
  if (budget.gzip > budget.limit)
    throw Error(`${name} exceeds the initial JavaScript budget`);
}
const manual = JSON.parse(
  readFileSync(`${root}/../api/src/db/data/bitcoin_basics_manual.json`, "utf8"),
);
const sample = JSON.parse(
  readFileSync(`${root}/src/content/sample-answer.json`, "utf8"),
);
if (
  !manual.chapters
    .find((chapter) => chapter.num === sample.chapter)
    ?.simple_english.startsWith(sample.answer)
)
  throw Error(
    "The demo answer must be copied verbatim from the approved manual",
  );
console.log(
  `Prerendered ${routes.length} routes. Versioned offline shell: ${hash}.`,
);
