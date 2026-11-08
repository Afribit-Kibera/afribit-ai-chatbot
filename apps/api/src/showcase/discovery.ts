import { hash } from "./protocol.js";

export interface ModelCandidate {
  id: string; repository: string; purpose: "translation" | "chat-baseline" | "research";
  artifactKind: "specialist" | "instruction" | "base-research" | "adapter";
  expectedLicense: string; trainingDataLicense: string; filename: string | null; source: string; notes: string;
}
export interface ModelCatalog { schema: 1; reviewedOn: string; models: ModelCandidate[] }
const safeFile = (s: unknown): s is string => typeof s === "string" && s.length > 0 && s.length <= 300 && s.split("/").every(p => p !== "." && p !== ".." && /^[a-zA-Z0-9_.-]+$/.test(p));
export function validateCatalog(value: unknown): ModelCatalog {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid model catalog");
  const c = value as ModelCatalog;
  if (Object.keys(c).some(k => !["schema", "reviewedOn", "models"].includes(k)) || c.schema !== 1 || typeof c.reviewedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.reviewedOn)
    || !Array.isArray(c.models) || c.models.length < 1 || c.models.length > 8) throw new Error("Invalid catalog bounds");
  for (const m of c.models) {
    if (!m || typeof m !== "object" || Object.keys(m).some(k => !["id", "repository", "purpose", "artifactKind", "expectedLicense", "trainingDataLicense", "filename", "source", "notes"].includes(k))
      || typeof m.id !== "string" || !/^[a-z0-9-]{1,60}$/.test(m.id) || typeof m.repository !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}\/[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/.test(m.repository)
      || !["translation", "chat-baseline", "research"].includes(m.purpose) || !["specialist", "instruction", "base-research", "adapter"].includes(m.artifactKind)
      || typeof m.expectedLicense !== "string" || !/^[a-z0-9.-]{1,80}$/.test(m.expectedLicense) || typeof m.trainingDataLicense !== "string" || m.trainingDataLicense.length > 300
      || (m.filename !== null && !safeFile(m.filename)) || m.source !== `https://huggingface.co/${m.repository}` || typeof m.notes !== "string" || m.notes.length > 1000) throw new Error("Invalid model candidate or source");
  }
  if (new Set(c.models.map(m => m.id)).size !== c.models.length || new Set(c.models.map(m => m.repository)).size !== c.models.length) throw new Error("Duplicate model candidate");
  return structuredClone(c);
}
export function inspectMetadata(candidate: ModelCandidate, raw: unknown) {
  const b = raw as any;
  if (!b || typeof b !== "object" || b.id !== candidate.repository || typeof b.sha !== "string" || !/^[a-f0-9]{40,64}$/.test(b.sha)
    || !Array.isArray(b.siblings) || b.siblings.length > 5000) throw new Error("Metadata identity/revision is invalid");
  const revision = b.sha as string;
  const declaredLicense = typeof b.cardData?.license === "string" ? b.cardData.license : null;
  const files = b.siblings.filter((f: any) => typeof f?.rfilename === "string" && /\.(gguf|safetensors|bin)$/i.test(f.rfilename) && (candidate.filename === null || f.rfilename === candidate.filename))
    .map((f: any) => {
      if (!safeFile(f.rfilename)) throw new Error("Unsafe model artifact path");
      const size = f.size ?? f.lfs?.size;
      const sha = f.lfs?.sha256;
      return { filename: f.rfilename as string, bytes: Number.isSafeInteger(size) && size >= 0 ? size as number : null,
        publisherReportedSha256: typeof sha === "string" && /^[a-f0-9]{64}$/.test(sha) ? sha : null,
        pinnedUrl: `https://huggingface.co/${candidate.repository}/resolve/${revision}/${f.rfilename.split("/").map(encodeURIComponent).join("/")}` };
    });
  const issues: string[] = [];
  if (declaredLicense !== candidate.expectedLicense) issues.push(declaredLicense === null ? "license-unknown" : "license-label-mismatch");
  if (!files.length) issues.push("no-matching-weight-artifact");
  if (files.some((f: any) => f.bytes === null || f.publisherReportedSha256 === null)) issues.push("artifact-size-or-digest-unknown");
  if (candidate.artifactKind === "adapter") issues.push("matching-base-and-license-required");
  if (candidate.artifactKind === "base-research") issues.push("not-instruction-or-chat-trained");
  if (candidate.purpose !== "chat-baseline" || candidate.artifactKind !== "instruction") issues.push("outside-general-chat-shortlist");
  return { candidateId: candidate.id, repository: candidate.repository, revision, declaredLicense, expectedLicense: candidate.expectedLicense,
    trainingDataLicenseReview: candidate.trainingDataLicense, intendedPurpose: candidate.purpose, artifactKind: candidate.artifactKind,
    reportedPipeline: typeof b.pipeline_tag === "string" ? b.pipeline_tag : null, metadataHash: hash(raw), fetchedAt: new Date().toISOString(), files, issues,
    generalChatReviewCandidate: candidate.purpose === "chat-baseline" && candidate.artifactKind === "instruction" && !issues.length,
    activated: false, inferenceTested: false, integrityVerified: false, runtimeRamRequirement: "unmeasured", reviewStatus: "pending-human-runtime-license-review" };
}
export class PublicModelMetadata {
  constructor(private readonly base = "https://huggingface.co", private readonly timeoutMs = 10000, private readonly maxBytes = 2_097_152) {
    const u = new URL(base);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 10000 || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 2_097_152) throw new Error("Invalid metadata transport bounds");
    if (base !== "https://huggingface.co" && !(u.protocol === "http:" && u.hostname === "127.0.0.1" && !u.username && !u.password && !u.search && !u.hash && u.pathname === "/")) throw new Error("Unsupported metadata origin");
  }
  async read(candidate: ModelCandidate) {
    validateCatalog({ schema: 1, reviewedOn: "2026-10-26", models: [candidate] });
    const url = `${this.base.replace(/\/$/, "")}/api/models/${candidate.repository}?blobs=true`;
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(this.timeoutMs), headers: { Accept: "application/json" } });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Metadata HTTP ${response.status}`); }
    if (!response.body) throw new Error("Missing metadata body");
    const reader = response.body.getReader(), buffers: Uint8Array[] = []; let bytes = 0;
    try {
      for (;;) {
        const chunk = await reader.read(); if (chunk.done) break;
        bytes += chunk.value.byteLength; if (bytes > this.maxBytes) throw new Error("Metadata response too large"); buffers.push(chunk.value);
      }
      return inspectMetadata(candidate, JSON.parse(Buffer.concat(buffers).toString("utf8")));
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}
