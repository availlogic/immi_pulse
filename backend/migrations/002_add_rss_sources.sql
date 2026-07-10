-- =============================================================
-- Migration: Add rss_sources table
-- =============================================================

CREATE TABLE rss_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index on is_active for faster lookup in n8n poll master
CREATE INDEX idx_rss_sources_is_active ON rss_sources (is_active) WHERE is_active = TRUE;

-- Insert a default Google Alerts RSS feed placeholder
INSERT INTO rss_sources (name, url, is_active)
VALUES ('Google Alerts', 'https://www.google.com/alerts/feeds/YOUR_GOOGLE_ALERTS_FEED_ID_1/YOUR_GOOGLE_ALERTS_FEED_ID_2', TRUE);
