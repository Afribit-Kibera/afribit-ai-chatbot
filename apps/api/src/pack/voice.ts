import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { getRegistry, setRegistry } from "./active.js";
import { DEFAULT_PROMPT_TEXT, defaultModePolicy, PROMPT_FILES, type PromptTextSlot } from "./defaults.js";
import { loadPack, type LoadReport } from "./load.js";
import {
  findOverride,
  listHistory,
  MAX_OVERRIDE_BYTES,
  readHistory,
  readTextFile,
  removeOverride,
  writeHistory,
  writeOverride,
  type HistoryEntry,
} from "./overrides.js";
import { reloadRegistry, type ReloadReport } from "./registry.js";
import type { CommunityPack } from "./types.js";

/**
 * The Voice Lab's rules (docs/guides/voice-guide.md): which pack files can be edited live, who may edit
 * which, how a text is checked, and how a change is applied. No Fastify and no database here, so it is
 * unit-tested directly (voiceCases.ts); routes/voice.ts adds login, audit rows and rate limits.
 *
 * A change is accepted only if the WHOLE pack still loads with it applied. It is then written next to
 * a history copy (atomic rename), and the pack is reloaded into the running server. A change that would
 * break the pack is refused and the old wording keeps serving.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
// apps/api/src/pack and apps/api/dist/pack are the same depth below apps/api.
const descriptionsFile = path.resolve(here, "..", "..", "config", "voice-files.json");

export type VoiceGroup = "speech" | "messages" | "safety" | "advanced";

export interface VoiceFile {
  /** Relative path inside the pack, e.g. "language/sheng.full.md". The only handle for a file. */
  path: string;
  label: string;
  group: VoiceGroup;
  kind: "text" | "json";
  /** Only an administrator may change it (safety-critical wording). */
  adminOnly: boolean;
  /** Where the text is used: full, compact, serve, waiter, chef, message, push, search, all. */
  affects: string[];
  description: string;
  /** {{name}}-style placeholders this file may contain; empty when it is not filled in. */
  placeholders: string[];
  allowEmpty: boolean;
  /** False when voice-files.json has no entry for the file yet. */
  described: boolean;
  /** What the file holds when the pack has no file for it. */
  defaultText: string;
}

/** The placeholders prompt files may use; keep in step with the substitutions in load.ts. */
export const PROMPT_PLACEHOLDERS = ["name", "community", "domain", "contact"] as const;

/**
 * The prompt files that only an administrator may edit: they decide what the assistant must never do,
 * or what happens to a learner's private details. Everything else a reviewer may edit.
 */
export const ADMIN_ONLY_SLOTS: PromptTextSlot[] = ["safetyFull", "safetyCompact", "serveSafety", "chef", "ticket"];

/** Where an admin-only judgment is needed beyond the prompt slots above. */
export function isAdminOnly(rel: string): boolean {
  return ADMIN_ONLY_SLOTS.some((s) => rel === `prompts/${PROMPT_FILES[s]}`);
}

interface Descriptions {
  groups: { id: VoiceGroup; title: string; blurb: string }[];
  kinds: Record<string, { group: VoiceGroup; label: string; affects: string[]; description: string }>;
  slots: Record<string, { group: VoiceGroup; label: string; affects: string[]; description: string }>;
  fallback: { group: VoiceGroup; affects: string[]; description: string };
}

let descriptions: Descriptions | null = null;
export function voiceDescriptions(): Descriptions {
  descriptions ??= JSON.parse(fs.readFileSync(descriptionsFile, "utf8")) as Descriptions;
  return descriptions;
}

const fill = (text: string, vars: Record<string, string>): string => text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);

/** Every file of a pack that can be overridden, derived from the pack itself (never a hand-kept list). */
export function listVoiceFiles(pack: CommunityPack): VoiceFile[] {
  const d = voiceDescriptions();
  const out: VoiceFile[] = [];
  for (const m of pack.modes) {
    const vars = { mode: m.label, label: m.label };
    const fallback = defaultModePolicy(m.label, m.description);
    for (const [suffix, kind, text] of [["full", "modeFull", fallback.policyFull], ["compact", "modeCompact", fallback.rulesCompact]] as const) {
      const k = d.kinds[kind];
      if (!k) continue;
      out.push({ path: `language/${m.id}.${suffix}.md`, label: fill(k.label, vars), group: k.group, kind: "text", adminOnly: false, affects: k.affects, description: fill(k.description, vars), placeholders: [], allowEmpty: false, described: true, defaultText: text });
    }
  }
  const jsonFile = (rel: string, kind: string, defaultText: string): void => {
    const k = d.kinds[kind];
    out.push({ path: rel, label: k?.label ?? rel, group: k?.group ?? d.fallback.group, kind: "json", adminOnly: false, affects: k?.affects ?? d.fallback.affects, description: k?.description ?? d.fallback.description, placeholders: [], allowEmpty: false, described: Boolean(k), defaultText });
  };
  for (const slot of Object.keys(PROMPT_FILES) as PromptTextSlot[]) {
    const rel = `prompts/${PROMPT_FILES[slot]}`;
    const s = d.slots[slot];
    const adminOnly = isAdminOnly(rel);
    out.push({
      path: rel,
      label: s?.label ?? rel,
      group: adminOnly ? "safety" : (s?.group ?? d.fallback.group),
      kind: "text",
      adminOnly,
      affects: s?.affects ?? d.fallback.affects,
      description: s?.description ?? d.fallback.description,
      placeholders: [...PROMPT_PLACEHOLDERS],
      allowEmpty: DEFAULT_PROMPT_TEXT[slot] === "",
      described: Boolean(s),
      defaultText: DEFAULT_PROMPT_TEXT[slot],
    });
  }
  jsonFile("prompts/few-shots.json", "fewShots", "[]");
  jsonFile("language/postprocess.json", "postprocess", '{\n  "rules": []\n}');
  jsonFile("retrieval/synonyms.json", "synonyms", '{\n  "synonyms": {}\n}');
  jsonFile("starter-questions.json", "starterQuestions", '{\n  "reviewed": false,\n  "byMode": {}\n}');
  return out;
}

/** The file for a path that matches the whitelist EXACTLY, else undefined. No normalising: "./x" or "../x" are simply not there. */
export function findVoiceFile(pack: CommunityPack, rel: unknown): VoiceFile | undefined {
  if (typeof rel !== "string") return undefined;
  return listVoiceFiles(pack).find((f) => f.path === rel);
}

export interface VoiceActor {
  id: string;
  role: string;
}

export function canEdit(file: VoiceFile, actor: VoiceActor): boolean {
  return actor.role === "admin" || (actor.role === "reviewer" && !file.adminOnly);
}

export class VoiceError extends Error {
  constructor(
    readonly httpStatus: number,
    message: string,
    readonly errors: string[] = [],
  ) {
    super(message);
  }
}

// ---- reading ------------------------------------------------------------------------------------

/** What the pack itself says (the reviewed baseline), or the engine default when the pack has no such file. */
export function baselineText(pack: CommunityPack, file: VoiceFile): string {
  return readTextFile(path.join(pack.dir, file.path)) ?? file.defaultText;
}

/** The live edit of a file, or null when it is not overridden (or the override is unusable). */
export function overrideText(overridesDir: string, pack: CommunityPack, file: VoiceFile): string | null {
  const found = findOverride(overridesDir, pack.id, file.path);
  return found?.file ? readTextFile(found.file) : null;
}

export interface VoiceFileView {
  path: string;
  label: string;
  group: VoiceGroup;
  kind: "text" | "json";
  adminOnly: boolean;
  canEdit: boolean;
  affects: string[];
  description: string;
  placeholders: string[];
  allowEmpty: boolean;
  described: boolean;
  baseline: string;
  /** True when the pack has no file of its own and the baseline shown is the engine's generic default. */
  baselineIsDefault: boolean;
  effective: string;
  overridden: boolean;
  lastEdit: { at: string; userId: string } | null;
}

export function describeFiles(pack: CommunityPack, overridesDir: string, actor: VoiceActor): VoiceFileView[] {
  return listVoiceFiles(pack).map((f) => {
    const base = readTextFile(path.join(pack.dir, f.path));
    const own = overrideText(overridesDir, pack, f);
    const last = own === null ? undefined : listHistory(overridesDir, pack.id, f.path).find((h) => !h.removed);
    const { defaultText: _unused, ...rest } = f;
    return { ...rest, canEdit: canEdit(f, actor), baseline: base ?? f.defaultText, baselineIsDefault: base === null, effective: own ?? base ?? f.defaultText, overridden: own !== null, lastEdit: last ? { at: last.at, userId: last.userId } : null };
  });
}

// ---- checking a text ----------------------------------------------------------------------------

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const FLAGS = /^[gimsu]*$/;
const MAX_RULES = 100;
const MAX_PATTERN = 200;
const MAX_REPLACEMENT = 500;

/** Line endings as LF, no byte-order mark, no trailing blank space: the form a file is stored in. */
export function normalizeText(text: string): string {
  return text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").replace(/\s+$/, "");
}

/** Does a replacement pattern hang on text a model could plausibly write? A pattern that backtracks without end would freeze the whole server. */
function slowRegex(pattern: string, flags: string): boolean {
  const probes = ["a".repeat(40) + "!", " ".repeat(40) + "x", "ab".repeat(30) + "!", "word ".repeat(14) + "!", "Kwa hivyo ".repeat(6) + "?"];
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags);
  } catch {
    return false; // not a valid pattern at all: the loader reports that, with its reason
  }
  try {
    vm.runInNewContext("for (const s of probes) { re.lastIndex = 0; s.replace(re, 'x'); }", { re, probes }, { timeout: 100 });
    return false;
  } catch {
    return true;
  }
}

function checkPostprocess(data: unknown): string[] {
  const errors: string[] = [];
  const rules = typeof data === "object" && data !== null && Array.isArray((data as { rules?: unknown }).rules) ? ((data as { rules: unknown[] }).rules) : null;
  if (!rules) return ['must be { "rules": [ { "find", "flags", "replace" } ] }'];
  if (rules.length > MAX_RULES) errors.push(`at most ${MAX_RULES} rules`);
  for (const r of rules.slice(0, MAX_RULES)) {
    const rule = r as { find?: unknown; flags?: unknown; replace?: unknown };
    if (typeof rule?.find !== "string" || typeof rule.replace !== "string") continue; // the loader names this one
    if (rule.find.length > MAX_PATTERN) errors.push(`rule "${rule.find.slice(0, 30)}...": pattern longer than ${MAX_PATTERN} characters`);
    if (rule.replace.length > MAX_REPLACEMENT) errors.push(`rule "${rule.find.slice(0, 30)}": replacement longer than ${MAX_REPLACEMENT} characters`);
    const flags = typeof rule.flags === "string" ? rule.flags : "g";
    if (!FLAGS.test(flags)) {
      errors.push(`rule "${rule.find.slice(0, 30)}": flags may only use g, i, m, s, u`);
      continue;
    }
    if (rule.find.length <= MAX_PATTERN && slowRegex(rule.find, flags)) errors.push(`rule "${rule.find.slice(0, 30)}": this pattern is far too slow on ordinary text (it could freeze the service); simplify it`);
  }
  return errors;
}

/**
 * Checks one text for one file and returns the form to store. Throws VoiceError(400/413) with the reasons.
 * The whole-pack check (loadWithChanges) comes after this and catches everything that depends on the rest of the pack.
 */
export function checkText(file: VoiceFile, raw: unknown): string {
  if (typeof raw !== "string") throw new VoiceError(400, "text must be a string");
  if (Buffer.byteLength(raw, "utf8") > MAX_OVERRIDE_BYTES * 2) throw new VoiceError(413, `The text is too long (the limit is ${MAX_OVERRIDE_BYTES / 1024} KB).`);
  const text = normalizeText(raw);
  if (Buffer.byteLength(text, "utf8") > MAX_OVERRIDE_BYTES) throw new VoiceError(413, `The text is too long (the limit is ${MAX_OVERRIDE_BYTES / 1024} KB).`);
  if (CONTROL.test(text)) throw new VoiceError(400, "The text contains control characters (it may have been pasted from a binary file).");
  if (text.trim() === "" && !file.allowEmpty) throw new VoiceError(400, "This file cannot be empty. To go back to the reviewed wording use Revert to baseline.");

  const errors: string[] = [];
  const allowed = new Set(file.placeholders.map((p) => `{{${p}}}`));
  for (const m of text.matchAll(/\{\{[^{}]*\}\}|\{\{/g)) {
    if (!allowed.has(m[0])) {
      errors.push(
        file.placeholders.length === 0
          ? `"${m[0]}" is not filled in this kind of file; remove the double braces`
          : `unknown placeholder ${m[0]}: write exactly ${file.placeholders.map((p) => `{{${p}}}`).join(", ")} (no spaces inside the braces)`,
      );
    }
  }
  if (file.kind === "json") {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new VoiceError(400, `This is not valid JSON: ${(err as Error).message}`);
    }
    if (file.path === "language/postprocess.json") errors.push(...checkPostprocess(data));
  }
  if (errors.length > 0) throw new VoiceError(400, errors[0] as string, errors);
  return text;
}

// ---- trying a change against the whole pack -----------------------------------------------------

/**
 * Loads the pack as it would be with `changes` applied (a text replaces that file, null removes its
 * override), from a throwaway copy of the overrides. Nothing real is touched.
 */
export function loadWithChanges(pack: CommunityPack, overridesDir: string | undefined, changes: Record<string, string | null>): LoadReport {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "voice-"));
  try {
    const put = (rel: string, text: string): void => {
      const file = path.join(tmp, pack.id, ...rel.split("/"));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text.endsWith("\n") ? text : text + "\n");
    };
    for (const f of listVoiceFiles(pack)) {
      if (f.path in changes) continue;
      const own = overridesDir ? overrideText(overridesDir, pack, f) : null;
      if (own !== null) put(f.path, own);
    }
    for (const [rel, text] of Object.entries(changes)) if (text !== null) put(rel, text);
    return loadPack(pack.dir, { overridesDir: tmp });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** The pack with drafts applied on top of what is saved, for trying wording before saving it. Same checks as a save. */
export function draftPack(pack: CommunityPack, overridesDir: string, actor: VoiceActor, drafts: Record<string, unknown>): CommunityPack {
  const changes: Record<string, string> = {};
  for (const [rel, raw] of Object.entries(drafts)) {
    const file = findVoiceFile(pack, rel);
    if (!file) throw new VoiceError(400, `"${rel.slice(0, 80)}" is not a file that can be edited`);
    if (!canEdit(file, actor)) throw new VoiceError(403, `Only an administrator can change ${file.path}`);
    changes[file.path] = checkText(file, raw);
  }
  const report = loadWithChanges(pack, overridesDir, changes);
  if (!report.ok || !report.pack) throw new VoiceError(422, "The draft would make the pack invalid.", report.errors);
  return report.pack;
}

// ---- applying a change --------------------------------------------------------------------------

export interface VoiceContext {
  pack: CommunityPack;
  overridesDir: string;
  /** Called after the change is validated and before it is written; if it throws, nothing is changed. */
  audit?: (entry: { action: "voice:edit" | "voice:revert"; path: string; details: Record<string, unknown> }) => Promise<void>;
}

export interface VoiceResult {
  path: string;
  /** False when the text was already what is being served. */
  changed: boolean;
  overridden: boolean;
  warnings: string[];
}

const locks = new Map<string, Promise<unknown>>();
/** One change at a time per pack, so two editors cannot interleave a write and a reload. */
function withLock<T>(packId: string, fn: () => Promise<T>): Promise<T> {
  const run = (locks.get(packId) ?? Promise.resolve()).then(fn, fn);
  locks.set(packId, run.catch(() => undefined));
  return run;
}

/** Re-reads the pack into the running server. Requests already in flight keep the pack they started with. */
export function reloadServedPacks(overridesDir: string | undefined, ids?: string[]): ReloadReport {
  const report = reloadRegistry(getRegistry(), overridesDir, ids);
  if (report.reloaded.length > 0) setRegistry(report.registry);
  return report;
}

function lookup(ctx: VoiceContext, actor: VoiceActor, rel: unknown): VoiceFile {
  const file = findVoiceFile(ctx.pack, rel);
  if (!file) throw new VoiceError(400, "That is not a file that can be edited.");
  if (!canEdit(file, actor)) throw new VoiceError(403, `Only an administrator can change ${file.path}.`);
  return file;
}

function restoreDisk(ctx: VoiceContext, rel: string, previous: string | null): void {
  if (previous === null) removeOverride(ctx.overridesDir, ctx.pack.id, rel);
  else writeOverride(ctx.overridesDir, ctx.pack.id, rel, previous);
}

/** Saves a new wording for a file. */
export function saveOverride(ctx: VoiceContext, actor: VoiceActor, rel: unknown, raw: unknown, extra: Record<string, unknown> = {}): Promise<VoiceResult> {
  const { pack, overridesDir } = ctx;
  return withLock(pack.id, async () => {
    const file = lookup(ctx, actor, rel);
    const text = checkText(file, raw);
    const previous = overrideText(overridesDir, pack, file);
    if (previous === text || (previous === null && text === normalizeText(baselineText(pack, file)))) {
      return { path: file.path, changed: false, overridden: previous !== null, warnings: ["That is already the wording being served."] };
    }
    const report = loadWithChanges(pack, overridesDir, { [file.path]: text });
    if (!report.ok) throw new VoiceError(422, "This change would make the pack invalid, so it was not saved. The old wording is still in use.", report.errors);
    await ctx.audit?.({ action: "voice:edit", path: file.path, details: { pack: pack.id, path: file.path, bytes: Buffer.byteLength(text, "utf8"), ...extra } });
    writeHistory(overridesDir, pack.id, actor.id, file.path, text);
    writeOverride(overridesDir, pack.id, file.path, text);
    const reload = reloadServedPacks(overridesDir, [pack.id]);
    if (!reload.ok) {
      restoreDisk(ctx, file.path, previous);
      throw new VoiceError(500, "The pack could not be reloaded with this change, so it was undone.", Object.values(reload.errors).flat());
    }
    return { path: file.path, changed: true, overridden: true, warnings: reload.warnings.filter((w) => w.includes(file.path) && !w.includes("live edit from the overrides folder")) };
  });
}

/** Removes a live edit so the reviewed baseline from the pack is served again. */
export function revertOverride(ctx: VoiceContext, actor: VoiceActor, rel: unknown): Promise<VoiceResult> {
  const { pack, overridesDir } = ctx;
  return withLock(pack.id, async () => {
    const file = lookup(ctx, actor, rel);
    const previous = overrideText(overridesDir, pack, file);
    if (previous === null && !findOverride(overridesDir, pack.id, file.path)) return { path: file.path, changed: false, overridden: false, warnings: ["There was no live edit; the reviewed baseline is already in use."] };
    const report = loadWithChanges(pack, overridesDir, { [file.path]: null });
    if (!report.ok) throw new VoiceError(422, "Going back to the baseline would make the pack invalid (another edit depends on it), so nothing was changed.", report.errors);
    await ctx.audit?.({ action: "voice:revert", path: file.path, details: { pack: pack.id, path: file.path } });
    if (previous !== null) writeHistory(overridesDir, pack.id, actor.id, file.path, previous, true);
    removeOverride(overridesDir, pack.id, file.path);
    const reload = reloadServedPacks(overridesDir, [pack.id]);
    if (!reload.ok) {
      if (previous !== null) writeOverride(overridesDir, pack.id, file.path, previous);
      throw new VoiceError(500, "The pack could not be reloaded, so the revert was undone.", Object.values(reload.errors).flat());
    }
    return { path: file.path, changed: true, overridden: false, warnings: [] };
  });
}

export function historyOf(ctx: VoiceContext, rel: unknown): HistoryEntry[] {
  const file = findVoiceFile(ctx.pack, rel);
  if (!file) throw new VoiceError(400, "That is not a file that can be edited.");
  return listHistory(ctx.overridesDir, ctx.pack.id, file.path);
}

/** Puts an old version back, through exactly the checks a new save goes through. */
export function restoreVersion(ctx: VoiceContext, actor: VoiceActor, rel: unknown, version: unknown): Promise<VoiceResult> {
  const file = lookup(ctx, actor, rel);
  const text = typeof version === "string" ? readHistory(ctx.overridesDir, ctx.pack.id, file.path, version) : null;
  if (text === null) throw new VoiceError(404, "That saved version was not found.");
  return saveOverride(ctx, actor, file.path, text, { restoredFrom: version });
}

/** The overrides of a pack as { relative path: text }, for the export CLI and the tests. */
export function collectOverrides(pack: CommunityPack, overridesDir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of listVoiceFiles(pack)) {
    const own = overrideText(overridesDir, pack, f);
    if (own !== null) out[f.path] = own;
  }
  return out;
}
