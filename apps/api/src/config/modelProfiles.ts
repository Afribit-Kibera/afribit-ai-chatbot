import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { ModelProfile } from "@afribit/shared";
import { AsyncLocalStorage } from "node:async_hooks";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, "..", "..", "config", "model-profiles.json");

interface RawProfile {
  profile: string;
  provider: string;
  model: string;
  fallbackProfile: string | null;
  maxOutputTokens: number;
  temperature: number;
  privacyProfile: "strict" | "standard";
  timeoutMs?: number;
}

const raw = JSON.parse(readFileSync(configPath, "utf-8")) as { profiles: RawProfile[] };

const profilesByName = new Map<string, ModelProfile>(
  raw.profiles.map((p) => [p.profile, p]),
);

const scoped = new AsyncLocalStorage<ReadonlyMap<string, ModelProfile>>();
/** Isolated experiments use explicit profiles without changing deployed defaults or enabling fallbacks. */
export function withModelProfiles<T>(profiles: ModelProfile[], work: () => T): T {
  if (scoped.getStore() || profiles.some(p => p.fallbackProfile !== null) || new Set(profiles.map(p => p.profile)).size !== profiles.length)
    throw new Error("Experiments require distinct, fallback-free profiles and no nested scope");
  return scoped.run(new Map(profiles.map(p => [p.profile, Object.freeze({ ...p })])), work);
}
export function scopedModelProfile(name: string): ModelProfile | undefined { return scoped.getStore()?.get(name); }

export function getModelProfile(name: string): ModelProfile {
  const profile = scopedModelProfile(name) ?? profilesByName.get(name);
  if (!profile) {
    throw new Error(`Unknown model profile: ${name}`);
  }
  return profile;
}

export function listModelProfiles(): ModelProfile[] {
  return [...profilesByName.values()];
}
