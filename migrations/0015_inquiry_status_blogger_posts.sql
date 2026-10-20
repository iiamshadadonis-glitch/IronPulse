-- V15 additive inquiry workflow + direct Blogger publishing metadata.
-- Older production databases received this table from the runtime schema
-- bootstrap. A brand-new D1 database has no runtime bootstrap history yet, so
-- create the pre-V15 shape before applying the additive V15 columns below.
CREATE TABLE IF NOT EXISTS lead_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  submission_type TEXT NOT NULL DEFAULT 'contact',
  visitor_id TEXT,
  source_detail TEXT,
  message TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE CASCADE
);
ALTER TABLE lead_submissions ADD COLUMN status TEXT NOT NULL DEFAULT 'recorded';
ALTER TABLE lead_submissions ADD COLUMN resolved_at TEXT;
ALTER TABLE lead_submissions ADD COLUMN updated_at TEXT;
UPDATE lead_submissions SET status='in_progress', updated_at=COALESCE(updated_at,created_at,CURRENT_TIMESTAMP) WHERE submission_type='contact';
CREATE INDEX IF NOT EXISTS idx_lead_submissions_status ON lead_submissions(submission_type,status,created_at);
ALTER TABLE blog_posts ADD COLUMN blogger_post_id TEXT;
ALTER TABLE blog_posts ADD COLUMN blogger_post_url TEXT;
ALTER TABLE blog_posts ADD COLUMN blogger_updated_at TEXT;
CREATE INDEX IF NOT EXISTS idx_blog_posts_blogger_id ON blog_posts(blogger_post_id);
UPDATE service_requests SET status='in_progress', updated_at=CURRENT_TIMESTAMP WHERE lower(COALESCE(status,'new'))='new';
