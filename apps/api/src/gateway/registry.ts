import type { InferenceProvider } from "@afribit/shared";
import { LocalProvider } from "../providers/localProvider.js";
import { OpenRouterProvider } from "../providers/openRouterProvider.js";
import { AfribitAIGateway } from "./gateway.js";

/**
 * Wire up available providers here. Adding a provider is a one-line addition
 * to this map — nothing else in the app changes. "openrouter" is hosted
 * inference; "local" is a community node's own model server.
 */
function buildProviderRegistry(): Map<string, InferenceProvider> {
  const providers = new Map<string, InferenceProvider>();
  providers.set("openrouter", new OpenRouterProvider());
  providers.set("local", new LocalProvider());
  return providers;
}

export function createGateway(): AfribitAIGateway {
  return new AfribitAIGateway(buildProviderRegistry());
}
