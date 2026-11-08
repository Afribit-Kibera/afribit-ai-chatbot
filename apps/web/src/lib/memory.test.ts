import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { memoryRequest } from "./memory.js";
import { setLearnerIdentity } from "./learnerSession.js";
const A = { id: "a", token: "a-token", label: "A" }, B = { id: "b", token: "b-token", label: "B" };
beforeEach(() => { vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: () => { }, removeItem: () => { } }); setLearnerIdentity(A); });
afterEach(() => { setLearnerIdentity(null); vi.unstubAllGlobals(); });
describe("personal memory requests", () => {
  it("requires account auth, disables cache and treats 204 as successful erasure", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 })); vi.stubGlobal("fetch", fetcher);
    expect(await memoryRequest("/items/one", "DELETE")).toBeUndefined();
    expect(fetcher.mock.calls[0]![1].headers.Authorization).toBe("Bearer a-token");
    expect(fetcher.mock.calls[0]![1].cache).toBe("no-store");
    setLearnerIdentity(null); await expect(memoryRequest()).rejects.toThrow("Sign in"); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("drops a late private response after the member switches accounts", async () => {
    let resolve!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((r) => { resolve = r; })));
    const pending = memoryRequest(); setLearnerIdentity(B); resolve(Response.json({ content: "A-private-note" }));
    await expect(pending).rejects.toThrow("Account changed");
  });
  it("sends explicit version and review consent to the snapshot endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: "snapshot" })); vi.stubGlobal("fetch", fetcher);
    await memoryRequest("/items/one/submit", "POST", { version: 2, consentToReview: true });
    expect(fetcher.mock.calls[0]![0]).toContain("/me/memory/items/one/submit");
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({ version: 2, consentToReview: true });
  });
});
