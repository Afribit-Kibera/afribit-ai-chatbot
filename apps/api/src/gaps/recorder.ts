import { randomUUID } from "node:crypto";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { env } from "../config/env.js";
import { waiterProfile } from "../waiter/ticket.js";
import { isGap, labelPrompt, parseTopic, roundConfidence } from "./rules.js";
import { gapStore, type GapStore } from "./store.js";

/**
 * After an answer has been sent: if search found little, note a gap under a topic (docs/features/F-004).
 * Never awaited by the chat path, and never throws: a failure here must not touch the member's answer.
 */
export interface GapInput {
  packId: string;
  message: string;
  languageMode: string;
  /** The best card's meaning-match score (bge-m3 cosine), or null when meaning search found no card. */
  meaningScore: number | null;
  nearestCard: string | null;
  /** False when meaning search did not run: then nothing is recorded. */
  judged: boolean;
}

export async function noteGap(gateway: AfribitAIGateway, input: GapInput, store: GapStore = gapStore): Promise<"none" | "labelled" | "unlabelled" | "failed"> {
  try {
    if (!isGap(input.meaningScore, input.judged, env.gapThreshold)) return "none";
    let label: string | null = null;
    if (env.gapLabels) {
      try {
        const existing = await store.openTopics(input.packId, 40);
        const response = await gateway.chat({
          requestId: randomUUID(),
          messages: [
            { role: "system", content: labelPrompt(existing) },
            { role: "user", content: input.message.slice(0, 1200) },
          ],
          languageMode: input.languageMode,
          explanationLevel: "simple",
          modelProfile: waiterProfile(),
          maxOutputTokens: 40,
          temperature: 0,
          privacyProfile: "strict",
        });
        label = parseTopic(response.content);
        // Reuse the existing spelling when the model wrote an existing topic in another case.
        const same = existing.find((t) => label && t.toLowerCase() === label.toLowerCase());
        if (same) label = same;
      } catch (err) {
        console.warn(`[gaps] topic label failed; counted as unlabelled: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    await store.record({ packId: input.packId, label, languageMode: input.languageMode, nearestCard: input.nearestCard, confidence: roundConfidence(input.meaningScore) });
    return label ? "labelled" : "unlabelled";
  } catch (err) {
    console.warn(`[gaps] could not record a gap: ${err instanceof Error ? err.message : String(err)}`);
    return "failed";
  }
}
