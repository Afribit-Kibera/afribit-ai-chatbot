# Manual extraction pipeline

Turns the two source `.docx` teaching manuals (repo root) into the JSON
files `seedCommunityManuals.ts` reads from `../`. Kept as a documented,
rerunnable pipeline rather than one-off hand transcription, because these
are safety-sensitive Bitcoin/communication instructions in Sheng — retyping
44 chapters by hand risks silently changing meaning.

Requires Python 3 (no packages beyond the standard library). Not part of
the Node/pnpm workspace, same reasoning as `db/seed/README.md`: this stays
dependency-free rather than adding a docx-parsing library to the Node
project for a step that only needs to run when the source manuals change.

## Pipeline

```
<Manual>.docx
  -> extract_docx_text.py   (docx -> paragraph-per-line .txt, UTF-8)
  -> parse_*.py             (.txt -> structured JSON)
  -> ../<manual>_manual.json
  -> seedCommunityManuals.ts (JSON -> knowledge_entries / language_entries)
```

Run from this directory:

```bash
python extract_docx_text.py "../../../../../../Bitcoin_Basics_in_Kenyan_Sheng_Afribit_AI.docx" bitcoin_basics.txt
python parse_bitcoin_basics.py bitcoin_basics.txt ../bitcoin_basics_manual.json

python extract_docx_text.py "../../../../../../Basic_Communication_Skills_in_Kenyan_Sheng_Afribit_AI.docx" comm_skills.txt
python parse_comm_skills.py comm_skills.txt ../communication_skills_manual.json

rm bitcoin_basics.txt comm_skills.txt   # intermediate .txt, not checked in
```

(Paths above assume the manuals stay at the repo root — adjust if they move.)

## Why paragraph-per-line text as the middle step

`word/document.xml` splits a document's visible text across many `<w:t>`
runs. Reading straight from the XML at parse time would make the parser
depend on Word's run-splitting quirks. Flattening to one paragraph per
line first means `parse_*.py` only ever has to find recurring section
headings (`Simple English`, `Sheng Teaching Version`, `AI Teaching
Guidance`, ...) as exact-match lines — the same technique that makes the
manuals easy for a human trainer to scan is what makes them parseable.

**Always write the intermediate `.txt` with `encoding="utf-8"` explicitly**
(not `print(...)` redirected to a file) — on Windows, redirected stdout
uses the console codepage and silently mangles curly quotes, em dashes,
and other non-ASCII punctuation that both manuals use throughout.

## Parser assumptions (verified against both documents before trusting them)

- `parse_bitcoin_basics.py`: chapters 1-18 all follow the same 7-section
  shape (verified: `AI Teaching Guidance` and each other heading appear
  exactly 18 times each in the source text). Chapter 19 (merchant/customer
  practice) and chapter 20 (FAQ) are special-cased — confirmed by the
  heading count not dividing evenly across all 20 chapters otherwise.
- `parse_comm_skills.py`: chapters 1-21 all follow the same 8-section
  shape, each with exactly 5 rows in its "Useful Phrases" table (verified
  count). Chapters 22-24 (role plays / AI operating guide / assessment)
  are special-cased.

If the manuals are revised and a chapter's structure changes, re-run the
verification greps described in this pipeline's commit before trusting a
re-parse — a silent heading rename would make the parser skip that
chapter's content rather than error loudly.

## Regenerating after an edit to the manuals

Re-run the pipeline above, then diff the resulting JSON before re-running
`seedCommunityManuals.ts` — the diff is the actual review surface for what
changed in the source manual.
