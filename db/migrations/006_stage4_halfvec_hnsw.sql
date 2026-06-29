-- 006_stage4_halfvec_hnsw.sql
-- Stage 5.4: HALFVEC migration for the HNSW index.
--
-- Per docs/Database.md §3.2 (resolved via C-4 in the conflict report):
--   pgvector caps HNSW at 2000 dimensions for the `vector` type.
--   `halfvec` (half-precision, fp16) supports up to 4000 dims for HNSW.
--
-- This migration:
--   1. Adds `embedding_halfvec HALFVEC(3072)` alongside `embedding vector(3072)`
--   2. Backfills the halfvec column from the full-precision column
--   3. Creates the HNSW index on the halfvec column (cosine distance)
--   4. Drops the old embedding column (rolled into the halfvec one)
--   5. Renames the halfvec column to `embedding` (no app code change)

-- Step 1: add the halfvec column.
ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS embedding_halfvec HALFVEC(3072);

-- Step 2: backfill. Idempotent: only updates rows where the halfvec is NULL.
UPDATE articles
SET embedding_halfvec = embedding::halfvec(3072)
WHERE embedding_halfvec IS NULL;

-- Step 3: create the HNSW index. halfvec_cosine_ops is the cosine-distance
-- operator for halfvec.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'articles_embedding_hnsw_idx'
    ) THEN
        CREATE INDEX articles_embedding_hnsw_idx
            ON articles USING hnsw (embedding_halfvec halfvec_cosine_ops);
    END IF;
END$$;

-- Step 4: drop the old full-precision column.
-- This must run only if every row has been backfilled. The WHERE clause
-- is a safety check: if any NULL halfvec remains, the DROP is skipped.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM articles WHERE embedding_halfvec IS NULL) THEN
        ALTER TABLE articles DROP COLUMN embedding;
    END IF;
END$$;

-- Step 5: rename halfvec to embedding (preserves FK references and app code).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articles' AND column_name = 'embedding_halfvec'
    ) THEN
        ALTER TABLE articles RENAME COLUMN embedding_halfvec TO embedding;
    END IF;
END$$;