"""
Parse Bitcoin_Basics_in_Kenyan_Sheng_Afribit_AI.docx (paragraph-per-line text
dump) into structured JSON: one record per chapter (1-18 standard format,
19 + 20 special-cased), plus the Appendix A glossary and the source list.

Input is a paragraph-per-line .txt produced from word/document.xml (one
paragraph = one line, in original order) -- not hand-transcribed, so section
boundaries are found by exact-match on the manual's own recurring headings.
"""
import json
import re
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "bitcoin_basics.txt"
OUT = sys.argv[2] if len(sys.argv) > 2 else "../bitcoin_basics_manual.json"

with open(SRC, encoding="utf-8") as f:
    lines = [l.rstrip("\n") for l in f]

STANDARD_HEADINGS = [
    "Simple English",
    "Sheng Teaching Version",
    "Full Explanation",
    "Kibera Example",
    "Check Understanding",
    "Common Confusion",
    "AI Teaching Guidance",
]

chapter_starts = [i for i, l in enumerate(lines) if re.match(r"^CHAPTER \d+$", l)]
# terminate the doc's chapter zone at "Appendix A"
appendix_a_idx = next(i for i, l in enumerate(lines) if l.strip() == "Appendix A Core Glossary")
chapter_bounds = list(zip(chapter_starts, chapter_starts[1:] + [appendix_a_idx]))

chapters = []
for start, end in chapter_bounds:
    num = int(re.match(r"^CHAPTER (\d+)$", lines[start]).group(1))
    title = lines[start + 1].strip()
    objective = lines[start + 2].strip()
    block = lines[start + 3 : end]

    if num <= 18:
        # standard 7-section chapter
        idxs = {}
        for i, l in enumerate(block):
            if l.strip() in STANDARD_HEADINGS and l.strip() not in idxs:
                idxs[l.strip()] = i
        ordered = sorted(idxs.items(), key=lambda kv: kv[1])
        sections = {}
        for j, (name, i0) in enumerate(ordered):
            i1 = ordered[j + 1][1] if j + 1 < len(ordered) else len(block)
            sections[name] = [x.strip() for x in block[i0 + 1 : i1] if x.strip()]
        chapters.append({
            "num": num,
            "title": title,
            "objective": objective,
            "format": "standard",
            "simple_english": " ".join(sections.get("Simple English", [])),
            "sheng_teaching_version": " ".join(sections.get("Sheng Teaching Version", [])),
            "full_explanation": sections.get("Full Explanation", []),
            "kibera_example": " ".join(sections.get("Kibera Example", [])),
            "check_understanding": sections.get("Check Understanding", []),
            "common_confusion": sections.get("Common Confusion", []),
            "ai_teaching_guidance": " ".join(sections.get("AI Teaching Guidance", [])),
        })
    elif num == 19:
        chapters.append({
            "num": num,
            "title": title,
            "objective": objective,
            "format": "merchant_customer_practice",
            "raw_lines": [x.strip() for x in block if x.strip()],
        })
    elif num == 20:
        # FAQ: alternating question / answer paragraphs after the intro line
        qa_lines = [x.strip() for x in block if x.strip()]
        faqs = []
        i = 0
        while i + 1 < len(qa_lines):
            faqs.append({"question": qa_lines[i], "answer": qa_lines[i + 1]})
            i += 2
        chapters.append({
            "num": num,
            "title": title,
            "objective": objective,
            "format": "faq",
            "faqs": faqs,
        })

# ---- Appendix A: Core Glossary (Term / Meaning / Sheng explanation triples)
appendix_b_idx = next(i for i, l in enumerate(lines) if l.strip() == "Appendix B AI Knowledge Card Format")
glossary_block = lines[appendix_a_idx + 1 : appendix_b_idx]
# skip intro sentence + "Term"/"Meaning"/"Sheng explanation" header row
start_i = 0
for i, l in enumerate(glossary_block):
    if l.strip() == "Sheng explanation":
        start_i = i + 1
        break
rows = [x.strip() for x in glossary_block[start_i:] if x.strip()]
glossary = []
for i in range(0, len(rows) - 2, 3):
    glossary.append({
        "term": rows[i],
        "meaning": rows[i + 1],
        "sheng_explanation": rows[i + 2],
    })

# ---- Sources and attribution
sources_idx = next(i for i, l in enumerate(lines) if l.strip() == "Sources and Attribution")
reuse_idx = next(i for i, l in enumerate(lines) if l.strip() == "Reuse Note")
source_lines = [x.strip() for x in lines[sources_idx + 1 : reuse_idx] if x.strip()]

with open(OUT, "w", encoding="utf-8") as f:
    json.dump({
        "chapters": chapters,
        "glossary": glossary,
        "sources": source_lines,
    }, f, ensure_ascii=False, indent=2)

print(f"Parsed {len(chapters)} chapters, {len(glossary)} glossary terms, {len(source_lines)} source lines.")
for c in chapters:
    print(f"  ch{c['num']:02d} [{c['format']}] {c['title']}")
