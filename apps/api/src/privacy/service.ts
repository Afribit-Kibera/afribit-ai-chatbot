import { env } from "../config/env.js";
import { deriveModelLocation, type ModelLocation } from "./location.js";
import { publicRetention } from "./retention.js";

/**
 * What GET /api/v1/pack tells the app about this server, so its privacy sentence is always true
 * (docs/features/F-001-model-location-label.md, F-002-privacy-settings.md).
 */
export interface ServiceInfo {
  modelLocation: ModelLocation;
  retention: ReturnType<typeof publicRetention>;
}

export function serviceInfo(): ServiceInfo {
  return {
    modelLocation: deriveModelLocation({ inferenceMode: env.inferenceMode, setting: env.modelLocationSetting, localLlmBaseUrl: env.localLlmBaseUrl }),
    retention: publicRetention(env.chatRetention),
  };
}
