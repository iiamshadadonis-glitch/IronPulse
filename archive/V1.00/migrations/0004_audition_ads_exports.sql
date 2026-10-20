ALTER TABLE blog_posts ADD COLUMN ads_json TEXT;
ALTER TABLE blog_posts ADD COLUMN auto_ads_enabled INTEGER NOT NULL DEFAULT 1;
