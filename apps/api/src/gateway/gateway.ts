import type { AfribitChatRequest, AfribitChatResponse, InferenceProvider } from "@afribit/shared";
import { getModelProfile } from "../config/modelProfiles.js";

const CHAT_TIMEOUT_MS = 15_000;

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
  constructor(private readonly providers: Map<string, InferenceProvider>) {}

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
    return withTimeout(provider.chat(scopedRequest), CHAT_TIMEOUT_MS);
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
    const first = await withTimeout(generator.next(), CHAT_TIMEOUT_MS);
    if (first.done) return first.value;
    yield first.value;

    while (true) {
      const next = await generator.next();
      if (next.done) return next.value;
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
