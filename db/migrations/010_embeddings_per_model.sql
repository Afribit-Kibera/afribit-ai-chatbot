-- Embeddings per model, with any dimension.
--
-- knowledge_embeddings (001) fixed one vector length (1536, OpenAI's
-- text-embedding-3-small) and one embedding per chunk, so changing the embedding
-- model meant rewriting the table. A community node cannot call a hosted API for
-- embeddings and runs a local model with a different dimension (bge-m3 is 1024),
-- and our own benchmark found bge-m3 finds the right card more often than the
-- OpenAI model (docs/evaluation/methodology.md). So embeddings now live per model.
--
-- `vector` without a dimension stores any length; every query filters on
-- embedding_model first, so only same-length vectors are ever compared. There is
-- deliberately no ANN index: at a few hundred cards an exact scan is instant, and
-- an index can be added per model (an expression index on embedding::vector(N)) if
-- the corpus ever grows into the tens of thousands.
--
-- The old table is left in place, unused and no longer written, so this migration
-- is reversible and a deploy that predates it still works.

CREATE TABLE IF NOT EXISTS knowledge_embeddings_v2 (
  chunk_id UUID NOT NULL REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
  embedding_model TEXT NOT NULL,
  dims INTEGER NOT NULL,
  embedding vector NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chunk_id, embedding_model),
  CONSTRAINT knowledge_embeddings_v2_dims_match CHECK (vector_dims(embedding) = dims)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_v2_model ON knowledge_embeddings_v2 (embedding_model);

-- Carry every existing embedding across, so a deployment keeps working with its current
-- model the moment this migration runs.
INSERT INTO knowledge_embeddings_v2 (chunk_id, embedding_model, dims, embedding)
SELECT chunk_id, embedding_model, vector_dims(embedding), embedding
FROM knowledge_embeddings
WHERE embedding IS NOT NULL
ON CONFLICT (chunk_id, embedding_model) DO NOTHING;
