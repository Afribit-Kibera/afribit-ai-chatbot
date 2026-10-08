import { pool } from "../db/pool.js";
import { activeEmbeddingModel, embedDocuments } from "../providers/embeddings.js";

/**
 * Keep one card searchable: its single chunk (title + canonical answer, the same text the full-text
 * index and embedBackfill use) and that chunk's embedding for the active embedding model. Called when
 * a reviewer makes a card live, so the card is found at once instead of after an operator runs
 * `knowledge:embed`. Safe to repeat. If the card's words changed since it was last indexed, the old
 * vectors are dropped so a stale embedding can never describe new words.
 */
export async function indexEntry(id: string): Promise<{ embedded: boolean }> {
  const { rows } = await pool.query<{ title: string; canonical_answer: string }>(`SELECT title, canonical_answer FROM knowledge_entries WHERE id = $1`, [id]);
  const entry = rows[0];
  if (!entry) throw new Error(`No knowledge entry ${id}`);
  const text = `${entry.title}\n${entry.canonical_answer}`;

  const { rows: chunks } = await pool.query<{ id: string; chunk_text: string }>(`SELECT id, chunk_text FROM knowledge_chunks WHERE knowledge_id = $1 AND chunk_index = 0`, [id]);
  let chunkId: string;
  if (chunks[0]) {
    chunkId = chunks[0].id;
    if (chunks[0].chunk_text !== text) {
      await pool.query(`UPDATE knowledge_chunks SET chunk_text = $2 WHERE id = $1`, [chunkId, text]);
      await pool.query(`DELETE FROM knowledge_embeddings_v2 WHERE chunk_id = $1`, [chunkId]);
    }
  } else {
    const inserted = await pool.query<{ id: string }>(`INSERT INTO knowledge_chunks (knowledge_id, chunk_text, chunk_index) VALUES ($1, $2, 0) RETURNING id`, [id, text]);
    chunkId = inserted.rows[0]!.id;
  }

  const model = activeEmbeddingModel();
  const have = await pool.query(`SELECT 1 FROM knowledge_embeddings_v2 WHERE chunk_id = $1 AND embedding_model = $2`, [chunkId, model]);
  if (have.rowCount) return { embedded: true };

  const [vector] = await embedDocuments([text]);
  if (!vector) throw new Error("the embedding model returned nothing");
  await pool.query(
    `INSERT INTO knowledge_embeddings_v2 (chunk_id, embedding_model, dims, embedding) VALUES ($1, $2, $3, $4) ON CONFLICT (chunk_id, embedding_model) DO NOTHING`,
    [chunkId, model, vector.length, `[${vector.join(",")}]`],
  );
  return { embedded: true };
}
