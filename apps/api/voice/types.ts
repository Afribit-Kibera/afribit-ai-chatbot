export interface VoiceFile {
  path: string; label: string; group: string; kind: "text" | "json";
  canEdit: boolean; adminOnly: boolean; described: boolean; affects: string[];
  placeholders: string[]; baseline: string; effective: string; baselineIsDefault: boolean;
  overridden: boolean; lastEdit: { at: string; by: string } | null; description: string;
}
export interface VoiceData {
  pack: { id: string; name: string; community: string; defaultMode: string;
    modes: { id: string; label: string }[] };
  role: string; promptMode: "full" | "compact"; chatPipeline: string;
  groups: { id: string; title: string; blurb: string }[];
  maxBytes: number; levels: string[]; files: VoiceFile[];
}
export interface PreviewAnswer {
  answer: string; rawAnswer: string | null; error: string | null;
  blocked: "secret" | "output_safety" | "ungrounded" | null;
  cardIds: string[]; ungrounded: string[]; promptMode: string;
  promptTokensApprox: number; model: string | null; modelProfile: string;
  latencyMs: number; systemPrompt: string; turns: { role: string; content: string }[];
}
export interface PreviewResponse extends PreviewAnswer { saved: PreviewAnswer | null }
export type View = "teach" | "try" | "compare";
export type Api = <T>(method: string, url: string, body?: unknown, signal?: AbortSignal) => Promise<T>;
export interface Version { id: string; at: string; by: string; bytes: number; removed: boolean }

export class ApiError extends Error {
  constructor(message: string, public status = 0, public details: string[] = []) { super(message); }
}
export async function request<T>(token: string | null, pack: string | null, method: string,
  url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (pack) headers["x-pack"] = pack;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal })
    .catch(err => {
      if (err instanceof Error && err.name === "AbortError") throw err;
      throw new ApiError("Could not reach the service. Check your connection and try again.");
    });
  const value = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(value.error || `The request could not be completed (${res.status}).`,
    res.status, Array.isArray(value.errors) ? value.errors : []);
  return value as T;
}
export function textBytes(text: string) { return new TextEncoder().encode(text).length; }
export function guidePath(data: VoiceData, mode: string, prompt = data.promptMode) {
  return data.files.find(f => f.path === `language/${mode}.${prompt}.md`)?.path ?? data.files[0]?.path ?? "";
}
export function fileLabel(file: VoiceFile, data: VoiceData) {
  const match = /^language\/([a-z0-9_]+)\.(full|compact)\.md$/.exec(file.path);
  if (!match) return file.label;
  const language = data.pack.modes.find(m => m.id === match[1])?.label ?? match[1];
  return `${language} guidance${match[2] === "compact" ? " (short version)" : ""}`;
}
export function draftError(file: VoiceFile | undefined, text: string, maxBytes: number) {
  if (!file) return "";
  if (textBytes(text) > maxBytes) return `These instructions are too long. Keep them below ${Math.round(maxBytes / 1024)} KB.`;
  if (file.kind === "json") {
    try { JSON.parse(text); } catch { return "The text format is incomplete. Check the brackets, quotes and commas before testing or saving."; }
  }
  return "";
}
