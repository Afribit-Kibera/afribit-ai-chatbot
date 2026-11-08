import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { hash } from "./protocol.js";
export const REPOSITORY_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
export function sourceFingerprint() {
  const entries: [string, string][] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && /\.(ts|json)$/.test(entry.name)) entries.push([relative(REPOSITORY_ROOT, full).replace(/\\/g, "/"), readFileSync(full, "utf8")]);
    }
  };
  for (const dir of ["apps/api/src", "apps/api/config", "packages/shared/src"]) walk(join(REPOSITORY_ROOT, dir));
  return hash(entries);
}
export function revisionIdentity() {
  return { commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPOSITORY_ROOT, encoding: "utf8" }).trim(),
    dirty: !!execFileSync("git", ["status", "--porcelain"], { cwd: REPOSITORY_ROOT, encoding: "utf8" }).trim(), sourceHash: sourceFingerprint() };
}
