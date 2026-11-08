import { afterEach, describe, expect, it, vi } from "vitest";
import { fill, parseService, privacyCopy, type ServiceInfo } from "./privacy.js";
import { MAX_HISTORY_TURNS, MAX_TURN_CHARS, recentTurns, type ChatMessageView } from "./history.js";
import { BUILTIN_PACK, parsePack } from "./pack.js";
import { deleteConversation, deleteConversations, parseStreamEvent, sendFeedback } from "./api.js";
import en from "../locales/en.json";

afterEach(() => vi.unstubAllGlobals());

const service = (modelLocation: ServiceInfo["modelLocation"], mode: ServiceInfo["retention"]["mode"] = "days", days: number | null = 30): ServiceInfo => ({
  modelLocation,
  retention: { mode, days: mode === "days" ? days : null },
});

describe("F-001: where the AI runs", () => {
  it("reads only a well-formed service block from the API", () => {
    expect(parseService({ modelLocation: "afribit", retention: { mode: "days", days: 30 } })).toEqual(service("afribit"));
    expect(parseService({ modelLocation: "community", retention: { mode: "none", days: null } })).toEqual(service("community", "none"));
    for (const bad of [null, "x", {}, { modelLocation: "moon", retention: { mode: "none" } }, { modelLocation: "cloud", retention: { mode: "days" } }, { modelLocation: "cloud", retention: { mode: "forever" } }])
      expect(parseService(bad)).toBeNull();
  });
  it("says 'stays here' only when the server says the model is the community's own", () => {
    for (const loc of ["afribit", "hybrid", "cloud", "remote"] as const) expect(privacyCopy(service(loc)).staysHere).toBe(false);
    expect(privacyCopy(service("community")).staysHere).toBe(true);
    expect(privacyCopy(null)).toMatchObject({ location: "privacy.location.unknown", staysHere: false, retention: null });
    expect(en[privacyCopy(service("community")).location]).toMatch(/stay here/);
    for (const loc of ["afribit", "hybrid", "cloud", "remote"] as const) expect(en[privacyCopy(service(loc)).location]).not.toMatch(/stay here/i);
  });
  it("every location and retention has English wording, and days are filled in", () => {
    for (const loc of ["community", "afribit", "hybrid", "cloud", "remote"] as const) {
      const c = privacyCopy(service(loc));
      expect(en[c.location]).toBeTruthy();
      expect(en[c.short]).toBeTruthy();
    }
    expect(fill(en["privacy.retention.days"], { days: 30 })).toBe("Chats are deleted from the server after 30 days.");
    expect(en[privacyCopy(service("community", "none")).retention!]).toMatch(/not stored/);
  });
  it("the pack carries the service block; the built-in pack (offline, older API) claims nothing", () => {
    const pack = parsePack({ modes: [{ id: "sheng", label: "Sheng" }], service: { modelLocation: "cloud", retention: { mode: "keep", days: null } } });
    expect(pack?.service).toEqual(service("cloud", "keep"));
    expect(parsePack({ modes: [{ id: "sheng" }] })?.service).toBeNull();
    expect(BUILTIN_PACK.service).toBeNull();
  });
  it("an answer says who answered it; anything unexpected is dropped", () => {
    expect(parseStreamEvent('{"type":"done","messageId":"m","usedFallback":false,"answeredBy":"outside"}')).toMatchObject({ answeredBy: "outside" });
    expect(parseStreamEvent('{"type":"done","messageId":"m","usedFallback":false,"answeredBy":"<b>"}')).toEqual({ type: "done", messageId: "m", usedFallback: false });
  });
});

describe("F-002: history and deletion", () => {
  const m = (i: number, o: Partial<ChatMessageView> = {}): ChatMessageView => ({ clientId: `c${i}`, id: `m${i}`, role: i % 2 ? "assistant" : "user", content: `turn ${i}`, ...o });
  it("sends at most the last 8 finished turns, never refused or unfinished ones", () => {
    const msgs = [m(0, { safetyFlag: "seed_phrase" }), ...Array.from({ length: 10 }, (_, i) => m(i + 1)), m(11, { incomplete: true }), m(12, { streaming: true }), m(13, { content: "  " })];
    const turns = recentTurns(msgs);
    expect(turns).toHaveLength(MAX_HISTORY_TURNS);
    expect(turns.at(-1)).toEqual({ role: "user", content: "turn 10" });
    expect(turns.some((t) => t.content === "turn 0")).toBe(false);
  });
  it("cuts a long turn to the API's limit", () => {
    expect(recentTurns([m(0, { content: "x".repeat(MAX_TURN_CHARS + 50) })])[0]!.content).toHaveLength(MAX_TURN_CHARS);
  });
  it("deletes one conversation with DELETE and many in batches of 50", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await deleteConversation("a b");
    expect(fetchMock.mock.calls[0]![0]).toContain("/api/v1/chat/a%20b");
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: "DELETE" });
    fetchMock.mockClear();
    await deleteConversations(Array.from({ length: 120 }, (_, i) => `s${i}`));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body).sessionIds).toHaveLength(20);
  });
  it("a report carries the question and answer only when the learner shares them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendFeedback("m1", "not_helpful", "unsafe");
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).not.toHaveProperty("questionText");
    await sendFeedback("m1", "not_helpful", "unsafe", undefined, { questionText: "q", answerText: "a" });
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toMatchObject({ questionText: "q", answerText: "a" });
  });
});
