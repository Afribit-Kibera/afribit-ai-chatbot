import fs from "node:fs";
import path from "node:path";

/**
 * Live wording overrides for a community pack (the Voice Lab, docs/guides/voice-guide.md).
 *
 *   COMMUNITY_PACK_OVERRIDES_DIR=<dir>      unset: no overrides, the server behaves exactly as without this feature
 *   <dir>/<packId>/<relative path>          the same relative path the file has inside the pack
 *   <dir>/.history/<packId>/<UTC timestamp>-<userId>-<flattened path>     every saved version
 *
 * The pack in the image (from git, reviewed) is the baseline; an override file replaces one baseline
 * file; deleting it restores the baseline. Only the files the loader reads as wording can be overridden
 * (loadPack asks for them by name, so pack.json, knowledge/ and eval/ can never be reached from here).
 * This file holds the path rules and the small file helpers; no Fastify and no database.
 */

/** The biggest text one override may hold. A mode guide is 6 KB today, so this is generous. */
export const MAX_OVERRIDE_BYTES = 20 * 1024;

const SLUG = /^[a-z][a-z0-9_-]*$/;
// Relative paths inside a pack: lowercase words, digits, "_", "-" and "." in each segment; never "." or ".." alone.
const REL_SEGMENT = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;

export function overridesDirFromEnv(source: NodeJS.ProcessEnv): string | undefined {
  const dir = source.COMMUNITY_PACK_OVERRIDES_DIR?.trim();
  return dir ? path.resolve(dir) : undefined;
}

/** True for a relative path made only of plain segments ("language/sheng.full.md"): no "..", no leading "/", no backslash. */
export function isSafeRel(rel: string): boolean {
  if (typeof rel !== "string" || rel.length === 0 || rel.length > 120) return false;
  const parts = rel.split("/");
  return parts.length <= 3 && parts.every((p) => REL_SEGMENT.test(p) && !p.includes(".."));
}

export function isPackId(id: string): boolean {
  return typeof id === "string" && id.length <= 64 && SLUG.test(id);
}

/** Absolute path of an override file. Throws for anything that is not a plain pack id and relative path. */
export function overridePath(overridesDir: string, packId: string, rel: string): string {
  if (!isPackId(packId) || !isSafeRel(rel)) throw new Error("not a valid override path");
  return path.join(overridesDir, packId, ...rel.split("/"));
}

/** Same line-ending rule the loader applies: one trailing newline is not part of the text. */
export function readTextFile(file: string): string | null {
  if (!fs.existsSync(file)) return null;
  let text = fs.readFileSync(file, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.endsWith("\r\n")) return text.slice(0, -2);
  if (text.endsWith("\n")) return text.slice(0, -1);
  return text;
}

export type FoundOverride = { file: string; skipped?: undefined } | { file?: undefined; skipped: string };

/**
 * The override file for a pack file, if one is in use. A symlink, a folder or an oversized file is
 * skipped (with the reason) rather than read: the overrides folder is a volume an operator can reach,
 * and a link in it must never lead the server to read something else.
 */
export function findOverride(overridesDir: string, packId: string, rel: string): FoundOverride | null {
  let file: string;
  try {
    file = overridePath(overridesDir, packId, rel);
  } catch {
    return null;
  }
  let st: fs.Stats;
  try {
    st = fs.lstatSync(file);
  } catch {
    return null;
  }
  if (st.isSymbolicLink()) return { skipped: "it is a symbolic link" };
  if (!st.isFile()) return { skipped: "it is not a regular file" };
  if (st.size > MAX_OVERRIDE_BYTES + 16) return { skipped: `it is larger than ${MAX_OVERRIDE_BYTES / 1024} KB` };
  return { file };
}

// ---- history ------------------------------------------------------------------------------------

export interface HistoryEntry {
  /** The file name; pass it back to restore a version. */
  id: string;
  /** ISO time the version was saved. */
  at: string;
  userId: string;
  /** True when this copy is the text that was removed by "revert to baseline". */
  removed: boolean;
  bytes: number;
}

const KEEP_PER_FILE = 100;
const HISTORY_NAME = /^(\d{8}T\d{9}Z)-([A-Za-z0-9]{1,40})-([A-Za-z0-9_.-]+?)(\.removed)?$/;

/** "language/sheng.full.md" -> "language__sheng.full.md" (one flat file name). */
export function flattenRel(rel: string): string {
  return rel.split("/").join("__");
}

function historyDir(overridesDir: string, packId: string): string {
  if (!isPackId(packId)) throw new Error("not a valid pack id");
  return path.join(overridesDir, ".history", packId);
}

let lastStamp = 0;
function stamp(): { iso: string; compact: string } {
  // Strictly increasing, so two saves in one millisecond still get two names.
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  const iso = new Date(lastStamp).toISOString();
  return { iso, compact: iso.replace(/[-:.]/g, "") };
}

/** Keeps a copy of a text. `userId` is reduced to letters and digits so it is safe in a file name. */
export function writeHistory(overridesDir: string, packId: string, userId: string, rel: string, text: string, removed = false): string {
  const dir = historyDir(overridesDir, packId);
  fs.mkdirSync(dir, { recursive: true });
  const uid = userId.replace(/[^A-Za-z0-9]/g, "").slice(0, 40) || "unknown";
  const name = `${stamp().compact}-${uid}-${flattenRel(rel)}${removed ? ".removed" : ""}`;
  fs.writeFileSync(path.join(dir, name), text.endsWith("\n") ? text : text + "\n", { flag: "wx" });
  // Old versions beyond the newest KEEP_PER_FILE are dropped so the folder cannot grow without limit.
  const mine = listHistoryFiles(dir, rel);
  for (const old of mine.slice(KEEP_PER_FILE)) {
    try {
      fs.unlinkSync(path.join(dir, old.id));
    } catch {
      // best effort
    }
  }
  return name;
}

function listHistoryFiles(dir: string, rel: string): HistoryEntry[] {
  if (!fs.existsSync(dir)) return [];
  const flat = flattenRel(rel);
  const out: HistoryEntry[] = [];
  for (const name of fs.readdirSync(dir)) {
    const m = HISTORY_NAME.exec(name);
    if (!m || m[3] !== flat) continue;
    const full = path.join(dir, name);
    let st: fs.Stats;
    try {
      st = fs.lstatSync(full);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    const s = m[1] as string;
    out.push({ id: name, at: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}.${s.slice(15, 18)}Z`, userId: m[2] as string, removed: m[4] === ".removed", bytes: st.size });
  }
  return out.sort((a, b) => b.id.localeCompare(a.id));
}

export function listHistory(overridesDir: string, packId: string, rel: string): HistoryEntry[] {
  return listHistoryFiles(historyDir(overridesDir, packId), rel);
}

/** The text of one saved version, or null if that version does not exist for this file. */
export function readHistory(overridesDir: string, packId: string, rel: string, id: string): string | null {
  const m = HISTORY_NAME.exec(id);
  if (!m || m[3] !== flattenRel(rel)) return null;
  const file = path.join(historyDir(overridesDir, packId), id);
  const st = fs.existsSync(file) ? fs.lstatSync(file) : null;
  if (!st || !st.isFile() || st.size > MAX_OVERRIDE_BYTES + 16) return null;
  return readTextFile(file);
}

// ---- writing ------------------------------------------------------------------------------------

/** Creates the folder for an override and refuses to go through a link out of the overrides folder. */
function prepareTarget(overridesDir: string, packId: string, rel: string): string {
  const file = overridePath(overridesDir, packId, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const root = fs.realpathSync(overridesDir);
  const parent = fs.realpathSync(path.dirname(file));
  if (parent !== root && !parent.startsWith(root + path.sep)) throw new Error("the overrides folder contains a link that leads outside it");
  if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) throw new Error("the override file is a symbolic link");
  return file;
}

/** Writes an override atomically: a temporary file in the same folder, then a rename. */
export function writeOverride(overridesDir: string, packId: string, rel: string, text: string): void {
  const file = prepareTarget(overridesDir, packId, rel);
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tmp, text.endsWith("\n") ? text : text + "\n", { flag: "wx" });
    fs.renameSync(tmp, file);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

/** Removes an override (restoring the baseline). Returns false when there was none. */
export function removeOverride(overridesDir: string, packId: string, rel: string): boolean {
  const file = overridePath(overridesDir, packId, rel);
  if (!fs.existsSync(file) && !isLink(file)) return false;
  if (isLink(file)) throw new Error("the override file is a symbolic link");
  fs.unlinkSync(file);
  return true;
}

function isLink(file: string): boolean {
  try {
    return fs.lstatSync(file).isSymbolicLink();
  } catch {
    return false;
  }
}
