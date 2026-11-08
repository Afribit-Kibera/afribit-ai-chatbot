import type { LanguageModeId } from "@afribit/shared";
import { authHeaders } from "./auth.js";
import { API_BASE, readResponse } from "./api.js";

export async function submitLanguageExample(params: {
  utterance: string;
  meaning?: string;
  style: LanguageModeId;
}): Promise<{ id: string }> {
  const response = await fetch(
    `${API_BASE}/api/v1/microtasks/language-entries`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(params),
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

export interface LanguageEntry {
  id: string;
  utterance: string;
  meaning: string | null;
  style: string;
  status?: string;
  contributor_key?: string;
  created_at: string;
}
export async function getReviewQueue(): Promise<LanguageEntry[]> {
  const result = await readResponse<{ queue: LanguageEntry[] }>(
    await fetch(`${API_BASE}/api/v1/microtasks/queue`, {
      headers: authHeaders(),
    }),
  );
  return result.queue;
}
export async function getMySubmissions(): Promise<LanguageEntry[]> {
  const result = await readResponse<{ submissions: LanguageEntry[] }>(
    await fetch(`${API_BASE}/api/v1/microtasks/mine`, {
      headers: authHeaders(),
    }),
  );
  return result.submissions;
}
export async function reviewLanguageEntry(
  id: string,
  decision: "approve" | "reject" | "needs_changes",
  notes: string,
): Promise<void> {
  await readResponse(
    await fetch(
      `${API_BASE}/api/v1/microtasks/language-entries/${encodeURIComponent(id)}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ decision, notes }),
      },
    ),
  );
}
export async function voteLanguageEntry(
  id: string,
  naturalness: number,
): Promise<void> {
  await readResponse(
    await fetch(
      `${API_BASE}/api/v1/microtasks/language-entries/${encodeURIComponent(id)}/vote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ naturalness }),
      },
    ),
  );
}
