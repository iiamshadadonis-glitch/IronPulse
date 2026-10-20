-- V16.48: Admin Website Content > Posts composer and scheduler.
CREATE TABLE IF NOT EXISTS social_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_type TEXT NOT NULL DEFAULT 'text',
  video_mode TEXT NOT NULL DEFAULT '',
  media_kind TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  first_comment_enabled INTEGER NOT NULL DEFAULT 0,
  first_comment_text TEXT NOT NULL DEFAULT '',
  media_url TEXT NOT NULL DEFAULT '',
  media_drive_file_id TEXT NOT NULL DEFAULT '',
  media_name TEXT NOT NULL DEFAULT '',
  media_mime TEXT NOT NULL DEFAULT '',
  scheduled_at TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  publish_summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS social_post_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT NOT NULL DEFAULT '',
  external_url TEXT NOT NULL DEFAULT '',
  error_text TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  published_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, platform),
  FOREIGN KEY(post_id) REFERENCES social_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_social_posts_schedule ON social_posts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_social_post_targets_post ON social_post_targets(post_id, status);
