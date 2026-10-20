-- V15.6 admin-only D1 index for Auditions.
-- Blogger/SEO remains the source of truth for publishing, editing and public articles.
CREATE TABLE IF NOT EXISTS audition_post_cache (
  blog_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  remote_status TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  updated_at_remote TEXT NOT NULL DEFAULT '',
  published_at_remote TEXT NOT NULL DEFAULT '',
  row_json TEXT NOT NULL DEFAULT '{}',
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(blog_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_audition_post_cache_status ON audition_post_cache(blog_id,status,updated_at_remote);
CREATE INDEX IF NOT EXISTS idx_audition_post_cache_updated ON audition_post_cache(blog_id,updated_at_remote);

CREATE TABLE IF NOT EXISTS audition_sync_state (
  blog_id TEXT PRIMARY KEY,
  blog_name TEXT NOT NULL DEFAULT '',
  initial_sync_complete INTEGER NOT NULL DEFAULT 0,
  live_complete INTEGER NOT NULL DEFAULT 0,
  draft_complete INTEGER NOT NULL DEFAULT 0,
  live_page_token TEXT NOT NULL DEFAULT '',
  draft_page_token TEXT NOT NULL DEFAULT '',
  last_remote_updated_at TEXT NOT NULL DEFAULT '',
  last_synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cached_count INTEGER NOT NULL DEFAULT 0
);
