# ImmiPulse - Database Schema Design

## 1. Overview
ImmiPulse uses a **PostgreSQL** relational database running in a Docker Compose container. To support semantic deduplication and similarity searches, the database is equipped with the **`pgvector`** extension, which stores high-dimensional dense vector embeddings.

---

## 2. Table Definitions

### 2.1 `users` Table
Stores authentication and subscription tier details.
```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY, -- Prefix format 'usr_' (e.g. usr_9a8b7c6d)
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_tier VARCHAR(20) NOT NULL DEFAULT 'basic', -- 'basic', 'premium', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 `user_preferences` Table
Stores user dashboard customization rules.
```sql
CREATE TABLE user_preferences (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_jurisdictions VARCHAR(10)[] DEFAULT '{}', -- Array of jurisdiction codes (e.g., {"US", "CA"})
    preferred_tags VARCHAR(50)[] DEFAULT '{}', -- Array of feature tags
    digest_frequency VARCHAR(20) DEFAULT 'none', -- 'none', 'daily', 'weekly'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 `user_alerts` Table
Stores custom keyword alarms registered by Premium users.
```sql
CREATE TABLE user_alerts (
    id VARCHAR(50) PRIMARY KEY, -- Prefix format 'alt_'
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_jurisdiction VARCHAR(100) NOT NULL, -- Target jurisdiction name or code
    keyword VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4 `articles` Table
Stores raw and enriched news articles. Embedding field uses `VECTOR(3072)` to store dense vector representations (e.g. OpenAI `text-embedding-3-large`).
```sql
CREATE TABLE articles (
    id VARCHAR(50) PRIMARY KEY, -- Prefix format 'art_'
    title VARCHAR(500) NOT NULL,
    raw_content TEXT NOT NULL,
    summary TEXT NOT NULL,
    publication_date TIMESTAMP WITH TIME ZONE NOT NULL, -- Authoritative publication date/发布时间 (used for TTL calculations)
    source_url TEXT NOT NULL,
    origin_jurisdiction VARCHAR(50) NOT NULL, -- Jurisdiction code (e.g. 'US', 'CA', 'DE')
    publisher_authority INTEGER DEFAULT 3, -- 1 (Low) to 5 (Government Official)
    embedding VECTOR(3072) NOT NULL, -- pgvector field for dense representation
    tags VARCHAR(50)[] DEFAULT '{}', -- Classification tags (e.g. {"Education", "Retirement"})
    is_analysis BOOLEAN DEFAULT FALSE, -- True if this represents derivative commentary
    parent_article_id VARCHAR(50) REFERENCES articles(id) ON DELETE SET NULL, -- References original announcement if is_analysis is True
    alternative_sources TEXT[] DEFAULT '{}', -- List of identical coverage links merged into this event
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.5 `scraper_logs` Table
Tracks ingestion health status for internal monitoring.
```sql
CREATE TABLE scraper_logs (
    id SERIAL PRIMARY KEY,
    scraper_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'success', 'failure'
    error_message TEXT,
    items_scraped INTEGER DEFAULT 0,
    execution_time_seconds DOUBLE PRECISION,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Indexes & Operations

### 3.1 Cosine Similarity Search
To find semantic duplicates in the past 1-2 months (TTL window), the ingestion engine executes a cosine similarity vector search:
```sql
SELECT id, title, publication_date, (embedding <=> $1) AS cosine_distance
FROM articles
WHERE publication_date >= NOW() - INTERVAL '60 days' -- Configurable TTL window filter
ORDER BY cosine_distance ASC
LIMIT 5;
```
*(Note: `<=>` is the pgvector operator for Cosine Distance, where `Distance = 1 - Cosine Similarity`).*

### 3.2 Vector Indexing
An HNSW (Hierarchical Navigable Small World) index is created on the `embedding` column to ensure sub-second vector queries:
```sql
CREATE INDEX articles_embedding_hnsw_idx ON articles 
USING hnsw (embedding vector_cosine_ops);
```

### 3.3 Relational Indexes
```sql
-- Fast preference lookups during feed fetching
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- Alert notifications scanning on insertions
CREATE INDEX idx_user_alerts_user ON user_alerts(user_id);

-- Fast feed sorting and TTL deletion indexing
CREATE INDEX idx_articles_pub_date ON articles(publication_date DESC);
CREATE INDEX idx_articles_jurisdiction ON articles(origin_jurisdiction);
```

---

## 4. TTL Garbage Collection
A daily cron job cleans up articles older than the configured TTL (e.g. 60 days):
```sql
DELETE FROM articles 
WHERE publication_date < NOW() - INTERVAL '60 days';
```
*(Note: CASCADE deletes on any child records or linked records should be managed to prevent database inconsistency).*
