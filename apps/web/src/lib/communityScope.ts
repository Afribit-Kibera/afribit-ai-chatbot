/** Keep an explicitly selected community across in-app navigation. Names are public, never credentials. */
let selected: string | null | undefined;
export function selectedCommunity(): string | null {
  if (selected !== undefined) return selected;
  if (typeof window === "undefined") return null;
  const requested = new URLSearchParams(window.location.search).get("pack");
  selected = requested && /^[\w.-]{1,64}$/.test(requested) ? requested : null;
  return selected;
}
export function communityHeaders(): Record<string, string> {
  const pack = selectedCommunity();
  return pack ? { "x-pack": pack } : {};
}
