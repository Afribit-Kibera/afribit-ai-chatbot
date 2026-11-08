import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const path = `${root}/src/locales/en.json`;
const en = JSON.parse(readFileSync(path, "utf8"));
en["privacy.notice"] = readFileSync(
  `${root}/../../docs/governance/privacy-notice-draft.md`,
  "utf8",
).trim();
writeFileSync(path, JSON.stringify(en, null, 2) + "\n");
