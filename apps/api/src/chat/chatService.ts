import { randomUUID } from "node:crypto";
import type { AfribitChatMessage, ExplanationLevel, LanguageModeId, RetrievalResult } from "@afribit/shared";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { retrieveKnowledge } from "../knowledge/retrieval.js";
import { retrieveLanguageExamples } from "../knowledge/retrieveLanguageExamples.js";
import { buildPrompt, modeOf } from "../prompt/promptBuilder.js";
import { buildCompactPrompt, buildServePrompt } from "../prompt/compactPrompt.js";
import { getPack } from "../pack/active.js";
import { isKnownMode } from "../pack/modes.js";
import { runChef } from "../restaurant/chef.js";
import { makeTicket } from "../waiter/ticket.js";
import { detectSecret } from "../safety/secretDetector.js";
import { inspectAnswer } from "../safety/grounding.js";
import { checkOutputSafety } from "../safety/outputSafetyCheck.js";
import { GatewayError } from "../gateway/gateway.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { sendPushByToken } from "../notifications/pushService.js";
import { applyPostprocess } from "../prompt/postProcess.js";
import { createSentenceBuffer } from "./sentenceBuffer.js";
import { answeredBy } from "../privacy/location.js";
import { storedContent } from "../privacy/retention.js";
import { noteGap } from "../gaps/recorder.js";
import { semanticSearchEnabled } from "../providers/embeddings.js";

export interface SendMessageInput {
  sessionId: string | null;
  userId: string | null;
  message: string;
  languageMode?: LanguageModeId;
  explanationLevel?: ExplanationLevel;
  /**
   * SECURITY: this must be the server-issued notify_token from
   * PUT /api/v1/notifications/subscription's response, NEVER a raw
   * installationId -- installationId is a non-secret client-generated
   * UUID, and using it here previously let anyone who learned/guessed
   * another user's installationId trigger a push to that victim's device
   * (security-review finding, 2026-09-23; fixed by db/migrations/008).
   */
  notifyToken?: string;
  /**
   * Channel label from the learner's link (?ref=kibera-hub), already validated by the route
   * (pilot/source.ts). Stored when a conversation is created and never changed afterwards.
   */
  source?: string | null;
  /**
   * F-002: the recent turns the browser sent (already validated by privacy/history.ts). Used instead of
   * the stored history only when the server keeps no chats (CHAT_RETENTION=none).
   */
  history?: AfribitChatMessage[];
}

export interface SendMessageOutput {
  sessionId: string;
  messageId: string;
  content: string;
  languageMode: LanguageModeId;
  explanationLevel: ExplanationLevel;
  retrievalConfidence: number | null;
  usedFallback: boolean;
  safetyFlag: string | null;
  /** F-001: "outside" when a hosted model service wrote this answer, otherwise "local". */
  answeredBy: "local" | "outside";
}

const DEFAULT_LEVEL: ExplanationLevel = "normal";

/**
 * Model profile routing (PRD §16.4 -- profiles are config, resolved by
 * name). Exported so dataset-lab/runEval.ts, which exists specifically to
 * test the real production chat path, mirrors this exactly rather than
 * hardcoding a profile that could silently drift out of sync with it.
 *
 * 2026-09-17: tried routing sheng/mixed_ke to a "sheng_chat" profile
 * (Claude Sonnet 5) after chat_evaluations showed default_chat's Llama
 * 3.3 70B bookending responses with corrected Sheng vocabulary while
 * leaving the explanatory body formal -- a rules-only prompt fix didn't
 * clear that. What actually fixed it was adding real demonstrated
 * conversation turns (see SHENG_FEW_SHOT_EXAMPLES in promptBuilder.ts),
 * which worked on Llama too -- a head-to-head comparison after adding
 * them showed both models sustaining natural register throughout, not
 * just at the edges. Reverted to default_chat for sheng/mixed_ke: same
 * comparison caught Llama inventing plausible-but-wrong Lightning-failure
 * troubleshooting steps when retrieval missed the right canonical fact
 * (a Sheng-phrasing gap in the English-only lexical search, not a model
 * problem), while Claude correctly declined to guess -- but Llama was
 * 100% reliable across this whole session against Claude's ~85% (null
 * content / timeouts via OpenRouter's zdr-strict routing), and far
 * cheaper, so it's the better default now that the register problem
 * doesn't require the swap. The sheng_chat profile is left in
 * model-profiles.json in case deep_dive-adjacent Sheng use resurfaces.
 */
export function selectModelProfile(languageMode: LanguageModeId, explanationLevel: ExplanationLevel): string {
  // A community node serves every request itself; "deep" is a cloud-only profile
  // and routing to it would send the question outside the community.
  if (env.inferenceMode === "node") return "node_chat";
  if (env.inferenceMode === "hybrid") return "node_chat_cloud_fallback";
  if (explanationLevel === "deep") return "deep_dive";
  return env.cloudChatProfile;
}

/**
 * The pack a stored conversation belongs to: its id, null for a conversation older than multi-pack
 * support (the default pack's), or undefined when there is no such conversation.
 */
export async function sessionPackId(sessionId: string): Promise<string | null | undefined> {
  const { rows } = await pool.query<{ pack_id: string | null }>("SELECT pack_id FROM chat_sessions WHERE id = $1", [sessionId]);
  return rows.length > 0 ? rows[0]!.pack_id : undefined;
}

async function ensureSession(
  sessionId: string | null,
  userId: string | null,
  languageMode: LanguageModeId,
  explanationLevel: ExplanationLevel,
  source: string | null,
): Promise<string> {
  if (sessionId) {
    const { rows } = await pool.query("SELECT id FROM chat_sessions WHERE id = $1", [sessionId]);
    if (rows.length > 0) return sessionId;
  }
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO chat_sessions (user_id, language_mode, explanation_level, pack_id, source) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, languageMode, explanationLevel, getPack().id, source],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("Failed to create chat session");
  return id;
}

async function loadHistory(sessionId: string, limit = 8) {
  const { rows } = await pool.query<{ role: "user" | "assistant"; content: string }>(
    `SELECT role, content FROM chat_messages
     WHERE session_id = $1 AND role IN ('user', 'assistant')
     ORDER BY created_at DESC LIMIT $2`,
    [sessionId, limit],
  );
  return rows.reverse();
}

/**
 * The gateway's meter writes a model_runs row for every model call as it happens; this ties the
 * ones made for an answer to the message they produced.
 */
async function linkUsage(requestId: string, messageId: string): Promise<void> {
  await pool.query(`UPDATE model_runs SET message_id = $2 WHERE request_id = $1 AND message_id IS NULL`, [requestId, messageId]);
}

/**
 * Did the model bring in names or figures that were nowhere in its prompt? (safety/grounding.ts)
 * "log" records a safety event and changes nothing; "enforce" also tells the caller to withhold the
 * answer. Returns the ungrounded words ([] when grounded, off, or nothing to check).
 */
async function groundingCheck(sessionId: string, answer: string, promptMessages: AfribitChatMessage[]): Promise<string[]> {
  const pack = getPack();
  if (pack.safety.grounding === "off") return [];
  const report = inspectAnswer(answer, promptMessages);
  const ungrounded = report.specifics;
  if (ungrounded.length === 0) return [];
  try {
    await pool.query(`INSERT INTO safety_events (session_id, kind, details) VALUES ($1, 'ungrounded_answer', $2)`, [
      sessionId,
      JSON.stringify({ words: ungrounded.slice(0, 12), mode: pack.safety.grounding }),
    ]);
  } catch (err) {
    console.warn(`[grounding] could not record safety event: ${err instanceof Error ? err.message : String(err)}`);
  }
  return ungrounded;
}

async function insertMessage(params: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  retrievalConfidence?: number | null;
  modelProfile?: string | null;
  provider?: string | null;
  latencyMs?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  safetyFlag?: string | null;
  /** Ids of the knowledge cards handed to the model, for the pilot console's answer review queue. */
  retrievedIds?: string[] | null;
}): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO chat_messages
      (session_id, role, content, retrieval_confidence, model_profile, provider, latency_ms, prompt_tokens, completion_tokens, safety_flag, retrieved_ids)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      params.sessionId,
      params.role,
      // F-002: with CHAT_RETENTION=none no message text is ever written; the row keeps only metadata.
      storedContent(params.content, env.chatRetention),
      params.retrievalConfidence ?? null,
      params.modelProfile ?? null,
      params.provider ?? null,
      params.latencyMs ?? null,
      params.promptTokens ?? null,
      params.completionTokens ?? null,
      params.safetyFlag ?? null,
      params.retrievedIds ?? null,
    ],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("Failed to insert message");
  return id;
}

interface BlockedContext {
  kind: "blocked";
  response: SendMessageOutput;
}

interface ProceedContext {
  kind: "proceed";
  /** F-004: the best meaning-match among the cards found, and whether meaning search ran at all. */
  gapSignal: { meaningScore: number | null; nearestCard: string | null; judged: boolean };
  sessionId: string;
  languageMode: LanguageModeId;
  explanationLevel: ExplanationLevel;
  promptMessages: AfribitChatMessage[];
  modelProfile: string;
  requestId: string;
  topConfidence: number | null;
  retrievedIds: string[];
  fallbackContent: string;
  notifyToken: string | null;
}

/**
 * Shared setup for both the single-shot and streaming chat paths: session
 * resolution, secret detection (short-circuits to `blocked`), retrieval,
 * and prompt assembly (PRD §9.2 steps 1-6). Callers differ only in how they
 * invoke the gateway and persist the result.
 */
async function prepareChat(gateway: AfribitAIGateway, input: SendMessageInput): Promise<BlockedContext | ProceedContext> {
  const pack = getPack();
  const languageMode = input.languageMode && isKnownMode(input.languageMode) ? input.languageMode : pack.defaultMode;
  const explanationLevel = input.explanationLevel ?? DEFAULT_LEVEL;
  const sessionId = await ensureSession(input.sessionId, input.userId, languageMode, explanationLevel, input.source ?? null);

  const secretCheck = pack.safety.secretDetection ? detectSecret(input.message) : ({ detected: false, kind: null, redacted: input.message } as ReturnType<typeof detectSecret>);
  if (secretCheck.detected) {
    await pool.query(`INSERT INTO safety_events (session_id, kind, details) VALUES ($1, $2, $3)`, [
      sessionId,
      `${secretCheck.kind}_detected`,
      JSON.stringify({ length: input.message.length }),
    ]);
    await insertMessage({ sessionId, role: "user", content: secretCheck.redacted, safetyFlag: secretCheck.kind });
    const messageId = await insertMessage({ sessionId, role: "assistant", content: pack.prompts.secretWarning });
    return {
      kind: "blocked",
      response: {
        sessionId,
        messageId,
        content: pack.prompts.secretWarning,
        languageMode,
        explanationLevel,
        retrievalConfidence: null,
        usedFallback: false,
        safetyFlag: secretCheck.kind,
        answeredBy: "local",
      },
    };
  }

  await insertMessage({ sessionId, role: "user", content: input.message });

  // Language examples only matter for sheng/mixed_ke (buildPrompt only
  // renders them there too) -- skip the query entirely for other modes
  // rather than fetch-and-discard.
  const isShengLike = modeOf(pack, languageMode).codeSwitched;
  // Optional waiter: a small model rewrites the message into a clean English search question.
  // Used for SEARCH only -- the answer is still written for the customer's own words. Any
  // failure falls back to those words.
  // The restaurant pipeline needs the ticket too. It is ignored in node mode (no hosted chef there).
  const restaurantOn = env.chatPipeline === "restaurant" && env.inferenceMode !== "node";
  const ticket = env.waiterQueryRewrite || restaurantOn ? await makeTicket(gateway, input.message, languageMode) : null;
  const searchQuery = ticket?.question_en ?? input.message;

  const [retrieval, languageExamples, history] = await Promise.all([
    retrieveKnowledge(searchQuery),
    isShengLike ? retrieveLanguageExamples(input.message) : Promise.resolve([]),
    // F-002: a server that keeps no chats has no history to load; the browser sends the recent turns.
    env.chatRetention.mode === "none"
      ? Promise.resolve([...(input.history ?? []).slice(-7), { role: "user" as const, content: input.message }])
      : loadHistory(sessionId),
  ]);
  const build = env.promptMode === "compact" ? buildCompactPrompt : buildPrompt;
  let promptMessages = build({
    languageMode,
    explanationLevel,
    retrieval,
    languageExamples,
    conversationHistory: history.slice(0, -1), // exclude the message just inserted
    userMessage: input.message,
  });

  // Restaurant pipeline: the chef cooks from the neutral ticket (never the customer's words) and the
  // waiter serves it in the customer's language. Any failure leaves the single-call prompt above in place.
  let modelProfile = selectModelProfile(languageMode, explanationLevel);
  if (restaurantOn && ticket) {
    const facts = await runChef(gateway, ticket, input.message, retrieval);
    if (facts) {
      promptMessages = buildServePrompt({
        languageMode,
        explanationLevel,
        facts: JSON.stringify(facts),
        languageExamples,
        conversationHistory: history.slice(0, -1),
        userMessage: input.message,
      });
      modelProfile = env.inferenceMode === "cloud" ? "serve_cloud" : "serve_local";
    }
  }

  return {
    kind: "proceed",
    sessionId,
    languageMode,
    explanationLevel,
    promptMessages,
    modelProfile,
    requestId: randomUUID(),
    topConfidence: retrieval[0]?.confidence ?? null,
    gapSignal: gapSignalOf(retrieval),
    retrievedIds: retrieval.map((r) => r.conceptId),
    fallbackContent:
      retrieval[0]?.authoritativeContent ??
      pack.prompts.serviceUnavailable,
    notifyToken: input.notifyToken ?? null,
  };
}

async function notifyIfRequested(notifyToken: string | null): Promise<void> {
  if (!notifyToken) return;
  try {
    await sendPushByToken(notifyToken, {
      title: getPack().prompts.notificationTitle,
      body: getPack().prompts.notificationBody,
      url: "/",
      tag: "afribit-chat-reply",
    });
  } catch {
    // Notifications are best-effort; never fail the chat response path.
  }
}

/**
 * PRD §9.2 / §16 / §17.3 end to end: safety check → retrieval → prompt
 * assembly → gateway → non-AI fallback on provider failure → persistence.
 */
export async function sendMessage(gateway: AfribitAIGateway, input: SendMessageInput): Promise<SendMessageOutput> {
  const ctx = await prepareChat(gateway, input);
  if (ctx.kind === "blocked") return ctx.response;

  const { sessionId, languageMode, explanationLevel, promptMessages, modelProfile, requestId, topConfidence, retrievedIds, fallbackContent, notifyToken } = ctx;
  const gapAfterAnswer = gapNoter(gateway, input.message, ctx);

  try {
    const response = await gateway.chat({
      requestId,
      messages: promptMessages,
      languageMode,
      explanationLevel,
      modelProfile,
      // Each profile's own maxOutputTokens (model-profiles.json) is the
      // real per-model ceiling via gateway.resolve()'s Math.min() -- this
      // just needs to not clamp below it. Raised from 500: that literal
      // was silently truncating deep_dive (configured for 800) down to
      // 500 too, not just the newer sheng_chat profile.
      maxOutputTokens: 800,
      temperature: 0.3,
      privacyProfile: "strict",
    });

    // Deterministic cleanup for a persistent structural habit prompt-level
    // fixes couldn't fully suppress -- see postProcess.ts's doc comment.
    const cleanedContent = applyPostprocess(response.content);

    // Hard stop for the two most severe SAFETY_POLICY violations, in case
    // the model ever generates one despite the prompt -- see
    // outputSafetyCheck.ts's doc comment for why this exists as a real-time
    // check rather than prompt-only enforcement.
    const safetyCheck = checkOutputSafety(cleanedContent);
    const ungrounded = safetyCheck.violated ? [] : await groundingCheck(sessionId, cleanedContent, promptMessages);
    const withheldAsUngrounded = ungrounded.length > 0 && getPack().safety.grounding === "enforce";
    const finalContent = safetyCheck.violated ? getPack().prompts.outputWithheld : withheldAsUngrounded ? getPack().prompts.ungroundedNote : cleanedContent;

    const messageId = await insertMessage({
      sessionId,
      role: "assistant",
      content: finalContent,
      retrievalConfidence: topConfidence,
      retrievedIds,
      modelProfile,
      provider: response.provider,
      latencyMs: response.latencyMs,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      safetyFlag: safetyCheck.violated ? `output_safety_${safetyCheck.kind}` : withheldAsUngrounded ? "ungrounded_answer" : undefined,
    });

    await linkUsage(requestId, messageId);

    await notifyIfRequested(notifyToken);
    gapAfterAnswer();

    return {
      sessionId,
      messageId,
      content: finalContent,
      languageMode,
      explanationLevel,
      retrievalConfidence: topConfidence,
      usedFallback: false,
      safetyFlag: safetyCheck.violated ? `output_safety_${safetyCheck.kind}` : withheldAsUngrounded ? "ungrounded_answer" : null,
      answeredBy: answeredBy(response.provider),
    };
  } catch (err) {
    // PRD §17.3 — provider failure: fall back to a canonical knowledge-card
    // answer when retrieval found one, rather than silently failing.
    await pool.query(
      `INSERT INTO model_runs (request_id, profile, status, error_message, pack_id) VALUES ($1, $2, 'error', $3, $4)`,
      [requestId, modelProfile, err instanceof Error ? err.message : String(err), getPack().id],
    );

    const messageId = await insertMessage({
      sessionId,
      role: "assistant",
      content: fallbackContent,
      retrievalConfidence: topConfidence,
      retrievedIds,
      safetyFlag: err instanceof GatewayError ? "provider_failure" : "unknown_error",
    });

    await notifyIfRequested(notifyToken);
    gapAfterAnswer();

    return {
      sessionId,
      messageId,
      content: fallbackContent,
      languageMode,
      explanationLevel,
      retrievalConfidence: topConfidence,
      usedFallback: true,
      safetyFlag: null,
      answeredBy: "local",
    };
  }
}

export type StreamEvent =
  | { type: "meta"; sessionId: string; safetyFlag: string | null }
  | { type: "delta"; text: string }
  | { type: "done"; messageId: string; usedFallback: boolean; answeredBy?: "local" | "outside" }
  | { type: "error"; message: string };

/**
 * Streaming counterpart to `sendMessage` (PRD §27.2). Shares the same
 * safety/retrieval/prompt setup via `prepareChat`; forwards text deltas to
 * `onEvent` as they arrive and persists the assembled message the same way
 * `sendMessage` would once the stream ends.
 */
export async function streamMessage(
  gateway: AfribitAIGateway,
  input: SendMessageInput,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const ctx = await prepareChat(gateway, input);

  if (ctx.kind === "blocked") {
    onEvent({ type: "meta", sessionId: ctx.response.sessionId, safetyFlag: ctx.response.safetyFlag });
    onEvent({ type: "delta", text: ctx.response.content });
    onEvent({ type: "done", messageId: ctx.response.messageId, usedFallback: false, answeredBy: "local" });
    return;
  }

  const { sessionId, languageMode, explanationLevel, promptMessages, modelProfile, requestId, topConfidence, retrievedIds, fallbackContent, notifyToken } = ctx;
  const gapAfterAnswer = gapNoter(gateway, input.message, ctx);
  onEvent({ type: "meta", sessionId, safetyFlag: null });

  let content = "";
  // Hard stop for the two most severe SAFETY_POLICY violations -- see
  // outputSafetyCheck.ts's doc comment. Checked per completed sentence
  // (same buffering the "Kwa hivyo" fix uses) so a violation is caught
  // before that sentence ever reaches the client, not after the fact.
  // Once tripped, no further deltas are forwarded -- the generator is
  // still drained to completion (rather than aborted) purely so
  // finalResponse below stays available for the model_runs record.
  // Plain mutable object rather than a bare `let`: TypeScript's flow
  // analysis narrows a `let` reassigned only inside a nested closure back
  // to its initial value everywhere in the outer function, which isn't
  // correct here since the closure runs synchronously during push()/flush().
  const safetyState: { violation: ReturnType<typeof checkOutputSafety> | null } = { violation: null };
  const sentenceBuffer = createSentenceBuffer((text) => {
    if (safetyState.violation) return;
    const check = checkOutputSafety(text);
    if (check.violated) {
      safetyState.violation = check;
      return;
    }
    onEvent({ type: "delta", text });
  }, applyPostprocess);
  try {
    const generator = gateway.chatStream({
      requestId,
      messages: promptMessages,
      languageMode,
      explanationLevel,
      modelProfile,
      maxOutputTokens: 800, // see sendMessage()'s comment above -- the profile's own ceiling is what actually governs each model
      temperature: 0.3,
      privacyProfile: "strict",
    });

    let response = await generator.next();
    while (!response.done) {
      content += response.value;
      sentenceBuffer.push(response.value);
      response = await generator.next();
    }
    sentenceBuffer.flush();
    const finalResponse = response.value;
    // Persisted content must match the post-processing rules applied per-sentence
    // above exactly -- the transform is a plain global regex replace, so
    // applying it once to the full accumulated text is equivalent and
    // simpler than re-concatenating each already-transformed chunk.
    content = applyPostprocess(content);
    const violation = safetyState.violation;
    if (violation) {
      // Discard the raw content entirely rather than persist a mix of
      // already-streamed-safe-prefix + withheld-unsafe-tail -- keeps the
      // chat history record unambiguous, at the cost of a small mismatch
      // with whatever safe prefix already reached the client's screen
      // before the violation was caught.
      content = getPack().prompts.outputWithheld;
    }
    // The words are already on the user's screen, so in "enforce" mode we cannot take them back: we
    // add the pack's note below them and keep the record identical to what the user saw.
    const ungrounded = violation ? [] : await groundingCheck(sessionId, content, promptMessages);
    const noteUngrounded = ungrounded.length > 0 && getPack().safety.grounding === "enforce";
    const ungroundedNote = noteUngrounded ? "\n\n" + getPack().prompts.ungroundedNote : "";
    content += ungroundedNote;

    const messageId = await insertMessage({
      sessionId,
      role: "assistant",
      content,
      retrievalConfidence: topConfidence,
      retrievedIds,
      modelProfile,
      provider: finalResponse.provider,
      latencyMs: finalResponse.latencyMs,
      promptTokens: finalResponse.usage.promptTokens,
      completionTokens: finalResponse.usage.completionTokens,
      safetyFlag: violation ? `output_safety_${violation.kind}` : noteUngrounded ? "ungrounded_answer" : undefined,
    });

    await linkUsage(requestId, messageId);

    await notifyIfRequested(notifyToken);
    if (violation) {
      onEvent({ type: "delta", text: getPack().prompts.outputWithheld });
    } else if (noteUngrounded) {
      onEvent({ type: "delta", text: ungroundedNote });
    }
    onEvent({ type: "done", messageId, usedFallback: false, answeredBy: answeredBy(finalResponse.provider) });
    gapAfterAnswer();
  } catch (err) {
    await pool.query(
      `INSERT INTO model_runs (request_id, profile, status, error_message, pack_id) VALUES ($1, $2, 'error', $3, $4)`,
      [requestId, modelProfile, err instanceof Error ? err.message : String(err), getPack().id],
    );

    if (content.length > 0) {
      // Streaming had already started when it broke — don't silently swap in
      // the canonical answer under a half-written response; end the turn.
      const messageId = await insertMessage({
        sessionId,
        role: "assistant",
        content,
        retrievalConfidence: topConfidence,
        retrievedIds,
        safetyFlag: "stream_interrupted",
      });
      onEvent({ type: "error", message: "The response was interrupted. Please try again." });
      await notifyIfRequested(notifyToken);
      onEvent({ type: "done", messageId, usedFallback: false });
      gapAfterAnswer();
      return;
    }

    const messageId = await insertMessage({
      sessionId,
      role: "assistant",
      content: fallbackContent,
      retrievalConfidence: topConfidence,
      retrievedIds,
      safetyFlag: err instanceof GatewayError ? "provider_failure" : "unknown_error",
    });
    onEvent({ type: "delta", text: fallbackContent });
    await notifyIfRequested(notifyToken);
    onEvent({ type: "done", messageId, usedFallback: true, answeredBy: "local" });
    gapAfterAnswer();
  }
}

/**
 * F-004: once the answer is out (whichever way it ended), note a gap if search found little. Fire and
 * forget: noteGap never throws, and the member never waits for it. Calling it twice does nothing more.
 */
function gapNoter(gateway: AfribitAIGateway, message: string, ctx: ProceedContext): () => void {
  let done = false;
  const packId = getPack().id;
  return () => {
    if (done) return;
    done = true;
    void noteGap(gateway, { packId, message, languageMode: ctx.languageMode, ...ctx.gapSignal });
  };
}

/**
 * F-004: the gap signal. The legacy `confidence` saturates whenever a question shares common words with a card, so
 * the gap list uses the meaning-match score instead. If meaning search did not run (off, or the embedding call
 * failed), nothing can be judged and no gap is recorded. No card at all, with meaning search on, is a gap.
 */
function gapSignalOf(retrieval: RetrievalResult[]): { meaningScore: number | null; nearestCard: string | null; judged: boolean } {
  const scored = retrieval.filter((r) => typeof r.semanticScore === "number").sort((a, b) => (b.semanticScore as number) - (a.semanticScore as number));
  const best = scored[0];
  return {
    meaningScore: best ? (best.semanticScore as number) : null,
    nearestCard: best?.conceptId ?? retrieval[0]?.conceptId ?? null,
    judged: scored.length > 0 || (retrieval.length === 0 && semanticSearchEnabled()),
  };
}
