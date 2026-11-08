import type { AfribitChatMessage } from "@afribit/shared";

/** Conservative admission estimate, NOT a model-tokenizer count or a universal token upper bound. */
export function contextHeadroom(messages: AfribitChatMessage[], outputTokens: number, windowTokens: number) {
  const contentBytes = messages.reduce((sum, m) => sum + Buffer.byteLength(m.content, "utf8"), 0);
  const messageAllowance = messages.length * 64;
  const templateAllowance = 256;
  const promptEstimate = contentBytes + messageAllowance + templateAllowance;
  return { estimator: "utf8-bytes-plus-message64-template256-v1", exactTokenizer: false,
    windowTokens, contentBytes, messageAllowance, templateAllowance, promptEstimate,
    reservedOutputTokens: outputTokens, remainingEstimate: windowTokens - promptEstimate - outputTokens };
}
