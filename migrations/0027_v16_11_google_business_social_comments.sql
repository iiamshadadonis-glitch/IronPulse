CREATE TABLE IF NOT EXISTS social_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL DEFAULT '',
  external_comment_id TEXT NOT NULL DEFAULT '',
  external_post_id TEXT NOT NULL DEFAULT '',
  post_title TEXT NOT NULL DEFAULT '',
  post_url TEXT NOT NULL DEFAULT '',
  post_image TEXT NOT NULL DEFAULT '',
  commenter_id TEXT NOT NULL DEFAULT '',
  commenter_name TEXT NOT NULL DEFAULT '',
  commenter_username TEXT NOT NULL DEFAULT '',
  commenter_profile_url TEXT NOT NULL DEFAULT '',
  comment_text TEXT NOT NULL DEFAULT '',
  remote_created_at TEXT NOT NULL DEFAULT '',
  workflow_status TEXT NOT NULL DEFAULT 'new',
  remote_state TEXT NOT NULL DEFAULT '',
  is_spam INTEGER NOT NULL DEFAULT 0,
  private_message_sent_at TEXT NOT NULL DEFAULT '',
  raw_json TEXT NOT NULL DEFAULT '{}',
  last_synced_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, external_comment_id)
);
CREATE INDEX IF NOT EXISTS idx_social_comments_platform_status_date ON social_comments(platform,workflow_status,remote_created_at,created_at);
CREATE INDEX IF NOT EXISTS idx_social_comments_platform_post ON social_comments(platform,external_post_id);
