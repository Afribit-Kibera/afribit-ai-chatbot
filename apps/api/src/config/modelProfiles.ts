import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { ModelProfile } from "@afribit/shared";

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

export function getModelProfile(name: string): ModelProfile {
  const profile = profilesByName.get(name);
  if (!profile) {
    throw new Error(`Unknown model profile: ${name}`);
  }
  return profile;
}

export function listModelProfiles(): ModelProfile[] {
  return [...profilesByName.values()];
}
