export interface LearnerIdentity { id: string; token: string; label: string }
const KEY = "afribit.learnerSession.v1";
let identity: LearnerIdentity | null | undefined;
const listeners = new Set<() => void>();
const cleanups = new Set<() => void>();

export function getLearnerIdentity(): LearnerIdentity | null {
  if (identity !== undefined) return identity;
  try {
    const stored = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as LearnerIdentity | null;
    identity = stored && typeof stored.id === "string" && typeof stored.token === "string" && typeof stored.label === "string" ? stored : null;
  } catch { identity = null; }
  return identity;
}
export function setLearnerIdentity(next: LearnerIdentity | null) {
  cleanups.forEach((cleanup) => cleanup());
  identity = next;
  try { if (next) sessionStorage.setItem(KEY, JSON.stringify(next)); else sessionStorage.removeItem(KEY); } catch { /* Session can remain in memory. */ }
  listeners.forEach((listener) => listener());
}
export function subscribeLearnerIdentity(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function onLearnerIdentityChange(cleanup: () => void) { cleanups.add(cleanup); return () => { cleanups.delete(cleanup); }; }
export function learnerHeaders(): Record<string, string> {
  const account = getLearnerIdentity();
  return account ? { Authorization: `Bearer ${account.token}` } : {};
}
export function sameLearnerIdentity(token: string | null): boolean { return (getLearnerIdentity()?.token ?? null) === token; }
