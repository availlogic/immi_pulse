-- 003_indexes.sql

-- HNSW on 3072-dim VECTOR is not directly supported by pgvector as of 0.8.0
-- (max 2000 dims). For datasets bounded by the 60-day TTL window, sequential
-- scan + the ivfflat-friendly per-jurisdiction filter provides sub-second
-- similarity search in practice. Production deployments requiring HNSW at
-- this dimension should migrate the column to HALFVEC(3072) — see the
-- Deployment Report and Documentation_Conflict_Report.md (C-3 note).

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_user ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_lookup ON user_alerts(target_jurisdiction, keyword);
CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(publication_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_jurisdiction ON articles(origin_jurisdiction);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_executed_at ON scraper_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_name ON scraper_logs(scraper_name, executed_at DESC);