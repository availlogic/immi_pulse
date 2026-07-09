-- =============================================================
-- ImmiPulse Initial Schema Migration
-- Matches: docs/Database.md
-- =============================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tables
-- 2.1 news_items: ingested article metadata, translations, scores, vectors
CREATE TABLE news_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Titles (Translations Matrix)
    title_original TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_zh TEXT NOT NULL,

    -- Summaries (Translations Matrix)
    summary_original TEXT NOT NULL,
    summary_en TEXT NOT NULL,
    summary_zh TEXT NOT NULL,

    -- Source and Metadata
    original_language VARCHAR(10) NOT NULL,
    source_name VARCHAR(100) NOT NULL,
    source_url TEXT NOT NULL UNIQUE,
    published_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Classification Tags (Arrays)
    country_tags VARCHAR(50)[] NOT NULL DEFAULT '{}',
    topic_tags VARCHAR(50)[] NOT NULL DEFAULT '{}',
    audience_tags VARCHAR(50)[] NOT NULL DEFAULT '{}',

    -- Multi-Dimensional Grading Scores (0 - 100)
    importance_score INTEGER NOT NULL CHECK (importance_score BETWEEN 0 AND 100),
    video_score INTEGER NOT NULL CHECK (video_score BETWEEN 0 AND 100),
    chinese_relevance_score INTEGER NOT NULL CHECK (chinese_relevance_score BETWEEN 0 AND 100),
    evergreen_score INTEGER NOT NULL CHECK (evergreen_score BETWEEN 0 AND 100),

    -- Duplicate Group (Self-Referencing ForeignKey)
    parent_id UUID REFERENCES news_items(id) ON DELETE SET NULL,

    -- AI Generated Insights
    keywords TEXT[] NOT NULL DEFAULT '{}',
    ai_analysis TEXT,
    official_source BOOLEAN NOT NULL DEFAULT FALSE,
    youtube_suggestions JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Vector Embeddings for level 2 de-duplication (384 dimensions for all-MiniLM-L6-v2)
    title_vector VECTOR(384),

    -- Version Audit
    workflow_version VARCHAR(20) NOT NULL DEFAULT '1.0.0'
);

-- 2.2 candidates: starred news items with creator notes
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_item_id UUID NOT NULL UNIQUE REFERENCES news_items(id) ON DELETE CASCADE,
    starred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    custom_title VARCHAR(200),
    custom_outline TEXT,
    notes TEXT
);

-- 3. Indexes

-- 3.1 B-tree index for filtering out duplicate reports in the main feed
CREATE INDEX idx_news_items_parent_id ON news_items (parent_id) WHERE parent_id IS NULL;

-- 3.2 B-tree index for sorting results by publication date and score rankings
CREATE INDEX idx_news_items_published_at ON news_items (published_at DESC);
CREATE INDEX idx_news_items_scores ON news_items (video_score DESC, chinese_relevance_score DESC);

-- 3.3 GIN index for tag arrays matching fast dashboard multi-select filters
CREATE INDEX idx_news_items_country_tags ON news_items USING GIN (country_tags);
CREATE INDEX idx_news_items_topic_tags ON news_items USING GIN (topic_tags);
CREATE INDEX idx_news_items_audience_tags ON news_items USING GIN (audience_tags);

-- 3.4 HNSW Vector Cosine Similarity index for Level 2 semantic duplicate checks
CREATE INDEX idx_news_items_title_vector ON news_items USING hnsw (title_vector vector_cosine_ops);

-- 4. Data Retention Purge Function
-- Deletes news items older than the configured retention period,
-- preserving starred candidates and parent items of starred children.
CREATE OR REPLACE FUNCTION purge_expired_news(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM news_items
    WHERE published_at < NOW() - (retention_days || ' days')::INTERVAL
      -- Exclude starred news items
      AND id NOT IN (
          SELECT news_item_id
          FROM candidates
      )
      -- Exclude parent items whose children are candidates
      AND id NOT IN (
          SELECT DISTINCT parent_id
          FROM news_items
          WHERE parent_id IS NOT NULL
            AND id IN (SELECT news_item_id FROM candidates)
      );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
