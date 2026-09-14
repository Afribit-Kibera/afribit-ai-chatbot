/** PRD §10.6 */
export type FeedbackRating = "helpful" | "not_helpful";

export type NegativeFeedbackReason =
  | "too_complicated"
  | "wrong_information"
  | "sheng_unnatural"
  | "too_formal"
  | "too_long"
  | "did_not_answer"
  | "other";

export type PositiveFeedbackReason =
  | "easy_to_understand"
  | "sounds_natural"
  | "good_example"
  | "correct_answer";

export interface MessageFeedback {
  messageId: string;
  rating: FeedbackRating;
  reason: NegativeFeedbackReason | PositiveFeedbackReason | null;
  comment: string | null;
}
