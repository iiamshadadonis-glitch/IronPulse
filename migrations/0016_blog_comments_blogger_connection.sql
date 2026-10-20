-- V15.1 additive Blogger connection diagnostics, sync support and local article comments.
CREATE TABLE IF NOT EXISTS blog_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  source TEXT NOT NULL DEFAULT 'name',
  visitor_id TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_status ON blog_comments(post_id,status,created_at);
