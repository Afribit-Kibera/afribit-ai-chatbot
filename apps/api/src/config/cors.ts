/**
 * Which websites may call the API from a browser.
 *
 * Shared by the normal CORS plugin and by the streaming chat route, which hijacks the raw response
 * (bypassing the plugin) and has to set the header itself. Exact matches only: never a wildcard, and
 * never reflect an origin that is not on the list.
 */

/** "https://a.org, https://b.org/" -> ["https://a.org", "https://b.org"]; blanks and trailing slashes dropped. */
export function parseOrigins(value: string): string[] {
  return value
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter((o) => o.length > 0);
}

/** The origin to put in Access-Control-Allow-Origin for this request, or null if the site is not allowed. */
export function matchOrigin(requestOrigin: string | undefined, allowed: readonly string[]): string | null {
  if (!requestOrigin) return null;
  const origin = requestOrigin.trim().replace(/\/+$/, "");
  return allowed.includes(origin) ? origin : null;
}
