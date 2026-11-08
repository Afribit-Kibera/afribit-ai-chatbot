import { API_BASE, readResponse } from "./api.js";
import { communityHeaders } from "./communityScope.js";
import { getLearnerIdentity, learnerHeaders, sameLearnerIdentity } from "./learnerSession.js";

export interface MemoryItem { id: string; content: string; allow_remote: boolean; version: number }
export interface MemoryState { enabled: boolean; items: MemoryItem[]; localAvailable: boolean; canReview: boolean }
export interface MemorySubmission { id: string; content: string; status: "pending" | "approved" | "rejected" | "withdrawn"; first_approval_by?: string | null; submitted_by?: string }
export async function memoryRequest<T>(path = "", method = "GET", body?: unknown, review = false): Promise<T> {
  const token = getLearnerIdentity()?.token;
  if (!token) throw new Error("Sign in to manage memory");
  const response = await fetch(`${API_BASE}/api/v1/${review ? "community/knowledge-submissions" : "me/memory"}${path}`, {
    method, headers: { "Content-Type": "application/json", ...communityHeaders(), ...learnerHeaders() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store",
  });
  const result = response.status === 204 ? undefined as T : await readResponse<T>(response);
  if (!sameLearnerIdentity(token)) throw new Error("Account changed; reload memory");
  return result;
}
