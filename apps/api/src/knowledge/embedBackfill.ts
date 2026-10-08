import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../db/pool.js";
import { activeEmbeddingModel, embedDocuments } from "../providers/embeddings.js";

/**
 * One-time/rerunnable backfill: ensures every approved/published
 * knowledge_entries row has exactly one knowledge_chunks row (title +
 * canonical_answer, matching what the lexical search in retrieval.ts
 * already indexes -- chunking isn't needed yet at this content size) and
 * that every chunk has an embedding from the ACTIVE embedding model
 * (knowledge_embeddings_v2: one row per chunk per model). Safe to rerun:
 * skips chunks that already have one. To switch embedding model, change
 * the setting and run this again.
 *
 * Run with: pnpm --filter @afribit/api exec tsx src/knowledge/embedBackfill.ts
 */

interface ConceptRow {
  id: string;
  title: string;
  canonical_answer: string;
}

export async function backfillEmbeddings(): Promise<{ chunksCreated: number; embeddingsCreated: number }> {
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
      `SELECT chunk_id FROM knowledge_embeddings_v2 WHERE chunk_id = $1 AND embedding_model = $2`,
      [chunkId, activeEmbeddingModel()],
    );
    if (hasEmbedding.length === 0) {
      pendingEmbeds.push({ chunkId, text: chunkText });
    }
  }

  console.log(`Chunks created: ${chunksCreated}. Embeddings needed: ${pendingEmbeds.length}.`);

  if (pendingEmbeds.length > 0) {
    console.log(`Embedding with ${activeEmbeddingModel()}...`);
    const vectors = await embedDocuments(pendingEmbeds.map((p) => p.text));
    for (let i = 0; i < pendingEmbeds.length; i++) {
      const { chunkId } = pendingEmbeds[i]!;
      const vector = vectors[i]!;
      await pool.query(
        `INSERT INTO knowledge_embeddings_v2 (chunk_id, embedding_model, dims, embedding) VALUES ($1, $2, $3, $4)
         ON CONFLICT (chunk_id, embedding_model) DO NOTHING`,
        [chunkId, activeEmbeddingModel(), vector.length, `[${vector.join(",")}]`],
      );
      embeddingsCreated++;
    }
  }

  console.log(`Done. Embeddings created: ${embeddingsCreated}.`);
  return { chunksCreated, embeddingsCreated };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  backfillEmbeddings()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error(err);
      await pool.end().catch(() => {});
      process.exit(1);
    });
}
