import fs from "node:fs";
import path from "node:path";
import type { AfribitChatMessage } from "@afribit/shared";
import { loadBranding } from "./branding.js";
import { DEFAULT_PROMPT_TEXT, defaultModePolicy, PROMPT_FILES, type PromptTextSlot } from "./defaults.js";
import { findOverride } from "./overrides.js";
import { CARD_STATUSES, PACK_SCHEMA, type CommunityPack, type PackCard, type PackMode, type PackPrompts, type PackReport, type PackTopic } from "./types.js";

/**
 * Reads a pack folder, checks it, and returns a CommunityPack. Never throws on a bad pack: problems
 * come back in the report so `pnpm pack:validate` can list all of them at once.
 *
 *   pack.json                       manifest (identity, community, modes, knowledge file list)
 *   prompts/<slot>.md               optional wording overrides (see PROMPT_FILES); defaults are generic and cautious
 *   prompts/few-shots.json          optional demonstrated turns for code-switched modes
 *   language/<mode>.full.md         guidance for a mode in the full prompt (optional; defaults from the manifest)
 *   language/<mode>.compact.md      the same for the compact prompt
 *   knowledge/*.json                { "topics": [...], "entries": [...] }, as listed in pack.json
 *   starter-questions.json          optional suggested first questions per mode
 *
 * Text files end in exactly one newline, which is removed here, so a file's content is the prompt text.
 */

const SLUG = /^[a-z][a-z0-9_-]*$/;
const MODE_ID = /^[a-z][a-z0-9_]*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function readText(file: string): string | null {
  if (!fs.existsSync(file)) return null;
  let text = fs.readFileSync(file, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.endsWith("\r\n")) return text.slice(0, -2);
  if (text.endsWith("\n")) return text.slice(0, -1);
  return text;
}

function readJson(file: string, errors: string[]): unknown {
  const text = readText(file);
  if (text === null) {
    errors.push(`missing file: ${path.basename(path.dirname(file))}/${path.basename(file)}`);
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    errors.push(`${path.basename(file)} is not valid JSON: ${(err as Error).message}`);
    return undefined;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

export interface LoadOptions {
  /** Live wording edits (overrides.ts): <overridesDir>/<packId>/<relative path> replaces that file of the pack. Unset: none. */
  overridesDir?: string;
}

/** The report, plus the pack files that were read from the overrides folder instead of the pack. */
export interface LoadReport extends PackReport {
  overridden: string[];
}

export function loadPack(dir: string, opts: LoadOptions = {}): LoadReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const root = path.resolve(dir);
  const overrideFiles: string[] = [];

  const manifest = readJson(path.join(root, "pack.json"), errors);
  if (!isObj(manifest)) return { ok: false, errors: errors.length ? errors : ["pack.json must be a JSON object"], warnings, overridden: overrideFiles };

  // Where to read a wording file from: its override when one is in use, else the pack. Only the
  // wording files below are looked up this way, so nothing else in a pack can be overridden.
  const seen = new Map<string, string>();
  const at = (rel: string): string => {
    const known = seen.get(rel);
    if (known) return known;
    const found = opts.overridesDir && typeof manifest.id === "string" ? findOverride(opts.overridesDir, manifest.id, rel) : null;
    if (found?.skipped) warnings.push(`override ${rel} ignored: ${found.skipped}`);
    if (found?.file) {
      overrideFiles.push(rel);
      warnings.push(`override: ${rel} is a live edit from the overrides folder, not the reviewed file in the pack`);
    }
    const file = found?.file ?? path.join(root, rel);
    seen.set(rel, file);
    return file;
  };

  if (manifest.schema !== PACK_SCHEMA) errors.push(`pack.json: schema must be "${PACK_SCHEMA}"`);
  const id = manifest.id;
  if (!isStr(id) || !SLUG.test(id)) errors.push('pack.json: "id" must be lowercase letters, digits, "-" or "_" (e.g. "mathare-health")');
  if (!isStr(manifest.name)) errors.push('pack.json: "name" is required (what the assistant is called)');
  if (!isStr(manifest.version) || !SEMVER.test(manifest.version)) errors.push('pack.json: "version" must look like 1.0.0');
  if (!isStr(manifest.description)) errors.push('pack.json: "description" is required');
  if (!isStr(manifest.license)) errors.push('pack.json: "license" is required (for example CC-BY-SA-4.0)');

  const maintainers = Array.isArray(manifest.maintainers) ? manifest.maintainers : [];
  if (maintainers.length === 0) errors.push('pack.json: at least one maintainer ({ "name", "contact" }) is required');
  for (const m of maintainers) if (!isObj(m) || !isStr(m.name) || !isStr(m.contact)) errors.push('pack.json: each maintainer needs "name" and "contact"');

  const community = manifest.community;
  if (!isObj(community) || !isStr(community.name)) errors.push('pack.json: community.name is required');

  const domain = manifest.domain;
  if (!isObj(domain) || !isStr(domain.id) || !isStr(domain.label)) errors.push('pack.json: domain.id and domain.label are required');
  const retrievalDomains = isObj(domain) && Array.isArray(domain.retrievalDomains) ? domain.retrievalDomains.filter(isStr) : [];
  if (isObj(domain) && retrievalDomains.length === 0) errors.push("pack.json: domain.retrievalDomains must list at least one domain");

  if (isObj(manifest.safety) && manifest.safety.grounding !== undefined && !["off", "log", "enforce"].includes(String(manifest.safety.grounding))) errors.push('pack.json: safety.grounding must be "off", "log" or "enforce"');

  // ---- modes -------------------------------------------------------------------------------------
  const modes: PackMode[] = [];
  const rawModes = Array.isArray(manifest.modes) ? manifest.modes : [];
  if (rawModes.length === 0) errors.push("pack.json: at least one language mode is required");
  for (const m of rawModes) {
    if (!isObj(m) || !isStr(m.id) || !MODE_ID.test(m.id)) {
      errors.push('pack.json: each mode needs an "id" of lowercase letters, digits and "_"');
      continue;
    }
    if (modes.some((x) => x.id === m.id)) {
      errors.push(`pack.json: duplicate mode "${m.id}"`);
      continue;
    }
    if (!isStr(m.label) || !isStr(m.description)) {
      errors.push(`pack.json: mode "${m.id}" needs "label" and "description"`);
      continue;
    }
    const fallback = defaultModePolicy(m.label, m.description);
    const full = readText(at(`language/${m.id}.full.md`));
    const compact = readText(at(`language/${m.id}.compact.md`));
    if (full === null && compact === null) warnings.push(`mode "${m.id}": no language/${m.id}.*.md files, using a generic description (fine to start, but a reviewed style guide gives better answers)`);
    modes.push({
      id: m.id,
      label: m.label,
      description: m.description,
      codeSwitched: m.codeSwitched === true,
      policyFull: full ?? fallback.policyFull,
      rulesCompact: compact ?? fallback.rulesCompact,
    });
  }
  const defaultMode = manifest.defaultMode;
  if (!isStr(defaultMode) || !modes.some((m) => m.id === defaultMode)) errors.push('pack.json: "defaultMode" must be one of the declared modes');

  // ---- knowledge ---------------------------------------------------------------------------------
  const topics: PackTopic[] = [];
  const entries: PackCard[] = [];
  const knowledge = manifest.knowledge;
  const files = isObj(knowledge) && Array.isArray(knowledge.files) ? knowledge.files.filter(isStr) : [];
  if (files.length === 0) errors.push('pack.json: knowledge.files must list at least one knowledge JSON file');
  const seenCards = new Set<string>();
  for (const f of files) {
    const data = readJson(path.join(root, f), errors);
    if (data === undefined) continue;
    if (!isObj(data)) {
      errors.push(`${f}: must be an object with "topics" and/or "entries"`);
      continue;
    }
    for (const t of Array.isArray(data.topics) ? data.topics : []) {
      if (!isObj(t) || !isStr(t.id) || !isStr(t.title)) {
        errors.push(`${f}: each topic needs "id" and "title"`);
        continue;
      }
      topics.push({ id: t.id, title: t.title, domain: isStr(t.domain) ? t.domain : retrievalDomains[0] ?? "" });
    }
    for (const e of Array.isArray(data.entries) ? data.entries : []) {
      if (!isObj(e) || !isStr(e.id)) {
        errors.push(`${f}: every card needs an "id"`);
        continue;
      }
      const where = `${f}: card "${e.id}"`;
      if (seenCards.has(e.id)) errors.push(`${where} appears twice`);
      seenCards.add(e.id);
      if (!isStr(e.title)) errors.push(`${where} needs a "title"`);
      if (!isStr(e.canonical_answer)) errors.push(`${where} needs a "canonical_answer"`);
      if (!isStr(e.beginner_answer)) errors.push(`${where} needs a "beginner_answer"`);
      const status = e.status;
      if (typeof status !== "string" || !(CARD_STATUSES as readonly string[]).includes(status)) errors.push(`${where}: "status" must be one of ${CARD_STATUSES.join(", ")}`);
      const cardDomain = isStr(e.domain) ? e.domain : retrievalDomains[0] ?? "";
      if (retrievalDomains.length > 0 && !retrievalDomains.includes(cardDomain)) errors.push(`${where}: domain "${cardDomain}" is not in domain.retrievalDomains, so retrieval would never find it`);
      const safety = Array.isArray(e.safety_notes) ? e.safety_notes.filter((s): s is string => typeof s === "string") : [];
      entries.push({
        id: e.id,
        topic: isStr(e.topic) ? e.topic : null,
        title: String(e.title ?? ""),
        domain: cardDomain,
        canonical_answer: String(e.canonical_answer ?? ""),
        beginner_answer: String(e.beginner_answer ?? ""),
        safety_notes: safety,
        status: (CARD_STATUSES as readonly string[]).includes(String(status)) ? (status as PackCard["status"]) : "draft",
      });
    }
  }
  const topicIds = new Set(topics.map((t) => t.id));
  for (const c of entries) if (c.topic && !topicIds.has(c.topic)) errors.push(`card "${c.id}": topic "${c.topic}" is not defined in the pack's topics`);
  const live = entries.filter((c) => c.status === "approved" || c.status === "published");
  if (entries.length > 0 && live.length === 0) warnings.push("no card is approved or published, so the assistant will answer \"not covered\" to everything until your reviewers approve cards");
  if (entries.length === 0 && errors.length === 0) warnings.push("the pack has no knowledge cards yet; the assistant will answer \"not covered\" (that is the correct cold-start behaviour)");
  const unreviewed = entries.length - live.length;
  if (unreviewed > 0 && live.length > 0) warnings.push(`${unreviewed} card(s) are not approved/published and will not be used to answer`);

  // ---- prompts -----------------------------------------------------------------------------------
  const name = isStr(manifest.name) ? manifest.name : "the assistant";
  const subs: Record<string, string> = {
    name,
    community: isObj(community) && isStr(community.name) ? community.name : "the community",
    domain: isObj(domain) && isStr(domain.label) ? domain.label : "this subject",
    contact: isStr((maintainers[0] as { contact?: unknown } | undefined)?.contact) ? String((maintainers[0] as { contact: string }).contact) : "",
  };
  const fill = (text: string): string => text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in subs ? (subs[k] as string) : m));

  const text = {} as Record<PromptTextSlot, string>;
  const overridden: string[] = [];
  for (const slot of Object.keys(PROMPT_FILES) as PromptTextSlot[]) {
    const own = readText(at(`prompts/${PROMPT_FILES[slot]}`));
    if (own !== null) overridden.push(slot);
    text[slot] = fill(own ?? DEFAULT_PROMPT_TEXT[slot]);
    const stray = text[slot].match(/\{\{\w+\}\}/);
    if (stray) errors.push(`prompts/${PROMPT_FILES[slot]}: unknown placeholder ${stray[0]} (use {{name}}, {{community}}, {{domain}} or {{contact}})`);
  }
  if (overridden.length === 0) warnings.push("no prompts/ files: using the generic defaults. They are safe, but a pack written by your community will sound like it");
  if (modes.some((m) => m.codeSwitched) && !fs.existsSync(at("prompts/few-shots.json"))) {
    warnings.push("code-switched mode(s) declared without prompts/few-shots.json; small models do much better with two or three demonstrated turns");
  }

  let fewShots: AfribitChatMessage[] = [];
  const fewShotFile = at("prompts/few-shots.json");
  if (fs.existsSync(fewShotFile)) {
    const data = readJson(fewShotFile, errors);
    if (Array.isArray(data)) {
      for (const m of data) {
        if (!isObj(m) || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
          errors.push("prompts/few-shots.json: each item must be { role: user|assistant, content: string }");
          break;
        }
        fewShots.push({ role: m.role, content: m.content });
      }
      if (fewShots.length % 2 !== 0) errors.push("prompts/few-shots.json: turns must come in user/assistant pairs");
    } else if (data !== undefined) errors.push("prompts/few-shots.json must be an array");
  }

  // ---- starter questions -------------------------------------------------------------------------
  let starterQuestions: CommunityPack["starterQuestions"] = null;
  const sqFile = at("starter-questions.json");
  if (fs.existsSync(sqFile)) {
    const data = readJson(sqFile, errors);
    if (isObj(data) && isObj(data.byMode)) {
      const byMode: Record<string, string[]> = {};
      for (const [mode, qs] of Object.entries(data.byMode)) {
        if (!modes.some((m) => m.id === mode)) {
          errors.push(`starter-questions.json: unknown mode "${mode}"`);
          continue;
        }
        byMode[mode] = Array.isArray(qs) ? qs.filter(isStr) : [];
      }
      starterQuestions = { reviewed: data.reviewed === true, byMode };
      if (!starterQuestions.reviewed) warnings.push("starter questions are not marked reviewed; apps should treat them as proposals");
    } else if (data !== undefined) errors.push('starter-questions.json must have a "byMode" object');
  }

  // ---- retrieval evaluation (optional) -----------------------------------------------------------
  let evalSet: CommunityPack["eval"] = null;
  const evalFile = path.join(root, "eval", "retrieval.json");
  if (fs.existsSync(evalFile)) {
    const data = readJson(evalFile, errors);
    if (isObj(data)) {
      const known = new Set(entries.map((c) => c.id));
      const cases: NonNullable<CommunityPack["eval"]>["cases"] = [];
      for (const c of Array.isArray(data.cases) ? data.cases : []) {
        if (!isObj(c) || !isStr(c.id) || !isStr(c.query) || !Array.isArray(c.expected) || c.expected.length === 0) {
          errors.push("eval/retrieval.json: each case needs id, query and a non-empty expected list of card ids");
          continue;
        }
        const expected = c.expected.filter(isStr);
        for (const id of expected) if (!known.has(id)) errors.push(`eval/retrieval.json: case ${c.id} expects card "${id}", which is not in the pack`);
        cases.push({ id: c.id, query: c.query, expected });
      }
      const notCovered = (Array.isArray(data.notCovered) ? data.notCovered : []).filter((q): q is { id: string; query: string } => isObj(q) && isStr(q.id) && isStr(q.query));
      evalSet = { cases, notCovered };
    } else if (data !== undefined) errors.push("eval/retrieval.json must be an object with a cases list");
  } else {
    warnings.push("no eval/retrieval.json: add real questions and the cards that should answer them, so you can measure retrieval (pnpm pack:eval)");
  }

  // ---- post-processing rules, search synonyms, known terms (all optional) -------------------------
  const postprocess: CommunityPack["postprocess"] = [];
  const ppFile = at("language/postprocess.json");
  if (fs.existsSync(ppFile)) {
    const data = readJson(ppFile, errors);
    const rules = isObj(data) && Array.isArray(data.rules) ? data.rules : data === undefined ? [] : null;
    if (rules === null) errors.push('language/postprocess.json must be { "rules": [ { "find", "flags", "replace" } ] }');
    for (const r of rules ?? []) {
      if (!isObj(r) || typeof r.find !== "string" || r.find.length === 0 || typeof r.replace !== "string") {
        errors.push('language/postprocess.json: each rule needs a "find" pattern and a "replace" text');
        continue;
      }
      const flags = typeof r.flags === "string" ? r.flags : "g";
      try {
        postprocess.push({ find: new RegExp(r.find, flags), replace: r.replace });
      } catch (err) {
        errors.push(`language/postprocess.json: rule "${r.find}" is not a valid pattern: ${(err as Error).message}`);
      }
    }
  }
  const synonyms: Record<string, string[]> = {};
  const synFile = at("retrieval/synonyms.json");
  if (fs.existsSync(synFile)) {
    const data = readJson(synFile, errors);
    if (isObj(data) && isObj(data.synonyms)) {
      for (const [word, list] of Object.entries(data.synonyms)) {
        if (!Array.isArray(list) || !list.every(isStr)) {
          errors.push(`retrieval/synonyms.json: "${word}" must map to a list of words`);
          continue;
        }
        synonyms[word.toLowerCase()] = list;
      }
    } else if (data !== undefined) errors.push('retrieval/synonyms.json must be { "synonyms": { "word": ["card word", ...] } }');
  }
  const branding = loadBranding(manifest.branding, root, name, errors, warnings);
  const knownTerms = Array.isArray(manifest.knownTerms) ? manifest.knownTerms.filter(isStr).map((t) => t.toLowerCase()) : [];

  if (errors.length > 0) return { ok: false, errors, warnings, overridden: overrideFiles };

  const prompts: PackPrompts = { ...text, fewShots };
  const safety = isObj(manifest.safety) ? manifest.safety : {};
  const groundingMode = safety.grounding === "off" || safety.grounding === "enforce" ? safety.grounding : "log";
  const pack: CommunityPack = {
    schema: PACK_SCHEMA,
    id: String(id),
    name,
    version: String(manifest.version),
    description: String(manifest.description),
    license: String(manifest.license),
    maintainers: maintainers.map((m) => ({ name: String((m as Record<string, unknown>).name), contact: String((m as Record<string, unknown>).contact) })),
    community: { name: subs.community as string, ...(isObj(community) && isStr(community.country) ? { country: community.country } : {}) },
    domain: { id: String((domain as Record<string, unknown>).id), label: subs.domain as string, retrievalDomains },
    defaultMode: String(defaultMode),
    modes,
    knowledgeLabel: isStr(manifest.knowledgeLabel) ? manifest.knowledgeLabel : name,
    knowledge: { topics, entries },
    safety: { secretDetection: safety.secretDetection !== false, grounding: groundingMode },
    prompts,
    postprocess,
    synonyms,
    knownTerms,
    eval: evalSet,
    starterQuestions,
    disclaimers: Array.isArray(manifest.disclaimers) ? manifest.disclaimers.filter(isStr) : [],
    branding,
    dir: root,
  };
  return { ok: true, errors, warnings, pack, overridden: overrideFiles };
}
