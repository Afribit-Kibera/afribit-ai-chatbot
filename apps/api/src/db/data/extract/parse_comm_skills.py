"""
Parse Basic_Communication_Skills_in_Kenyan_Sheng_Afribit_AI.docx (paragraph-
per-line text dump) into structured JSON: chapters 1-21 (standard skill
format), 22 (role plays), 23 (AI tutor operating guide -- the communications
layer), 24 (assessment, captured but not meant for RAG ingestion), plus
Appendix A (core phrase bank), Appendix B (Sheng glossary), front-matter
guidance (Communication Loop / Register Ladder / Language Rules for the AI
Tutor), and the source list.
"""
import json
import re
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "comm_skills.txt"
OUT = sys.argv[2] if len(sys.argv) > 2 else "../communication_skills_manual.json"

with open(SRC, encoding="utf-8") as f:
    lines = [l.rstrip("\n") for l in f]

STANDARD_HEADINGS = [
    "Simple English",
    "Sheng Teaching Version",
    "Skill Breakdown",
    "Useful Phrases",
    "Conversation Practice",
    "Try It",
    "Common Mistakes",
    "AI Teaching Guidance",
]

chapter_starts = [i for i, l in enumerate(lines) if re.match(r"^CHAPTER \d+$", l)]
appendix_a_idx = next(i for i, l in enumerate(lines) if l.strip() == "Appendix A Core Phrase Bank")
chapter_bounds = list(zip(chapter_starts, chapter_starts[1:] + [appendix_a_idx]))


def strip_table_header_noise(rows, ncols, header_tokens):
    """Drop a leading `header_tokens` row (e.g. ['Function','Phrase',...]) if present."""
    if rows[:ncols] == header_tokens:
        return rows[ncols:]
    return rows


chapters = []
for start, end in chapter_bounds:
    num = int(re.match(r"^CHAPTER (\d+)$", lines[start]).group(1))
    title = lines[start + 1].strip()
    objective = lines[start + 2].strip()
    block = [x for x in lines[start + 3 : end]]

    if num <= 21:
        idxs = {}
        for i, l in enumerate(block):
            if l.strip() in STANDARD_HEADINGS and l.strip() not in idxs:
                idxs[l.strip()] = i
        ordered = sorted(idxs.items(), key=lambda kv: kv[1])
        sections = {}
        for j, (name, i0) in enumerate(ordered):
            i1 = ordered[j + 1][1] if j + 1 < len(ordered) else len(block)
            sections[name] = [x.strip() for x in block[i0 + 1 : i1] if x.strip()]

        # Useful Phrases: 3-col table (phrase / meaning / tone), header row
        # "Sheng or Kenyan speech" / "Simple meaning" / "Use and tone" first.
        phrase_rows = sections.get("Useful Phrases", [])
        phrase_rows = strip_table_header_noise(
            phrase_rows, 3, ["Sheng or Kenyan speech", "Simple meaning", "Use and tone"]
        )
        phrases = []
        for i in range(0, len(phrase_rows) - 2, 3):
            phrases.append({
                "phrase": phrase_rows[i],
                "meaning": phrase_rows[i + 1],
                "tone": phrase_rows[i + 2],
            })

        chapters.append({
            "num": num,
            "title": title,
            "objective": objective,
            "format": "standard",
            "simple_english": " ".join(sections.get("Simple English", [])),
            "sheng_teaching_version": " ".join(sections.get("Sheng Teaching Version", [])),
            "skill_breakdown": sections.get("Skill Breakdown", []),
            "useful_phrases": phrases,
            "conversation_practice": sections.get("Conversation Practice", []),
            "try_it": sections.get("Try It", []),
            "common_mistakes": sections.get("Common Mistakes", []),
            "ai_teaching_guidance": " ".join(sections.get("AI Teaching Guidance", [])),
        })
    elif num == 22:
        chapters.append({
            "num": num, "title": title, "objective": objective,
            "format": "role_plays",
            "raw_lines": [x.strip() for x in block if x.strip()],
        })
    elif num == 23:
        chapters.append({
            "num": num, "title": title, "objective": objective,
            "format": "ai_operating_guide",
            "raw_lines": [x.strip() for x in block if x.strip()],
        })
    elif num == 24:
        chapters.append({
            "num": num, "title": title, "objective": objective,
            "format": "assessment",
            "raw_lines": [x.strip() for x in block if x.strip()],
        })

# ---- Appendix A: Core Phrase Bank (Function / Phrase / Meaning / Tone note)
appendix_b_idx = next(i for i, l in enumerate(lines) if l.strip() == "Appendix B Sheng Glossary")
a_block = [x.strip() for x in lines[appendix_a_idx + 1 : appendix_b_idx] if x.strip()]
a_rows = strip_table_header_noise(a_block, 4, ["Function", "Phrase", "Meaning", "Tone note"])
phrase_bank = []
for i in range(0, len(a_rows) - 3, 4):
    phrase_bank.append({
        "function": a_rows[i],
        "phrase": a_rows[i + 1],
        "meaning": a_rows[i + 2],
        "tone_note": a_rows[i + 3],
    })

# ---- Appendix B: Sheng Glossary (Term / Working meaning / Tone and context)
appendix_c_idx = next(i for i, l in enumerate(lines) if l.strip() == "Appendix C Community Review Worksheet")
b_block = [x.strip() for x in lines[appendix_b_idx + 1 : appendix_c_idx] if x.strip()]
# first line is an intro sentence, then header row, then data triples
b_rows = b_block[1:]
b_rows = strip_table_header_noise(b_rows, 3, ["Term", "Working meaning", "Tone and context"])
glossary = []
for i in range(0, len(b_rows) - 2, 3):
    glossary.append({
        "term": b_rows[i],
        "meaning": b_rows[i + 1],
        "tone_and_context": b_rows[i + 2],
    })

# ---- Front matter: Communication Loop / Register Ladder / AI Tutor rules
front_start = next(i for i, l in enumerate(lines) if l.strip() == "The Communication Loop")
front_end = chapter_starts[0]
front_matter_raw = [x.strip() for x in lines[front_start:front_end] if x.strip()]

# also capture "Respect and safety" + "About This Manual" opening notes
respect_idx = next(i for i, l in enumerate(lines) if l.strip() == "Respect and safety")
about_idx = next(i for i, l in enumerate(lines) if l.strip() == "About This Manual")
respect_note = " ".join(x.strip() for x in lines[respect_idx + 1 : about_idx] if x.strip())

# ---- Sources and Research Notes
sources_idx = next(i for i, l in enumerate(lines) if l.strip() == "Sources and Research Notes")
editorial_idx = next(i for i, l in enumerate(lines) if l.strip() == "Editorial Notes")
source_lines = [x.strip() for x in lines[sources_idx + 1 : editorial_idx] if x.strip()]

with open(OUT, "w", encoding="utf-8") as f:
    json.dump({
        "respect_and_safety": respect_note,
        "front_matter_raw": front_matter_raw,
        "chapters": chapters,
        "phrase_bank": phrase_bank,
        "glossary": glossary,
        "sources": source_lines,
    }, f, ensure_ascii=False, indent=2)

print(f"Parsed {len(chapters)} chapters, {len(phrase_bank)} phrase-bank rows, {len(glossary)} glossary terms, {len(source_lines)} source lines.")
for c in chapters:
    extra = f" ({len(c['useful_phrases'])} phrases)" if c["format"] == "standard" else ""
    print(f"  ch{c['num']:02d} [{c['format']}] {c['title']}{extra}")
