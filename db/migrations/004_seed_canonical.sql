-- 004_seed_canonical.sql
-- Canonical 22+ jurisdictions per docs/PRD.md §11.1 and §20.

INSERT INTO jurisdictions (code, name, region, is_initial_seed) VALUES
    ('US', 'United States', 'North America', TRUE),
    ('CA', 'Canada', 'North America', TRUE),
    ('GB', 'United Kingdom', 'Europe', TRUE),
    ('AU', 'Australia', 'Oceania', TRUE),
    ('NZ', 'New Zealand', 'Oceania', TRUE),
    ('SG', 'Singapore', 'Asia', TRUE),
    ('DE', 'Germany', 'Europe', TRUE),
    ('FR', 'France', 'Europe', TRUE),
    ('ES', 'Spain', 'Europe', TRUE),
    ('PT', 'Portugal', 'Europe', TRUE),
    ('IE', 'Ireland', 'Europe', TRUE),
    ('JP', 'Japan', 'Asia', TRUE),
    ('KR', 'South Korea', 'Asia', TRUE),
    ('MY', 'Malaysia', 'Asia', TRUE),
    ('TH', 'Thailand', 'Asia', TRUE),
    ('PH', 'Philippines', 'Asia', TRUE),
    ('MX', 'Mexico', 'Latin America', TRUE),
    ('AE', 'UAE', 'Middle East', TRUE),
    ('TR', 'Turkey', 'Europe/Asia', TRUE),
    ('PC', 'Pacific/Caribbean Islands', 'Pacific/Caribbean', TRUE),
    ('HK', 'Hong Kong', 'Asia', TRUE),
    ('MO', 'Macau', 'Asia', TRUE),
    ('TW', 'Taiwan', 'Asia', TRUE),
    ('BR', 'Brazil', 'Latin America', TRUE)
ON CONFLICT (code) DO NOTHING;

-- One admin account (manual flip via DB only, per scope decision).
-- Password is "Admin1234!" hashed with bcrypt(10). Hash inserted via init script.
-- Default tier is admin to permit /admin/health access during development.
-- Note: In production this must be removed and re-seeded via secure bootstrap.
INSERT INTO users (id, email, password_hash, user_tier)
VALUES (
    'usr_admin_seed',
    'admin@immipulse.local',
    '$2b$10$YJqRrX3oH3gKqA7f0e0WUO4n0p6G9YJqRrX3oH3gKqA7f0e0WUO4n', -- placeholder
    'admin'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO user_preferences (user_id, preferred_jurisdictions, preferred_tags, digest_frequency)
VALUES ('usr_admin_seed', '{}', '{}', 'none')
ON CONFLICT (user_id) DO NOTHING;