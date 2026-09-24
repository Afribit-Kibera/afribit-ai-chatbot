import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

/**
 * Seeds knowledge_entries + language_entries from the two first-party
 * Afribit teaching manuals (Bitcoin Basics, Basic Communication Skills —
 * both "Kenyan Sheng" volumes, both marked "Community review draft" by
 * their own front matter). Data comes from apps/api/src/db/data/*.json,
 * produced by the extraction pipeline in data/extract/ (see its README)
 * rather than hand-transcribed here, to avoid silently altering
 * safety-relevant Sheng wording while retyping it.
 *
 * Status policy (deliberately NOT the same as apps/api/src/db/seed.ts's
 * PRD §39 starter pack, which inserts status='published' directly): these
 * manuals' English facts cite real sources (Bitcoin.org, developer docs,
 * Go Sheng, UNICEF/MIT/Cornell/NPSA/WHO communication research) but the
 * documents themselves say the Sheng wording needs community validation
 * before public deployment. knowledge_entries has a status precisely for
 * this split -- 'needs_language_review' (facts fine, beginner_answer
 * still needs a language reviewer) -- rather than 'draft' (nothing
 * reviewed yet) or 'approved'/'published' (usable in production RAG,
 * per PRODUCTION_KNOWLEDGE_STATUSES / retrieval.ts's status filter).
 * Nothing here becomes retrievable until a human promotes it via
 * POST /api/v1/admin/knowledge/:id/publish.
 *
 * language_entries rows land as corpus_layer='L2_community_collected'
 * (docs/LANGUAGE_CORPUS.md: "not yet reviewed"), source_type=
 * 'afribit_authored', human_authored=true, synthetic=false, and every
 * allowed_for_* flag false -- conservative-by-default per migration
 * 002_language_provenance.sql; a reviewer must flip them explicitly.
 *
 * Run with: pnpm --filter @afribit/api exec tsx src/db/seedCommunityManuals.ts
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");

// ---- JSON shapes (mirrors data/extract/parse_*.py output) --------------

interface BBChapterStandard {
  num: number;
  title: string;
  objective: string;
  format: "standard";
  simple_english: string;
  sheng_teaching_version: string;
  full_explanation: string[];
  kibera_example: string;
  check_understanding: string[];
  common_confusion: string[];
  ai_teaching_guidance: string;
}
interface BBChapterMerchant {
  num: number;
  title: string;
  objective: string;
  format: "merchant_customer_practice";
  raw_lines: string[];
}
interface BBChapterFaq {
  num: number;
  title: string;
  objective: string;
  format: "faq";
  faqs: { question: string; answer: string }[];
}
type BBChapter = BBChapterStandard | BBChapterMerchant | BBChapterFaq;

interface BitcoinBasicsManual {
  chapters: BBChapter[];
  glossary: { term: string; meaning: string; sheng_explanation: string }[];
  sources: string[];
}

interface CSChapterStandard {
  num: number;
  title: string;
  objective: string;
  format: "standard";
  simple_english: string;
  sheng_teaching_version: string;
  skill_breakdown: string[];
  useful_phrases: { phrase: string; meaning: string; tone: string }[];
  conversation_practice: string[];
  try_it: string[];
  common_mistakes: string[];
  ai_teaching_guidance: string;
}
interface CSChapterOther {
  num: number;
  title: string;
  objective: string;
  format: "role_plays" | "ai_operating_guide" | "assessment";
  raw_lines: string[];
}
type CSChapter = CSChapterStandard | CSChapterOther;

interface CommunicationSkillsManual {
  respect_and_safety: string;
  front_matter_raw: string[];
  chapters: CSChapter[];
  phrase_bank: { function: string; phrase: string; meaning: string; tone_note: string }[];
  glossary: { term: string; meaning: string; tone_and_context: string }[];
  sources: string[];
}

function loadJson<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8")) as T;
}

const bitcoinBasics = loadJson<BitcoinBasicsManual>("bitcoin_basics_manual.json");
const commSkills = loadJson<CommunicationSkillsManual>("communication_skills_manual.json");

// ---- helpers -------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

interface TopicRow {
  id: string;
  domain: string;
  title: string;
}

interface KnowledgeEntryRow {
  id: string;
  topicId: string;
  title: string;
  canonicalAnswer: string;
  beginnerAnswer: string;
  safetyNotes: string[];
}

interface LanguageEntryRow {
  utterance: string;
  intent: string | null;
  meaning: string | null;
  sourceContext: string;
}

const topics: TopicRow[] = [];
const entries: KnowledgeEntryRow[] = [];
const languageEntries: LanguageEntryRow[] = [];

// ---- Bitcoin Basics: chapters 1-18 (standard) ----------------------------

for (const ch of bitcoinBasics.chapters) {
  if (ch.format === "standard") {
    topics.push({ id: `btc_manual_ch${ch.num}`, domain: "bitcoin", title: ch.title });
    const canonical = [
      ch.simple_english,
      ...ch.full_explanation,
      `Kibera example: ${ch.kibera_example}`,
    ].join("\n\n");
    entries.push({
      id: `btcman.ch${pad2(ch.num)}.${slugify(ch.title)}`,
      topicId: `btc_manual_ch${ch.num}`,
      title: ch.title,
      canonicalAnswer: canonical,
      beginnerAnswer: ch.sheng_teaching_version,
      safetyNotes: [...ch.common_confusion, `AI guidance: ${ch.ai_teaching_guidance}`],
    });
  } else if (ch.format === "merchant_customer_practice") {
    // Known fixed shape confirmed against the source manual (see
    // data/extract/README.md) -- marker-slice rather than a generic
    // parser since this is the only chapter shaped this way.
    const L = ch.raw_lines;
    const idx = (marker: string) => L.findIndex((l) => l === marker);
    const customerFlowStart = idx("Customer Payment Flow") + 1;
    const customerScriptIdx = idx("Sheng Customer Script");
    const merchantFlowStart = idx("Merchant Payment Flow") + 1;
    const merchantScriptIdx = idx("Sheng Merchant Script");
    const scenariosIdx = idx("Practice Scenarios");
    const principleIdx = idx("Operational Principle");

    const customerSteps = L.slice(customerFlowStart, customerScriptIdx);
    const customerScript = L[customerScriptIdx + 1] ?? "";
    const merchantSteps = L.slice(merchantFlowStart, merchantScriptIdx);
    const merchantScript = L[merchantScriptIdx + 1] ?? "";
    // "Situation" / "Safe response" header, then alternating title/body pairs
    const scenarioRows = L.slice(scenariosIdx + 3, principleIdx);
    const scenarios: string[] = [];
    for (let i = 0; i + 1 < scenarioRows.length; i += 2) {
      scenarios.push(`${scenarioRows[i]}: ${scenarioRows[i + 1]}`);
    }
    const operationalPrinciple = L[principleIdx + 1] ?? "";

    topics.push({ id: `btc_manual_ch${ch.num}`, domain: "bitcoin", title: ch.title });
    entries.push({
      id: `btcman.ch${pad2(ch.num)}.customer_payment_flow`,
      topicId: `btc_manual_ch${ch.num}`,
      title: "Customer payment flow (Bitcoin/Lightning)",
      canonicalAnswer: customerSteps.join("\n"),
      beginnerAnswer: customerScript,
      safetyNotes: [`Operational principle: ${operationalPrinciple}`],
    });
    entries.push({
      id: `btcman.ch${pad2(ch.num)}.merchant_payment_flow`,
      topicId: `btc_manual_ch${ch.num}`,
      title: "Merchant payment flow (Bitcoin/Lightning)",
      canonicalAnswer: merchantSteps.join("\n"),
      beginnerAnswer: merchantScript,
      safetyNotes: [`Operational principle: ${operationalPrinciple}`],
    });
    entries.push({
      id: `btcman.ch${pad2(ch.num)}.common_payment_situations`,
      topicId: `btc_manual_ch${ch.num}`,
      title: "Common payment situations and the safe response",
      canonicalAnswer: scenarios.join("\n"),
      // No Sheng version shipped for this table in the source manual --
      // beginner_answer intentionally mirrors canonical_answer until a
      // language reviewer adds one; flagged below in the run summary.
      beginnerAnswer: scenarios.join("\n"),
      safetyNotes: [],
    });
  } else if (ch.format === "faq") {
    topics.push({ id: `btc_manual_ch${ch.num}`, domain: "bitcoin", title: ch.title });
    ch.faqs.forEach((faq, i) => {
      entries.push({
        id: `btcman.faq.${pad2(i + 1)}.${slugify(faq.question)}`,
        topicId: `btc_manual_ch${ch.num}`,
        title: faq.question,
        canonicalAnswer: faq.answer,
        // Same caveat as the payment-situations table above: FAQ chapter
        // ships English-only in the source manual.
        beginnerAnswer: faq.answer,
        safetyNotes: [],
      });
    });
  }
}

// ---- Bitcoin Basics: Appendix A glossary -> language_entries -------------

for (const g of bitcoinBasics.glossary) {
  languageEntries.push({
    utterance: g.sheng_explanation,
    intent: null,
    meaning: `${g.term}: ${g.meaning}`,
    sourceContext: "afribit_manual:bitcoin_basics_v1:glossary",
  });
}

// ---- Communication Skills: chapters 1-21 (standard) -----------------------

for (const ch of commSkills.chapters) {
  if (ch.format === "standard") {
    topics.push({ id: `comm_manual_ch${ch.num}`, domain: "communication", title: ch.title });
    const canonical = [
      ch.simple_english,
      ...ch.skill_breakdown,
      ch.conversation_practice.length
        ? `Example conversation:\n${ch.conversation_practice.join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    entries.push({
      id: `commman.ch${pad2(ch.num)}.${slugify(ch.title)}`,
      topicId: `comm_manual_ch${ch.num}`,
      title: ch.title,
      canonicalAnswer: canonical,
      beginnerAnswer: ch.sheng_teaching_version,
      safetyNotes: [...ch.common_mistakes, `AI guidance: ${ch.ai_teaching_guidance}`],
    });
    for (const p of ch.useful_phrases) {
      languageEntries.push({
        utterance: p.phrase,
        intent: `comm.ch${ch.num}.${slugify(ch.title)}`,
        meaning: p.meaning,
        sourceContext: `afribit_manual:communication_skills_v1:ch${ch.num}; tone=${p.tone}`,
      });
    }
  } else if (ch.format === "role_plays") {
    // Known fixed shape: four "Role Play <N> <Title>" blocks, each
    // "Goal: ..." then dialogue lines, ending at "Facilitator Debrief".
    const L = ch.raw_lines;
    const debriefIdx = L.findIndex((l) => l === "Facilitator Debrief");
    const body = L.slice(0, debriefIdx);
    const startIdxs = body
      .map((l, i) => (/^Role Play (One|Two|Three|Four) /.test(l) ? i : -1))
      .filter((i) => i >= 0);
    topics.push({ id: `comm_manual_ch${ch.num}`, domain: "communication", title: ch.title });
    startIdxs.forEach((start, i) => {
      const end = i + 1 < startIdxs.length ? startIdxs[i + 1] : body.length;
      const block = body.slice(start, end);
      const title = block[0] ?? `Role play ${i + 1}`;
      const goal = block[1]?.replace(/^Goal:\s*/, "") ?? "";
      const dialogue = block.slice(2);
      entries.push({
        id: `commman.ch${pad2(ch.num)}.roleplay${i + 1}.${slugify(title)}`,
        topicId: `comm_manual_ch${ch.num}`,
        title,
        canonicalAnswer: `Goal: ${goal}\n\n${dialogue.join("\n")}`,
        beginnerAnswer: dialogue.join("\n"),
        safetyNotes: [],
      });
    });
  }
  // ch23 (ai_operating_guide) and ch24 (assessment) are deliberately not
  // ingested as knowledge_entries -- ch23 feeds prompt/communicationStyleGuide.ts
  // instead (it's cross-cutting response-shaping guidance, not a
  // retrievable fact), and ch24 is assessment/rubric material out of
  // scope for RAG content.
}

// ---- Communication Skills: Appendix A phrase bank + Appendix B glossary --

for (const p of commSkills.phrase_bank) {
  languageEntries.push({
    utterance: p.phrase,
    intent: slugify(p.function),
    meaning: p.meaning,
    sourceContext: `afribit_manual:communication_skills_v1:phrase_bank; tone=${p.tone_note}`,
  });
}
for (const g of commSkills.glossary) {
  languageEntries.push({
    utterance: g.term,
    intent: null,
    meaning: g.meaning,
    sourceContext: `afribit_manual:communication_skills_v1:glossary; tone_context=${g.tone_and_context}`,
  });
}

// ---- write -----------------------------------------------------------

async function seed(): Promise<void> {
  for (const topic of topics) {
    await pool.query(
      `INSERT INTO knowledge_topics (id, domain, title) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [topic.id, topic.domain, topic.title],
    );
  }

  for (const entry of entries) {
    await pool.query(
      `INSERT INTO knowledge_entries (id, topic_id, title, canonical_answer, beginner_answer, safety_notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'needs_language_review')
       ON CONFLICT (id) DO UPDATE SET
         canonical_answer = EXCLUDED.canonical_answer,
         beginner_answer = EXCLUDED.beginner_answer,
         safety_notes = EXCLUDED.safety_notes,
         version = knowledge_entries.version + 1,
         updated_at = now()`,
      [entry.id, entry.topicId, entry.title, entry.canonicalAnswer, entry.beginnerAnswer, JSON.stringify(entry.safetyNotes)],
    );
  }

  // language_entries has no natural unique key to ON CONFLICT on, and this
  // script is meant to be safe to re-run -- guard each insert with
  // WHERE NOT EXISTS on (utterance, source_context), matching the
  // convention in db/seed/*.sql.
  for (const le of languageEntries) {
    await pool.query(
      `INSERT INTO language_entries
         (utterance, intent, meaning, style, source_context,
          status, freshness, corpus_layer, source, source_type,
          human_authored, synthetic, afribit_reviewed, quality_tier,
          allowed_for_rag, allowed_for_training, allowed_for_evaluation)
       SELECT $1, $2, $3, 'sheng', $4,
              'draft', 'context_specific', 'L2_community_collected', $5, 'afribit_authored',
              true, false, false, 'unrated',
              false, false, false
       WHERE NOT EXISTS (
         SELECT 1 FROM language_entries WHERE utterance = $1 AND source_context = $4
       )`,
      [
        le.utterance,
        le.intent,
        le.meaning,
        le.sourceContext,
        le.sourceContext.startsWith("afribit_manual:bitcoin_basics")
          ? "afribit_bitcoin_basics_manual_v1"
          : "afribit_communication_skills_manual_v1",
      ],
    );
  }

  console.log(`Seeded ${topics.length} topics, ${entries.length} knowledge_entries (status='needs_language_review'), ${languageEntries.length} language_entries (status='draft', allowed_for_rag=false).`);
  console.log(
    "Known gap: the Bitcoin Basics FAQ entries and the merchant/customer 'common payment situations' entry have beginner_answer identical to canonical_answer -- the source manual doesn't provide a Sheng version for those two sections. Needs a language-review pass before promotion.",
  );
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
