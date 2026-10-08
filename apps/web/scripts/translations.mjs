import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const en = JSON.parse(readFileSync(`${root}/src/locales/en.json`, "utf8"));
const checklist = [
  "# Community translation review",
  "",
  "Generated from the English UI dictionary. English placeholders are intentional. Only community reviewers should translate Kiswahili and Sheng. Answer language and interface language are separate preferences.",
  "",
  "## Reviewer checklist",
  "",
  "- Assign the three reviewers: Kiswahili lead, Sheng lead, cross-language reviewer.",
  "- Read each string in its screen context on a 320–390px phone.",
  "- Keep safety, cloud processing, server retention, draft privacy and deletion limits accurate.",
  "- Review the proposed starter questions in `src/lib/starters.ts` separately. These are supplied proposals, not approved translations.",
  "- Replace English placeholder values, keeping every JSON key unchanged.",
  "- Update the `meta.review` status only after review; run `pnpm --filter @afribit/web translations`.",
  "",
  "| Key | English source | Kiswahili | Sheng |",
  "| --- | --- | --- | --- |",
];
for (const locale of ["sw", "sh"]) {
  const path = `${root}/src/locales/${locale}.json`;
  if (!existsSync(path))
    writeFileSync(
      path,
      JSON.stringify(
        {
          ...en,
          "meta.review":
            "// TODO(reviewers): Translate every value with community reviewers. English placeholders; not approved localized copy.",
        },
        null,
        2,
      ) + "\n",
    );
  const translated = JSON.parse(readFileSync(path, "utf8"));
  if (translated["meta.review"]?.includes("TODO(reviewers)")) {
    if (process.argv.includes("--refresh-placeholders"))
      Object.assign(translated, en, {
        "meta.review": translated["meta.review"],
      });
    for (const [key, value] of Object.entries(en))
      if (!(key in translated)) translated[key] = value;
    writeFileSync(path, JSON.stringify(translated, null, 2) + "\n");
  }
  const keys = Object.keys(en);
  if (
    keys.some((key) => !(key in translated)) ||
    Object.keys(translated).some((key) => !(key in en))
  )
    throw Error(`${locale}: translation keys must exactly match English`);
}
for (const [key, value] of Object.entries(en)) {
  if (key.startsWith("meta.")) continue;
  checklist.push(
    `| \`${key}\` | ${value.replaceAll("|", "&#124;").replaceAll("\n", " ")} | TODO(reviewers) | TODO(reviewers) |`,
  );
}
mkdirSync(`${root}/../../docs/frontend`, { recursive: true });
writeFileSync(
  `${root}/../../docs/frontend/translation-todo.md`,
  checklist.join("\n") + "\n",
);
console.log(
  `Translation keys verified: ${Object.keys(en).length} in each locale.`,
);
