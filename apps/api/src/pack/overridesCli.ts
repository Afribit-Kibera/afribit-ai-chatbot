import fs from "node:fs";
import path from "node:path";
import { getRegistry } from "./active.js";
import { overridesDirFromEnv } from "./overrides.js";
import { baselineText, collectOverrides, listVoiceFiles, normalizeText } from "./voice.js";

/**
 * Brings the Voice Lab's live edits back into git.
 *
 *   pnpm pack:overrides-export <packId> <outDir> [--from <overridesDir>]
 *
 * Writes every override of the pack into <outDir> using the pack's own layout (language/..., prompts/...),
 * so the folder can be copied over packs/<packId>/ and the change reviewed with `git diff` and committed.
 * Reads COMMUNITY_PACK_OVERRIDES_DIR unless --from is given. Changes nothing in the overrides folder.
 */
function main(): void {
  const argv = process.argv.slice(2);
  const from = argv.indexOf("--from");
  const fromDir = from >= 0 ? argv[from + 1] : undefined;
  const positional = argv.filter((a, i) => !a.startsWith("--") && !(from >= 0 && i === from + 1));
  const [packId, outDir] = positional;
  if (!packId || !outDir) {
    console.error("Usage: pnpm pack:overrides-export <packId> <outDir> [--from <overridesDir>]");
    process.exit(1);
  }
  const overridesDir = fromDir ? path.resolve(fromDir) : overridesDirFromEnv(process.env);
  if (!overridesDir) {
    console.error("Set COMMUNITY_PACK_OVERRIDES_DIR or pass --from <overridesDir>.");
    process.exit(1);
  }
  const pack = getRegistry().get(packId);
  if (!pack) {
    console.error(`"${packId}" is not a pack this configuration serves (serving: ${getRegistry().packs.map((p) => p.id).join(", ")}).`);
    process.exit(1);
  }

  const found = collectOverrides(pack, overridesDir);
  const paths = Object.keys(found);
  if (paths.length === 0) {
    console.log(`No overrides for ${packId} in ${overridesDir}; nothing to export.`);
    return;
  }
  const out = path.resolve(outDir);
  for (const rel of paths) {
    const file = path.join(out, ...rel.split("/"));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, (found[rel] as string) + "\n");
    const spec = listVoiceFiles(pack).find((f) => f.path === rel);
    const same = spec !== undefined && normalizeText(baselineText(pack, spec)) === found[rel];
    console.log(`  ${same ? "same as the pack" : "differs         "}  ${rel}`);
  }
  console.log(`\nExported ${paths.length} file(s) to ${out}.`);
  console.log(`Next: copy them over packs/${packId}/, review with git diff, commit, redeploy. Then you can delete the overrides you exported (the baseline will then match them).`);
}

main();
