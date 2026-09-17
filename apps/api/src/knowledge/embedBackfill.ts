import { pool } from "../db/pool.js";
import { embedTexts } from "../providers/openRouterEmbeddings.js";
import { env } from "../config/env.js";

/**
 * One-time/rerunnable backfill: ensures every approved/published
 * knowledge_entries row has exactly one knowledge_chunks row (title +
 * canonical_answer, matching what the lexical search in retrieval.ts
 * already indexes -- chunking isn't needed yet at this content size) and
 * that every chunk has a knowledge_embeddings row. Safe to rerun: skips
 * chunks/embeddings that already exist rather than duplicating them.
 *
 * Run with: pnpm --filter @afribit/api exec tsx src/knowledge/embedBackfill.ts
 */

interface ConceptRow {
  id: string;
  title: string;
  canonical_answer: string;
}

async function main() {
  const { rows: concepts } = await pool.query<ConceptRow>(
    `SELECT id, title, canonical_answer FROM knowledge_entries WHERE status IN ('approved', 'published') ORDER BY id`,
  );
  console.log(`${concepts.length} approved/published knowledge_entries found.`);

  let chunksCreated = 0;
  let embeddingsCreated = 0;
  const pendingEmbeds: { chunkId: string; text: string }[] = [];

  for (const concept of concepts) {
    const chunkText = `${concept.title}\n${concept.canonical_answer}`;

    const { rows: existing } = await pool.query<{ id: string }>(
      `SELECT kc.id FROM knowledge_chunks kc
       LEFT JOIN knowledge_embeddings ke ON ke.chunk_id = kc.id
       WHERE kc.knowledge_id = $1 AND kc.chunk_index = 0`,
      [concept.id],
    );

    let chunkId: string;
    if (existing[0]) {
      chunkId = existing[0].id;
    } else {
      const { rows: inserted } = await pool.query<{ id: string }>(
        `INSERT INTO knowledge_chunks (knowledge_id, chunk_text, chunk_index) VALUES ($1, $2, 0) RETURNING id`,
        [concept.id, chunkText],
      );
      chunkId = inserted[0]!.id;
      chunksCreated++;
    }

    const { rows: hasEmbedding } = await pool.query<{ chunk_id: string }>(
      `SELECT chunk_id FROM knowledge_embeddings WHERE chunk_id = $1`,
      [chunkId],
    );
    if (hasEmbedding.length === 0) {
      pendingEmbeds.push({ chunkId, text: chunkText });
    }
  }

  console.log(`Chunks created: ${chunksCreated}. Embeddings needed: ${pendingEmbeds.length}.`);

  // OpenAI-shaped /embeddings accepts a batch `input` array -- one request
  // for everything pending rather than one per chunk (this corpus is small
  // enough that batch size limits don't matter yet).
  if (pendingEmbeds.length > 0) {
    const vectors = await embedTexts(pendingEmbeds.map((p) => p.text));
    for (let i = 0; i < pendingEmbeds.length; i++) {
      const { chunkId } = pendingEmbeds[i]!;
      const vector = vectors[i]!;
      await pool.query(
        `INSERT INTO knowledge_embeddings (chunk_id, embedding, embedding_model) VALUES ($1, $2, $3)
         ON CONFLICT (chunk_id) DO NOTHING`,
        [chunkId, `[${vector.join(",")}]`, env.embeddingModel],
      );
      embeddingsCreated++;
    }
  }

  console.log(`Done. Embeddings created: ${embeddingsCreated}.`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
