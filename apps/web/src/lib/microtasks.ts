import { authHeaders } from "./auth.js";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function submitLanguageExample(params: {
  utterance: string;
  meaning?: string;
  style: "simple_en" | "swahili" | "sheng" | "mixed_ke";
}): Promise<{ id: string }> {
  const response = await fetch(`${API_BASE}/api/v1/microtasks/language-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  return response.json();
}
