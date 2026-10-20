-- V16.7 additive social publishing delivery log.
-- Runtime schema initialization also creates this table automatically, so this
-- migration is optional when the project is deployed through the existing Pages flow.
CREATE TABLE IF NOT EXISTS social_publish_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  article_key TEXT NOT NULL,
  article_url TEXT NOT NULL DEFAULT '',
  external_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, article_key)
);
CREATE INDEX IF NOT EXISTS idx_social_publish_log_status
  ON social_publish_log(platform, status, updated_at);
