-- 005_stage4_admin_review.sql
-- Stage 4.4: tagging_confidence FLOAT on articles
-- Stage 4.5: admin_review_queue table
--
-- Per docs/PRD §11.3:
--   "Admin Verification Queue: Route borderline classifications (classifier
--    confidence score < 0.85) to an internal admin queue for manual approval."

ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS tagging_confidence DOUBLE PRECISION;

ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS tagger_provider VARCHAR(50) NOT NULL DEFAULT 'keyword';

CREATE TABLE IF NOT EXISTS admin_review_queue (
    id VARCHAR(50) PRIMARY KEY,
    -- article_id is a logical reference, not a hard FK: the article is only
    -- inserted when an admin approves the review row.
    article_id VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    proposed_tags VARCHAR(50)[] NOT NULL DEFAULT '{}',
    proposed_jurisdiction VARCHAR(50),
    confidence DOUBLE PRECISION NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    decided_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    decided_at TIMESTAMP WITH TIME ZONE,
    decision_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admin_review_status_check
        CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT admin_review_confidence_range
        CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_admin_review_status ON admin_review_queue(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_review_article ON admin_review_queue(article_id);