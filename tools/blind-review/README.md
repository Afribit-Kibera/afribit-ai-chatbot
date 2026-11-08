# Blind review tool

An AI judge is cheap but it is not a Sheng speaker. This tool lets community reviewers compare answers from different AI setups **without knowing which setup wrote which**, so what we learn is about the answers, not about the names.

It is deliberately simple: one HTML file that works offline on a phone, and one script that unblinds the results. No server, no accounts, nothing uploaded.

## For maintainers

1. **Prepare the answers.** Make a JSON file:

   ```json
   {
     "title": "Afribit AI answer review",
     "items": [
       { "id": "T1", "mode": "sheng", "question": "…",
         "answers": [ { "variant": "current", "text": "…" }, { "variant": "compact-prompt", "text": "…" } ] }
     ]
   }
   ```

   `mode` is one of `sheng`, `swahili`, `simple_en`, `mixed_ke`. Give every variant the **same post-processing**, so formatting differences do not give the source away.

2. **Build the pack.**

   ```bash
   node tools/blind-review/build.mjs answers.json out/ [seed]
   ```

   This writes `out/review.html` (send it to reviewers) and `out/key.json` (**keep it private** — it says which answer is which). Answer order is shuffled for every question.

3. **Send `review.html`** by WhatsApp, email or Drive. Ask each reviewer to send back the `review-<name>.json` file the page saves.

4. **Score.**

   ```bash
   node tools/blind-review/score.mjs out/key.json review-*.json
   ```

   You get, per variant: how natural reviewers found it (1–5), how often it was correct, how often it was flagged as risky, and how often it was picked as best — plus how often reviewers agreed, and every free-text note with the variant it was about.

## Single-answer review with approved references

Set top-level `"reviewMode": "single"`, supply exactly one answer per item, and optionally add a
`reference` string and `criteria` string array to each item. The page asks whether the unchanged
answer is acceptable as written. This is not a comparison or an E-002 benchmark. Omit `reviewMode`
to keep the legacy paired comparison. Source/operator metadata is not copied into the page.

New keys contain the pack ID and review mode; scoring refuses returns from another pack. Score each
separately shuffled pack with its own key. Never distribute keys or the private build directory.
Exports whose reviewer name begins `AUTOMATED-FIXTURE` are refused as UI tests, not human judgments.
The [live-answer handoff](../../docs/guides/live-answer-human-review.md) has the prepared copies and
the independent-review/collection procedure. `pnpm --filter @afribit/api test:review-tool` runs six
documented fixtures without model calls.

## For reviewers

You will see questions a learner might ask, each with several answers. Rate **how natural** each sounds, **whether it is correct**, and tick the box if it could mislead or put a learner at risk. Then pick the one you would be happiest to show a learner. Use the notes box for anything — especially "here is what I would actually say". Your answers stay on your phone until you tap *Save my answers* and send the file back. Never type a real seed phrase, PIN or password.

## Notes

- A name or initials is required; a pseudonym is fine. Area and age group are optional. This information stays in the browser and returned file. Any sharing and storage need the reviewer's agreement, as the [data stewardship policy](../../docs/governance/data-stewardship.md) intends.
- A reviewer's notes are contributions: with their agreement they can become entries in the language corpus under the project's content licence ([CC BY-SA 4.0](../../LICENSE-CONTENT)).
- This is a small-sample instrument. Three reviewers cannot settle a question, but they can tell us fast whether the AI judge is flattering a model.
