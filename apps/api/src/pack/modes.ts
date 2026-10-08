import { getPack } from "./active.js";

/** True when the active pack declares this language mode. */
export function isKnownMode(id: string): boolean {
  return getPack().modes.some((m) => m.id === id);
}

/** The 400 message for a mode this community does not offer; lists what it does. */
export function modeErrorMessage(field: string): string {
  return `${field} must be one of: ${getPack().modes.map((m) => m.id).join(", ")}`;
}
