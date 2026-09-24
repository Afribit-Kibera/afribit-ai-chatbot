"""
Step 1 of the manual-ingestion pipeline: dump a .docx's paragraphs to a
plain UTF-8 text file, one paragraph per line, in document order. This is
the only step that touches the .docx itself -- parse_bitcoin_basics.py and
parse_comm_skills.py both operate on this paragraph-per-line text, not the
docx directly, so re-running the pipeline never needs a docx library
dependency added to the Node project.

Usage:
    python extract_docx_text.py <input.docx> <output.txt>

Must write with encoding="utf-8" explicitly -- letting this go through
print()/stdout redirection on Windows silently mangles curly quotes and
other non-ASCII punctuation via the console codepage.
"""
import sys
import zipfile
import xml.etree.ElementTree as ET

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def extract(docx_path: str, out_path: str) -> int:
    z = zipfile.ZipFile(docx_path)
    xml = z.read("word/document.xml").decode("utf-8")
    root = ET.fromstring(xml)
    paras = []
    for p in root.iter(f"{W_NS}p"):
        texts = [t.text or "" for t in p.iter(f"{W_NS}t")]
        paras.append("".join(texts))
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(paras))
    return len(paras)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python extract_docx_text.py <input.docx> <output.txt>")
        sys.exit(1)
    n = extract(sys.argv[1], sys.argv[2])
    print(f"Wrote {n} paragraphs to {sys.argv[2]}")
