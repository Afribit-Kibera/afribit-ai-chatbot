import assert from "node:assert/strict";
import { STATUSES, allowedTransitions, canTransition, isLive, mayMakeLive, slug, statusAfterEdit } from "./rules.js";

/** pnpm --filter @afribit/api test:review -- the review workflow rules (no database needed). */

let passed = 0;
const ok = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

ok("the happy path is allowed step by step", () => {
  assert.ok(canTransition("draft", "needs_factual_review"));
  assert.ok(canTransition("needs_factual_review", "needs_language_review"));
  assert.ok(canTransition("needs_language_review", "approved"));
  assert.ok(canTransition("approved", "published"));
});
ok("a draft cannot skip review and go live", () => {
  for (const to of ["approved", "published"] as const) assert.equal(canTransition("draft", to), false);
  assert.equal(canTransition("needs_factual_review", "approved"), false);
  assert.equal(canTransition("needs_factual_review", "published"), false);
});
ok("a card can be sent back for another look at every review stage", () => {
  assert.ok(canTransition("needs_language_review", "needs_factual_review"));
  assert.ok(canTransition("approved", "needs_language_review"));
  assert.ok(canTransition("published", "needs_factual_review"));
});
ok("no status transitions to itself", () => {
  for (const s of STATUSES) assert.equal(canTransition(s, s), false);
});
ok("every status has a way forward or back (nothing is a dead end)", () => {
  for (const s of STATUSES) assert.ok(allowedTransitions(s).length > 0, s);
});
ok("only approved and published are live", () => {
  assert.deepEqual(STATUSES.filter(isLive), ["approved", "published"]);
});
ok("editing a live card sends it back to factual review; editing a draft leaves it", () => {
  assert.equal(statusAfterEdit("published"), "needs_factual_review");
  assert.equal(statusAfterEdit("approved"), "needs_factual_review");
  assert.equal(statusAfterEdit("draft"), "draft");
  assert.equal(statusAfterEdit("needs_language_review"), "needs_language_review");
});
ok("two-person rule: the last editor cannot make their own card live", () => {
  assert.equal(mayMakeLive({ to: "approved", actor: "amina", lastEditor: "amina", twoPerson: true }), false);
  assert.equal(mayMakeLive({ to: "published", actor: "amina", lastEditor: "amina", twoPerson: true }), false);
});
ok("two-person rule: someone else can; and it never blocks non-live moves", () => {
  assert.ok(mayMakeLive({ to: "approved", actor: "baraka", lastEditor: "amina", twoPerson: true }));
  assert.ok(mayMakeLive({ to: "needs_language_review", actor: "amina", lastEditor: "amina", twoPerson: true }));
});
ok("two-person rule is off by default for single-reviewer communities, and ignores cards with no edit log", () => {
  assert.ok(mayMakeLive({ to: "approved", actor: "amina", lastEditor: "amina", twoPerson: false }));
  assert.ok(mayMakeLive({ to: "approved", actor: "amina", lastEditor: null, twoPerson: true }));
});
ok("slug makes safe ids", () => {
  assert.equal(slug("How long can I keep a book?"), "how_long_can_i_keep_a_book");
  assert.equal(slug("  --  "), "card");
  assert.equal(slug("Café Ñandú"), "cafe_nandu");
  assert.ok(slug("x".repeat(200)).length <= 48);
});

console.log(`review: ${passed} checks passed`);
