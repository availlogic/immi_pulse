-- 002_tables.sql
-- Schema per docs/Database.md with one structural extension:
-- A canonical `jurisdictions` lookup table is added to resolve the documented
-- code-vs-full-name inconsistency (Database.md §2.3 vs §2.4).
-- Articles store `origin_jurisdiction` as the canonical code;
-- User alerts store `target_jurisdiction` as the full name and resolve
-- to the code via the lookup table.

CREATE TABLE IF NOT EXISTS jurisdictions (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    region VARCHAR(50) NOT NULL,
    is_initial_seed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_tier VARCHAR(20) NOT NULL DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_tier_check CHECK (user_tier IN ('basic', 'premium', 'admin'))
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_jurisdictions VARCHAR(10)[] DEFAULT '{}',
    preferred_tags VARCHAR(50)[] DEFAULT '{}',
    digest_frequency VARCHAR(20) DEFAULT 'none',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_prefs_freq_check CHECK (digest_frequency IN ('none', 'daily', 'weekly'))
);

CREATE TABLE IF NOT EXISTS user_alerts (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_jurisdiction VARCHAR(100) NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS articles (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    raw_content TEXT NOT NULL,
    summary TEXT NOT NULL,
    publication_date TIMESTAMP WITH TIME ZONE NOT NULL,
    source_url TEXT NOT NULL,
    origin_jurisdiction VARCHAR(50) NOT NULL,
    publisher_authority INTEGER DEFAULT 3,
    embedding VECTOR(3072) NOT NULL,
    tags VARCHAR(50)[] DEFAULT '{}',
    is_analysis BOOLEAN DEFAULT FALSE,
    parent_article_id VARCHAR(50) REFERENCES articles(id) ON DELETE SET NULL,
    alternative_sources TEXT[] DEFAULT '{}',
    -- Stage 4.4: LLM tagger confidence (0.0–1.0). NULL when tagger_provider is
    -- 'keyword' (deterministic heuristic) or unset.
    tagging_confidence DOUBLE PRECISION,
    tagger_provider VARCHAR(50) NOT NULL DEFAULT 'keyword',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT articles_authority_check CHECK (publisher_authority BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS scraper_logs (
    id SERIAL PRIMARY KEY,
    scraper_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    items_scraped INTEGER DEFAULT 0,
    execution_time_seconds DOUBLE PRECISION,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT scraper_logs_status_check CHECK (status IN ('success', 'failure'))
);