import { afterEach, describe, expect, it, vi } from "vitest";
import { register, RegisterError } from "./auth.js";

afterEach(() => vi.unstubAllGlobals());

const refused =
  '{"error":"Could not create the account. Check the invitation code, or ask your administrator for a new one."}';

describe("F-012: accounts by invitation only", () => {
  it("sends the invitation code with the sign-up", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('{"token":"t","role":"reviewer"}', { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const r = await register("a@x.org", "a-long-password", "Amina", "  afb-7k4m-q9tx ");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain("/api/v1/auth/register");
    expect(JSON.parse(init.body).invitationCode).toBe("afb-7k4m-q9tx");
    expect(r.role).toBe("reviewer");
  });
  it("a bad code (or a taken email) is a refusal the form can put in the member's language", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(refused, { status: 409 })));
    const err = await register("a@x.org", "a-long-password", undefined, "AFB-AAAA-BBBB").catch((e) => e);
    expect(err).toBeInstanceOf(RegisterError);
    expect(err.reason).toBe("refused");
  });
  it("a server that is not creating accounts says so", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"error":"closed"}', { status: 403 })),
    );
    const err = await register("a@x.org", "a-long-password").catch((e) => e);
    expect(err).toBeInstanceOf(RegisterError);
    expect(err.reason).toBe("closed");
  });
  it("an empty code is not sent at all", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(refused, { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);
    await register("a@x.org", "a-long-password", undefined, "   ").catch(() => {});
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).not.toHaveProperty("invitationCode");
  });
});
