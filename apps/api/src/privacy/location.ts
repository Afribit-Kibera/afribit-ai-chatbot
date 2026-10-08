/**
 * Where the language model runs, as members are told it (docs/features/F-001-model-location-label.md).
 *
 * The rule is "never overstate": the app may say "your questions stay here" only when the model server is
 * this machine or a container next to it, or when the operator explicitly says it is the community's own.
 * Anything else that `auto` cannot prove is reported as `remote` ("answered on another server"). A private
 * IP address is deliberately NOT proof: an Afribit Local box reaches Afribit's GPU through a tunnel on a
 * private address (ADR 0016), and that is not "here".
 */
export type ModelLocation = "community" | "afribit" | "hybrid" | "cloud" | "remote";
export type ModelLocationSetting = "auto" | "community" | "afribit";

export function parseModelLocationSetting(raw: string | undefined): ModelLocationSetting {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "" || v === "auto") return "auto";
  if (v === "community" || v === "afribit") return v;
  throw new Error(`MODEL_LOCATION must be "auto", "community" or "afribit" (got "${raw}")`);
}

/** True only for a model server on this machine or a sibling container (a host name with no dot). */
export function isOnThisMachine(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return false;
  }
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") return true;
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  // A single-label name such as "ollama" is a service on the same Docker network (the node kit's setup).
  return !host.includes(".") && !host.includes(":") && /^[a-z0-9-]+$/.test(host);
}

export function deriveModelLocation(input: {
  inferenceMode: "cloud" | "node" | "hybrid";
  setting: ModelLocationSetting;
  localLlmBaseUrl: string;
}): ModelLocation {
  if (input.inferenceMode === "cloud") return "cloud";
  if (input.inferenceMode === "hybrid") return "hybrid";
  if (input.setting === "afribit") return "afribit";
  if (input.setting === "community") return "community";
  return isOnThisMachine(input.localLlmBaseUrl) ? "community" : "remote";
}

/** Which kind of server produced an answer, for the per-answer marker ("Answered by an outside AI service"). */
export function answeredBy(provider: string | null | undefined): "local" | "outside" {
  return provider === "openrouter" ? "outside" : "local";
}
