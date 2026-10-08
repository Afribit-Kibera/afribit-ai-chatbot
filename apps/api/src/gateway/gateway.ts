import type { AfribitChatRequest, AfribitChatResponse, InferenceProvider } from "@afribit/shared";
import { getModelProfile } from "../config/modelProfiles.js";

/** Default for hosted APIs. A profile can override it with `timeoutMs` (community nodes need far longer). */
const CHAT_TIMEOUT_MS = 15_000;

function timeoutFor(profileName: string): number {
  return getModelProfile(profileName).timeoutMs ?? CHAT_TIMEOUT_MS;
}

/** One model call, as the gateway saw it. Recorded by whatever meter the server installs (see usage/meter.ts). */
export interface UsageEvent {
  requestId: string;
  /** The community pack the call was made for (see setScope); null when the gateway has no scope, as in scripts. */
  packId: string | null;
  profile: string;
  provider: string;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number | null;
  estimatedCostUsd: number | null;
  status: "ok" | "error" | "timeout";
  errorMessage: string | null;
}

export type UsageMeter = (event: UsageEvent) => Promise<void>;

export class GatewayError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new GatewayError(`Request timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * PRD §16 — the Afribit AI Gateway. This is the ONLY thing in the app that
 * knows how to pick a provider, retry, and fall back. Callers (routes,
 * services) depend only on this class, never on OpenRouterProvider or any
 * future provider directly — that is the whole point of the abstraction.
 */
export class AfribitAIGateway {
  private meter: UsageMeter | null = null;
  private scope: (() => string | null) | null = null;

  constructor(private readonly providers: Map<string, InferenceProvider>) {}

  /** Record every model call (answers, waiter, chef; successes and failures). A meter failure never affects the call. */
  setMeter(meter: UsageMeter | null): void {
    this.meter = meter;
  }

  /** Tell the gateway which community pack the running call belongs to (the server passes getPack().id), so each metered call carries it. */
  setScope(scope: (() => string | null) | null): void {
    this.scope = scope;
  }

  private async record(request: AfribitChatRequest, profileName: string, outcome: { response: AfribitChatResponse } | { error: unknown }): Promise<void> {
    if (!this.meter) return;
    const providerName = getModelProfile(profileName).provider;
    try {
      const packId = this.scope ? this.scope() : null;
      if ("response" in outcome) {
        const r = outcome.response;
        await this.meter({
          requestId: request.requestId, packId, profile: profileName, provider: r.provider, model: r.model,
          promptTokens: r.usage.promptTokens, completionTokens: r.usage.completionTokens, latencyMs: r.latencyMs,
          estimatedCostUsd: r.estimatedCostUsd, status: "ok", errorMessage: null,
        });
      } else {
        const message = outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
        await this.meter({
          requestId: request.requestId, packId, profile: profileName, provider: providerName, model: getModelProfile(profileName).model,
          promptTokens: null, completionTokens: null, latencyMs: null, estimatedCostUsd: null,
          status: /timed out/i.test(message) ? "timeout" : "error", errorMessage: message.slice(0, 300),
        });
      }
    } catch (err) {
      console.warn(`[gateway] usage meter failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Attempts the requested model profile, then its configured fallback
   * profile (once) if the first attempt fails or times out. Throws
   * GatewayError if both attempts fail — callers should catch this and
   * apply the non-AI fallback described in PRD §17.3 / §28.
   */
  async chat(request: AfribitChatRequest): Promise<AfribitChatResponse> {
    try {
      return await this.attempt(request, request.modelProfile);
    } catch (primaryError) {
      const primaryProfile = getModelProfile(request.modelProfile);
      if (!primaryProfile.fallbackProfile) {
        throw new GatewayError("Primary model failed and no fallback is configured", primaryError);
      }
      // Previously silent -- docs/COMMUNICATION_STYLE_EVAL.md Finding 5:
      // a fallback to a much weaker model is a real, user-facing quality
      // cliff, and the only way that eval noticed it happened was
      // comparing response.model against what was requested. Log it so
      // it's visible without needing an eval script running.
      console.warn(
        `[gateway] ${request.modelProfile} failed, falling back to ${primaryProfile.fallbackProfile}: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`,
      );
      try {
        return await this.attempt(request, primaryProfile.fallbackProfile);
      } catch (fallbackError) {
        throw new GatewayError("Primary and fallback models both failed", fallbackError);
      }
    }
  }

  private resolve(request: AfribitChatRequest, profileName: string): { provider: InferenceProvider; scopedRequest: AfribitChatRequest } {
    const profile = getModelProfile(profileName);
    const provider = this.providers.get(profile.provider);
    if (!provider) {
      throw new GatewayError(`No provider registered for "${profile.provider}"`);
    }
    const scopedRequest: AfribitChatRequest = {
      ...request,
      modelProfile: profileName,
      maxOutputTokens: Math.min(request.maxOutputTokens, profile.maxOutputTokens),
      temperature: profile.temperature,
      privacyProfile: profile.privacyProfile,
    };
    return { provider, scopedRequest };
  }

  private async attempt(request: AfribitChatRequest, profileName: string): Promise<AfribitChatResponse> {
    const { provider, scopedRequest } = this.resolve(request, profileName);
    try {
      const response = await withTimeout(provider.chat(scopedRequest), timeoutFor(profileName));
      await this.record(request, profileName, { response });
      return response;
    } catch (error) {
      await this.record(request, profileName, { error });
      throw error;
    }
  }

  /**
   * Streaming counterpart to `chat()`. Falls back to the configured fallback
   * profile if the primary fails before producing its first chunk (same
   * policy as `chat()`); once streaming has actually started, a later
   * failure ends the generator with a GatewayError rather than silently
   * switching models mid-response — the caller persists whatever content
   * arrived and surfaces the error to the client.
   */
  async *chatStream(request: AfribitChatRequest): AsyncGenerator<string, AfribitChatResponse, void> {
    try {
      return yield* this.attemptStream(request, request.modelProfile);
    } catch (primaryError) {
      const primaryProfile = getModelProfile(request.modelProfile);
      if (!primaryProfile.fallbackProfile) {
        throw new GatewayError("Primary model failed and no fallback is configured", primaryError);
      }
      console.warn(
        `[gateway] ${request.modelProfile} failed (stream), falling back to ${primaryProfile.fallbackProfile}: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`,
      );
      try {
        return yield* this.attemptStream(request, primaryProfile.fallbackProfile);
      } catch (fallbackError) {
        throw new GatewayError("Primary and fallback models both failed", fallbackError);
      }
    }
  }

  private async *attemptStream(request: AfribitChatRequest, profileName: string): AsyncGenerator<string, AfribitChatResponse, void> {
    const { provider, scopedRequest } = this.resolve(request, profileName);
    const generator = provider.chatStream(scopedRequest);

    // Only the time-to-first-chunk is bounded — once tokens are flowing,
    // total response time depends on length, not a fixed idle timeout.
    let first: IteratorResult<string, AfribitChatResponse>;
    try {
      first = await withTimeout(generator.next(), timeoutFor(profileName));
    } catch (error) {
      await this.record(request, profileName, { error });
      throw error;
    }
    if (first.done) {
      await this.record(request, profileName, { response: first.value });
      return first.value;
    }
    yield first.value;

    while (true) {
      let next: IteratorResult<string, AfribitChatResponse>;
      try {
        next = await generator.next();
      } catch (error) {
        await this.record(request, profileName, { error });
        throw error;
      }
      if (next.done) {
        await this.record(request, profileName, { response: next.value });
        return next.value;
      }
      yield next.value;
    }
  }

  async healthCheckAll(): Promise<Record<string, Awaited<ReturnType<InferenceProvider["health"]>>>> {
    const entries = await Promise.all(
      [...this.providers.entries()].map(async ([name, provider]) => [name, await provider.health()] as const),
    );
    return Object.fromEntries(entries);
  }
}
