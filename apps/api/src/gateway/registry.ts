import type { InferenceProvider } from "@afribit/shared";
import { OpenRouterProvider } from "../providers/openRouterProvider.js";
import { AfribitAIGateway } from "./gateway.js";

/**
 * Wire up available providers here. Adding a future LocalProvider or
 * HybridProvider is a one-line addition to this map — nothing else in the
 * app changes (PRD §16.3, §34).
 */
function buildProviderRegistry(): Map<string, InferenceProvider> {
  const providers = new Map<string, InferenceProvider>();
  providers.set("openrouter", new OpenRouterProvider());
  return providers;
}

export function createGateway(): AfribitAIGateway {
  return new AfribitAIGateway(buildProviderRegistry());
}
