import { API_BASE, readResponse } from "./api.js";
import { communityHeaders } from "./communityScope.js";
import { getLearnerIdentity, learnerHeaders, sameLearnerIdentity, setLearnerIdentity } from "./learnerSession.js";

export interface CommunityAccess { packId: string; membersOnly: boolean; member: boolean; authenticated: boolean }
export async function memberAccess(signal?: AbortSignal): Promise<CommunityAccess> {
  return readResponse(await fetch(`${API_BASE}/api/v1/community/access`, { headers: { ...communityHeaders(), ...learnerHeaders() }, signal }));
}
export async function memberSignIn(email: string, password: string, invitationCode?: string) {
  const previous = getLearnerIdentity()?.token ?? null;
  const response = await fetch(`${API_BASE}${invitationCode ? "/api/v1/member/register" : "/api/v1/auth/login"}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...communityHeaders() }, body: JSON.stringify({ email, password, invitationCode }),
  });
  const { token } = await readResponse<{ token: string }>(response);
  const profile = await readResponse<{ id: string; email: string; displayName: string | null }>(await fetch(`${API_BASE}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}`, ...communityHeaders() } }));
  if (!sameLearnerIdentity(previous)) throw new Error("Account changed. Please sign in again.");
  setLearnerIdentity({ id: profile.id, token, label: profile.displayName ?? profile.email });
}
export async function joinCommunity(invitationCode: string) {
  await readResponse(await fetch(`${API_BASE}/api/v1/community/join`, { method: "POST", headers: { "Content-Type": "application/json", ...communityHeaders(), ...learnerHeaders() }, body: JSON.stringify({ invitationCode }) }));
}
export async function accountConversations(signal?: AbortSignal) {
  return readResponse<{ conversations: { sessionId: string; title: string; updatedAt: number; notebookId?:string|null }[] }>(await fetch(`${API_BASE}/api/v1/me/conversations`, { headers: { ...communityHeaders(), ...learnerHeaders() }, signal }));
}
