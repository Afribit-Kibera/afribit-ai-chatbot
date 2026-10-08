/**
 * Channel attribution for the pilot. A link such as https://ai.afribit.africa/app?ref=kibera-hub says
 * WHERE it was shared (a hub, a class, a poster), never who the learner is. The label is kept in this
 * browser so it survives reloads and a PWA install, and is sent as `source` when a conversation starts.
 * Nothing else about the person is read or stored. The API checks the same rule again.
 */
export const SOURCE_KEY = "afribit.source";
const SOURCE_SLUG = /^[a-z0-9][a-z0-9-]{0,31}$/;

/** The slug if `value` is a valid channel label, else null. */
export function parseSource(value: unknown): string | null {
  return typeof value === "string" && SOURCE_SLUG.test(value) ? value : null;
}

/** The minimal slice of Storage used here, so tests can pass a plain object. */
export interface SourceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): SourceStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** The label saved in this browser, or null. Never throws (storage can be blocked). */
export function getSource(storage: SourceStorage | null = defaultStorage()): string | null {
  try {
    return parseSource(storage?.getItem(SOURCE_KEY));
  } catch {
    return null;
  }
}

/**
 * Reads `ref` from a URL query string (`?ref=kibera-hub`) and, if it is a valid label, saves it. A newer
 * valid link replaces an older one; an invalid or missing `ref` changes nothing. Returns the label now in force.
 */
export function captureSource(search: string, storage: SourceStorage | null = defaultStorage()): string | null {
  let ref: string | null = null;
  try {
    ref = parseSource(new URLSearchParams(search).get("ref"));
  } catch {
    ref = null;
  }
  if (ref) {
    try {
      storage?.setItem(SOURCE_KEY, ref);
    } catch {
      /* Without storage the label still works for this page load only. */
    }
    return ref;
  }
  return getSource(storage);
}
