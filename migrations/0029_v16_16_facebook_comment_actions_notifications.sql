ALTER TABLE social_comments ADD COLUMN admin_reply_mode TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_social_comments_visibility ON social_comments(platform,remote_hidden,is_spam,remote_deleted,workflow_status);
