import { AsyncLocalStorage } from "node:async_hooks";
import type { AfribitChatMessage } from "@afribit/shared";
import { contextHeadroom } from "./contextBudget.js";

const context = new AsyncLocalStorage<number>();
/** Explicit operator scope, also covers fully assembled normal-API memory/history requests. */
export function withNativeContextBudget<T>(windowTokens: number, work: () => T): T {
  if (!Number.isSafeInteger(windowTokens) || windowTokens < 512 || windowTokens > 131072 || context.getStore() !== undefined)
    throw new Error("Invalid or nested native context contract");
  return context.run(windowTokens, work);
}
export function assertNativeContext(messages: AfribitChatMessage[], outputTokens: number, api: string, configured: number) {
  const expected = context.getStore();
  if (expected === undefined) return;
  if (api !== "ollama" || configured !== expected) throw new Error("Native context contract does not match the configured transport");
  if (!Number.isSafeInteger(outputTokens) || outputTokens < 1 || contextHeadroom(messages, outputTokens, expected).remainingEstimate < 0)
    throw new Error("Native context exceeds window with reserved output headroom");
}
export function assertNativeCompletion(finishReason: string) {
  if (context.getStore() !== undefined && finishReason !== "stop") throw new Error("Native answer incomplete under rehearsal contract");
}
