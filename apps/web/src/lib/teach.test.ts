import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, sendSuggestion } from "./api.js";

afterEach(() => vi.unstubAllGlobals());

describe("F-003: say it your way", () => {
  it("sends the suggestion with the member's own consent choices", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendSuggestion({
      sessionId: "s1",
      messageId: "m1",
      answerText: "Bitcoin is digital money.",
      suggestion: "Bitcoin ni pesa ya digital, msee",
      languageMode: "sheng",
      consent: { answers: true, testing: false, training: false },
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain("/api/v1/teach");
    const sent = JSON.parse(init.body);
    expect(sent.consent).toEqual({ answers: true, testing: false, training: false });
    expect(sent).not.toHaveProperty("questionText");
  });
  it("surfaces the server's refusal (a secret, or too many) as an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"error":"Never share your seed phrase."}', { status: 400 })));
    await expect(
      sendSuggestion({ sessionId: null, messageId: null, answerText: "a", suggestion: "abc", languageMode: "sheng", consent: { answers: true, testing: false, training: false } }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
