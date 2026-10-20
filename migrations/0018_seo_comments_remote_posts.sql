-- V15.4: website comments reference remote SEO/Blogger posts by string ID.
-- Audition post/article bodies are intentionally NOT copied into D1.
CREATE TABLE IF NOT EXISTS seo_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seo_post_id TEXT NOT NULL,
  post_slug TEXT NOT NULL,
  post_title TEXT NOT NULL DEFAULT '',
  post_image TEXT NOT NULL DEFAULT '',
  parent_comment_id INTEGER,
  lead_id INTEGER,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL DEFAULT '',
  comment_text TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  is_admin INTEGER NOT NULL DEFAULT 0,
  workflow_status TEXT NOT NULL DEFAULT 'new',
  visibility TEXT NOT NULL DEFAULT 'published',
  visitor_id TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(parent_comment_id) REFERENCES seo_comments(id) ON DELETE CASCADE,
  FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_seo_comments_post ON seo_comments(seo_post_id,visibility,created_at);
CREATE INDEX IF NOT EXISTS idx_seo_comments_workflow ON seo_comments(is_admin,workflow_status,created_at);
CREATE INDEX IF NOT EXISTS idx_seo_comments_lead ON seo_comments(lead_id,created_at);
