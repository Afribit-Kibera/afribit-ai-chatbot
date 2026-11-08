import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  consumeChatStream,
  parseStreamEvent,
  readResponse,
  sendFeedback,
  streamChatMessage,
  type ChatStreamEvent,
} from "./api.js";
const encoder = new TextEncoder();
function stream(chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
}
afterEach(() => vi.unstubAllGlobals());
describe('actionable service errors',()=>{
 it('preserves the explanation for a stale Studio revision',async()=>{
  await expect(readResponse(new Response(JSON.stringify({statusCode:409,error:'Conflict',message:'This draft changed. Reload before saving.'}),{status:409}))).rejects.toThrow('This draft changed. Reload before saving.');
 });
 it('does not show internal server error details in learner screens',async()=>{
  await expect(readResponse(new Response(JSON.stringify({error:'Internal Server Error',message:'Synthetic database diagnostic'}),{status:500}))).rejects.toThrow('The service could not complete this request. Please retry.');
 });
});
describe("NDJSON chat", () => {
  it("preserves effective processing policy and approved-card source through streaming",async()=>{
    const events:ChatStreamEvent[]=[];
    await consumeChatStream(stream([encoder.encode('{"type":"meta","sessionId":"s","safetyFlag":null,"processingPolicy":"local-only"}\n{"type":"delta","text":"Approved text"}\n{"type":"done","messageId":"m","usedFallback":false,"answerSource":"reviewed-card"}\n')]),(e)=>events.push(e));
    expect(events[0]).toMatchObject({processingPolicy:"local-only"});
    expect(events.at(-1)).toMatchObject({answerSource:"reviewed-card"});
    expect(parseStreamEvent('{"type":"done","messageId":"m","usedFallback":false,"answerSource":"made-up"}')).toMatchObject({answerSource:undefined});
  });
  it("reads split UTF-8, CRLF, blank lines and a final line without newline", async () => {
    const bytes = encoder.encode(
      '\n{"type":"meta","sessionId":"s1","safetyFlag":null}\r\n{"type":"delta","text":"Karibu — Bitcoin"}\n{"type":"done","messageId":"m1","usedFallback":false}',
    );
    const events: ChatStreamEvent[] = [];
    await consumeChatStream(
      stream([...bytes].map((byte) => new Uint8Array([byte]))),
      (event) => events.push(event),
    );
    expect(events).toEqual([
      { type: "meta", sessionId: "s1", safetyFlag: null },
      { type: "delta", text: "Karibu — Bitcoin" },
      { type: "done", messageId: "m1", usedFallback: false },
    ]);
  });
  it("does not silently accept a truncated answer", async () => {
    await expect(
      consumeChatStream(
        stream([encoder.encode('{"type":"delta","text":"unfinished"}\n')]),
        () => {},
      ),
    ).rejects.toThrow("before the answer was finished");
  });
  it("propagates errors, including an error before any token", async () => {
    await expect(
      consumeChatStream(
        stream([
          encoder.encode('{"type":"error","message":"Provider unavailable"}\n'),
        ]),
        () => {},
      ),
    ).rejects.toThrow("Provider unavailable");
  });
  it("validates event payloads", () => {
    expect(() => parseStreamEvent('{"type":"delta","text":3}')).toThrow();
  });
  it("falls back when streaming is unsupported", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        Response.json({
          sessionId: "s",
          messageId: "m",
          content: "answer",
          safetyFlag: null,
          usedFallback: false,
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const events: ChatStreamEvent[] = [];
    await streamChatMessage(
      {
        sessionId: null,
        message: "question",
        languageMode: "sheng",
        explanationLevel: "deep",
      },
      (event) => events.push(event),
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(events.map((e) => e.type)).toEqual(["meta", "delta", "done"]);
    expect(JSON.parse(fetcher.mock.calls[1]![1].body)).toMatchObject({
      languageMode: "sheng",
      explanationLevel: "deep",
    });
  });
  it("sends the saved channel label as `source`, and nothing when there is none", async () => {
    const reply = () => new Response(null, { status: 404 });
    const fetcher = vi.fn().mockImplementation(async () => reply());
    vi.stubGlobal("fetch", fetcher);
    const params = { sessionId: null, message: "q", languageMode: "simple_en" as const, explanationLevel: "simple" as const };
    const bodyOf = (call: number) => JSON.parse(fetcher.mock.calls[call]![1].body) as Record<string, unknown>;

    vi.stubGlobal("localStorage", { getItem: () => "kibera-hub", setItem: () => {} });
    await streamChatMessage(params, () => {}).catch(() => {});
    expect(bodyOf(0).source).toBe("kibera-hub");

    vi.stubGlobal("localStorage", { getItem: () => "NOT A SLUG", setItem: () => {} });
    await streamChatMessage(params, () => {}).catch(() => {});
    expect("source" in bodyOf(2)).toBe(false);

    vi.stubGlobal("localStorage", { getItem: () => "kibera-hub", setItem: () => {} });
    await streamChatMessage({ ...params, source: "poster-1" }, () => {}).catch(() => {});
    expect(bodyOf(4).source).toBe("poster-1");
  });
  it.each([429, 500, 503])("never repeats a %s request", async (status) => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('{"error":"Wait"}', { status }));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      streamChatMessage(
        {
          sessionId: null,
          message: "q",
          languageMode: "simple_en",
          explanationLevel: "simple",
        },
        () => {},
      ),
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not repeat a failed partial stream", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          stream([encoder.encode('{"type":"delta","text":"partial"}\n')]),
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    await expect(
      streamChatMessage(
        {
          sessionId: null,
          message: "q",
          languageMode: "simple_en",
          explanationLevel: "simple",
        },
        () => {},
      ),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects failed feedback and preserves reason/comment in a successful request", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      sendFeedback("m", "not_helpful", "unsafe", "Please review"),
    ).rejects.toThrow();
    await sendFeedback("m", "not_helpful", "unsafe", "Please review");
    expect(JSON.parse(fetcher.mock.calls[1]![1].body)).toEqual({
      rating: "not_helpful",
      reason: "unsafe",
      comment: "Please review",
    });
  });
});
