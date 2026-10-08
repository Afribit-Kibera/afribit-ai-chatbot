# Reviewer guide

For the people who check what the assistant is allowed to say. You do not need to be technical. You need to know the subject and the language.

## What your job is

The assistant answers **only** from knowledge cards that reviewers have approved. A card is one idea, written twice: the full, accurate answer, and the same thing in the simplest words. If a card is wrong, the assistant will be wrong, confidently and in the learner's own language. You are the safety check.

## Logging in

Open `/review` on your community's service (for example `https://your-service/review`) and log in with the account the person who runs the service created for you. It must be a **reviewer** account; a normal contributor account cannot open the page. Works on a phone.

## The path every card takes

| Stage | What it means | Who moves it on |
|---|---|---|
| **Draft** | Someone is writing it. Not used to answer | The writer |
| **Needs fact check** | Waiting for someone to check every statement against a source | A reviewer |
| **Needs language check** | Facts are right; now check that it reads naturally and the simple version is really simple | A reviewer |
| **Approved** | Live: the assistant answers from it | A reviewer |
| **Published** | Live, and part of a released version of the pack | A reviewer |
| **Retired / Archived** | Not used. Kept for the record | A reviewer |

A card cannot skip a stage. If your community has turned on the **two-person rule** (`REVIEW_TWO_PERSON`), the person who last edited a card cannot be the one to make it live, so a second person always looks at it.

## Fact check: what to look for

- Is every statement true, and is it complete enough not to mislead?
- Could anyone lose money, lose access to an account, or be tricked if they relied on exactly this? If yes, add a **safety note** (one per line) so the assistant always says it.
- Are there numbers, prices, dates, opening times or rules that could go out of date? Say where they come from in the change note.
- Does it promise an outcome? Cards should not.

## Language check: what to look for

- Read it aloud. Would a person say it this way?
- Is the "simplest words" version simple, or just shorter?
- Are the key terms the ones people in your community actually use? (The assistant adds the right register for each language mode, but it can only work from what the card says.)

Do not rewrite a card into slang to sound local. The **card** states what is true. The assistant composes the way it is said in each language mode, using the pack's language guides your community wrote.

## Editing a card

You can change a card at any stage. **Changing the words of a live card takes it off air** and sends it back to *Needs fact check*, because an approval is an approval of specific words. Write a short change note saying what changed and why; it is kept in the card's history. Typing a change note is not optional for anything that matters.

## "Is it found?"

Each card has a small box that asks the assistant's search a question the way a learner would, and shows which cards it would hand to the assistant. If you wrote a good card and it is never in the top results, either the card's title and first lines do not say what learners would ask, or the question is worded very differently from the card. Try three or four ways of asking. If it keeps being missed, tell the person who runs the service; the pack's retrieval test set (`eval/retrieval.json`) should get those questions added.

## From reported answers to cards

When a learner reports an answer, it lands in the **Queue** of the [pilot console](pilot-console-guide.md) (`/pilot`). Each report links to the cards the assistant was given; those links open this page with the card list already searched. Fix or add the card here, then mark the report resolved in the console. If the link is `/review?q=<words>`, the card list shows matching cards across every status.

## Things the review page does not do

- It does not check the assistant's answers in each language mode. Do that by reading real answers with your fellow reviewers; the blind-review tool (`tools/blind-review`) is built for it.
- It does not delete cards. Retire or archive them; the history stays.
- It edits the cards in the database. To save them back into the shareable pack folder, the operator runs `pnpm pack:export`.
